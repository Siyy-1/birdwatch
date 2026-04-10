-- Migration: users 테이블 생성
-- Date: 2026-04-04
-- Description: BirdWatch 사용자 및 동의 상태 관리 테이블

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
    gps_consent         BOOLEAN       NOT NULL DEFAULT FALSE,
    gps_consent_at      TIMESTAMPTZ   NULL,
    terms_agreed_at     TIMESTAMPTZ   NOT NULL,
    privacy_agreed_at   TIMESTAMPTZ   NOT NULL,
    marketing_agreed_at TIMESTAMPTZ   NULL,

    -- 게임 상태
    total_points        INTEGER       NOT NULL DEFAULT 0,
    streak_days         INTEGER       NOT NULL DEFAULT 0,
    last_sighting_at    TIMESTAMPTZ   NULL,
    species_count       INTEGER       NOT NULL DEFAULT 0,

    -- 구독
    subscription_tier   VARCHAR(20)   NOT NULL DEFAULT 'free'
                        CHECK (subscription_tier IN ('free', 'premium')),
    subscription_expires_at TIMESTAMPTZ NULL,

    -- 메타
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ   NULL,

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
