# DB Phase 2 스펙 — users, sightings 테이블 + obscure_coordinate 함수

## 목적
BirdWatch 핵심 비즈니스 테이블과 좌표 난독화 PostGIS 함수를 생성한다.

## 참조 파일
- `db/migrations/20260404_000001_create_species_table.sql` — 스키마 스타일 참조
- `db/migrations/20260404_000002_seed_species_batch1.sql` — migration 파일 형식 참조

## 출력 파일 (4개)

| 번호 | 파일 | 내용 |
|------|------|------|
| 1 | `db/migrations/20260404_000007_create_users_table.sql` | users 테이블 |
| 2 | `db/migrations/20260404_000008_create_sightings_table.sql` | sightings 테이블 |
| 3 | `db/functions/obscure_coordinate.sql` | PostGIS 좌표 난독화 함수 |
| 4 | `db/migrations/20260404_000009_seed_species_remaining4.sql` | 미완성 4종 (KR-157~160) |

---

## 파일 1: users 테이블

```sql
-- Migration: users 테이블 생성
-- Date: 2026-04-04
-- Depends: (없음)

-- UP
BEGIN;

CREATE TABLE users (
    user_id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub         VARCHAR(100)  NOT NULL UNIQUE,  -- AWS Cognito sub claim

    -- 프로필
    nickname            VARCHAR(50)   NOT NULL,
    profile_image_key   VARCHAR(500)  NULL,             -- S3 key

    -- OAuth 연동
    oauth_provider      VARCHAR(20)   NOT NULL          -- 'kakao' | 'apple' | 'google'
                        CHECK (oauth_provider IN ('kakao', 'apple', 'google')),
    oauth_sub           VARCHAR(200)  NOT NULL,

    -- PIPA 동의 (개인정보보호법)
    -- 개인정보: 탈퇴 후 30일 이내 파기 (PIPA 제21조)
    gps_consent         BOOLEAN       NOT NULL DEFAULT FALSE,
    gps_consent_at      TIMESTAMPTZ   NULL,
    terms_agreed_at     TIMESTAMPTZ   NOT NULL,
    privacy_agreed_at   TIMESTAMPTZ   NOT NULL,
    marketing_agreed_at TIMESTAMPTZ   NULL,             -- 선택 동의

    -- 게임 상태
    total_points        INTEGER       NOT NULL DEFAULT 0,
    streak_days         INTEGER       NOT NULL DEFAULT 0,
    last_sighting_at    TIMESTAMPTZ   NULL,
    species_count       INTEGER       NOT NULL DEFAULT 0, -- 수집한 종 수

    -- 구독 (프리미엄)
    subscription_tier   VARCHAR(20)   NOT NULL DEFAULT 'free'
                        CHECK (subscription_tier IN ('free', 'premium')),
    subscription_expires_at TIMESTAMPTZ NULL,

    -- 메타
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ   NULL,             -- 소프트 삭제 (탈퇴)

    -- 제약
    CONSTRAINT users_gps_consent_at_required CHECK (
        gps_consent = FALSE OR gps_consent_at IS NOT NULL
    ),
    CONSTRAINT users_subscription_expires CHECK (
        subscription_tier = 'free' OR subscription_expires_at IS NOT NULL
    ),
    UNIQUE (oauth_provider, oauth_sub)
);

-- 인덱스
CREATE INDEX users_cognito_sub_idx ON users (cognito_sub);
CREATE INDEX users_deleted_at_idx ON users (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX users_total_points_idx ON users (total_points DESC) WHERE deleted_at IS NULL;
CREATE INDEX users_subscription_tier_idx ON users (subscription_tier) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'BirdWatch 사용자. PIPA: deleted_at 설정 후 30일 이내 모든 개인정보 파기.';
COMMENT ON COLUMN users.gps_consent IS 'PIPA 제15조 GPS 위치정보 수집 동의. FALSE면 사진 로그에 위치 저장 불가.';
COMMENT ON COLUMN users.deleted_at IS 'PIPA: 탈퇴 시각. 30일 후 배치 잡이 PII 컬럼 NULL 처리.';

COMMIT;

-- DOWN
BEGIN;
DROP TABLE IF EXISTS users CASCADE;
COMMIT;
```

---

## 파일 2: sightings 테이블

### 설계 원칙
- `location`: PostGIS `geography(Point, 4326)` — geometry 아님
- EXIF 제거 확인 컬럼 필수 (PIPA)
- 소프트 삭제 (`deleted_at`)
- AI 식별 결과 JSON 저장
- 좌표는 저장 시 원본 그대로, 응답 시 `obscure_coordinate()` 적용

```sql
-- Migration: sightings 테이블 생성
-- Date: 2026-04-04
-- Depends: 20260404_000001_create_species_table.sql, 20260404_000007_create_users_table.sql

-- UP
BEGIN;

CREATE TABLE sightings (
    sighting_id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    species_id          VARCHAR(10)   NOT NULL REFERENCES species(species_id),

    -- 위치 (GPS)
    -- 개인정보: GPS 동의 사용자만 저장. 응답 시 obscure_coordinate() 적용
    location            geography(Point, 4326) NOT NULL,
    location_accuracy_m INTEGER       NULL,             -- GPS 정확도 (m)
    altitude_m          NUMERIC(7,1)  NULL,

    -- 사진
    photo_s3_key        VARCHAR(500)  NOT NULL,         -- S3 원본 키
    photo_cdn_url       VARCHAR(500)  NULL,             -- CloudFront URL (캐시)
    thumbnail_s3_key    VARCHAR(500)  NULL,             -- 썸네일 (리사이즈)
    exif_stripped       BOOLEAN       NOT NULL DEFAULT FALSE, -- PIPA: EXIF 제거 확인

    -- AI 식별 결과
    ai_species_id       VARCHAR(10)   NULL REFERENCES species(species_id),
    ai_confidence       NUMERIC(5,4)  NULL              -- 0.0000~1.0000
                        CHECK (ai_confidence IS NULL OR ai_confidence BETWEEN 0 AND 1),
    ai_top3             JSONB         NULL,             -- [{"species_id":"KR-142","confidence":0.91},...]
    ai_model_version    VARCHAR(20)   NULL,             -- "v2.1.0"
    ai_inference_ms     INTEGER       NULL,             -- 추론 시간 (ms)

    -- 검증 상태
    is_ai_confirmed     BOOLEAN       NOT NULL DEFAULT FALSE, -- confidence >= 0.85
    is_manually_verified BOOLEAN      NOT NULL DEFAULT FALSE, -- 전문가 검증

    -- 게임
    points_earned       INTEGER       NOT NULL DEFAULT 0,
    is_first_for_user   BOOLEAN       NOT NULL DEFAULT FALSE, -- 이 유저의 이 종 첫 목격

    -- 메타
    observed_at         TIMESTAMPTZ   NOT NULL,         -- 실제 관찰 시각
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ   NULL,             -- 소프트 삭제

    -- 제약
    CONSTRAINT sightings_points_nonnegative CHECK (points_earned >= 0),
    CONSTRAINT sightings_ai_confidence_requires_species CHECK (
        ai_confidence IS NULL OR ai_species_id IS NOT NULL
    )
);

-- 인덱스
CREATE INDEX sightings_user_id_idx ON sightings (user_id) WHERE deleted_at IS NULL;
CREATE INDEX sightings_species_id_idx ON sightings (species_id) WHERE deleted_at IS NULL;
CREATE INDEX sightings_observed_at_idx ON sightings (observed_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX sightings_location_gist ON sightings USING GIST (location);
CREATE INDEX sightings_user_species_idx ON sightings (user_id, species_id) WHERE deleted_at IS NULL;

-- 복합 인덱스: 유저별 종 첫 목격 조회
CREATE UNIQUE INDEX sightings_user_first_species_idx
  ON sightings (user_id, species_id)
  WHERE deleted_at IS NULL AND is_first_for_user = TRUE;

COMMENT ON TABLE sightings IS 'BirdWatch 조류 목격 기록. PIPA: location은 응답 시 obscure_coordinate() 필수 적용.';
COMMENT ON COLUMN sightings.location IS 'WGS84 원본 좌표. API 응답 시 반드시 obscure_coordinate(location, species.sensitivity_tier, is_owner)로 난독화.';
COMMENT ON COLUMN sightings.exif_stripped IS 'PIPA 준수: S3 업로드 전 Lambda@Edge에서 EXIF 제거 완료 여부.';

COMMIT;

-- DOWN
BEGIN;
DROP TABLE IF EXISTS sightings CASCADE;
COMMIT;
```

---

## 파일 3: obscure_coordinate 함수

### 좌표 난독화 규칙
| sensitivity_tier | 대상 | 격자 크기 | 실제 면적 |
|-----------------|------|-----------|-----------|
| 1 | 천연기념물 | 0.5° × 0.5° | ~3,000km² |
| 2 | 멸종위기 | 0.05° × 0.05° | ~30km² |
| 3 | 일반 | 원본 | — |

is_owner=TRUE면 본인 목격 좌표는 원본 반환.

```sql
-- Function: obscure_coordinate
-- 목적: 민감종 좌표 난독화 (PIPA + 생태 보호)
-- 위치: db/functions/obscure_coordinate.sql
-- 적용: 모든 sightings API 응답에서 호출 필수

CREATE OR REPLACE FUNCTION obscure_coordinate(
    coord          geography(Point, 4326),
    sensitivity_tier INT,
    is_owner       BOOLEAN
) RETURNS geography(Point, 4326) AS $$
BEGIN
    -- 본인 목격이면 원본 반환
    IF is_owner THEN
        RETURN coord;
    END IF;

    -- 일반종 (tier 3)
    IF sensitivity_tier = 3 THEN
        RETURN coord;
    END IF;

    -- 천연기념물 (tier 1): 0.5도 격자 (약 3,000km²)
    IF sensitivity_tier = 1 THEN
        RETURN ST_SnapToGrid(coord::geometry, 0.5)::geography;
    END IF;

    -- 멸종위기 (tier 2): 0.05도 격자 (약 30km²)
    RETURN ST_SnapToGrid(coord::geometry, 0.05)::geography;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT
   COST 1;

COMMENT ON FUNCTION obscure_coordinate IS
    'BirdWatch 좌표 난독화. is_owner=TRUE면 원본, tier1=0.5도 격자, tier2=0.05도 격자, tier3=원본.
     모든 sightings 응답(본인 제외)에서 반드시 적용. PIPA + 생태 보호 목적.';
```

---

## 파일 4: 미완성 4종 (KR-157~160)

Batch 2가 56종 (KR-101~156)으로 4종 미완성. 아래 4종 추가하여 총 300종 완성.

이미 배정된 수조류 카테고리에 맞게 KR-157~160 배정:

| ID | 한국명 | 학명 | 희귀도 | 비고 |
|----|--------|------|--------|------|
| KR-157 | 흰눈썹오리 | Histrionicus histrionicus | common | 하를레킨오리, 겨울 해안 |
| KR-158 | 댕기쇠오리 | Netta rufina | migrant | Red-crested Pochard, 겨울 드문 방문 |
| KR-159 | 흰뺨오리사촌 | Bucephala albeola | common | Bufflehead, 희귀 겨울 미조 |
| KR-160 | 쇠흰뺨오리 | Bucephala islandica | common | Barrow's Goldeneye, 희귀 미조 |

seasonal_presence 형식: `{"jan":true/false,...,"dec":true/false}` 12키 필수.
점수 규칙: common=1, migrant=3, legendary=25.
DOWN: `DELETE FROM species WHERE species_id IN ('KR-157','KR-158','KR-159','KR-160');`
