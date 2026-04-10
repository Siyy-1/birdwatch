---
name: birdwatch-db-migration
description: "BirdWatch PostgreSQL+PostGIS DB 스키마 변경, 마이그레이션 스크립트 작성, 인덱스 추가, PostGIS 공간 함수 추가를 수행한다. Claude가 스펙을 작성하고 Codex가 SQL을 생성하는 분업 패턴을 사용한다. DB 구조 변경, 컬럼 추가/삭제, 인덱스 생성, 마이그레이션 작성 요청 시 반드시 이 스킬을 사용할 것. '/birdwatch-db-migration', 'DB 마이그레이션', '스키마 변경', '컬럼 추가'로 시작하는 요청에 사용한다."
---

# BirdWatch DB Migration — Claude 스펙 + Codex SQL 생성

BirdWatch의 PostgreSQL 15 + PostGIS 3.4 마이그레이션을 **Claude가 스펙 작성 → Codex가 SQL 구현 → Claude가 검증**하는 패턴으로 작성하는 스킬.

## 실행 패턴

단순 마이그레이션 (컬럼 1-2개): Claude가 직접 작성 (토큰 절약 이득 없음)
복잡한 마이그레이션 (PostGIS 함수, 복수 테이블, SEED 데이터): Codex에게 위임

### Codex 위임 조건

| 케이스 | 담당 |
|-------|------|
| 컬럼 1-2개 추가 | Claude 직접 |
| PostGIS 공간 함수 작성 | Codex |
| 복수 테이블 동시 변경 | Codex |
| 300종 SEED INSERT 생성 | Codex (필수, 극도로 반복적) |
| 마이그레이션 + 백필 로직 | Codex |

### Codex 위임 호출 예시 (SEED 데이터)

```
Agent(
  subagent_type: "codex:codex-rescue",
  run_in_background: true,
  prompt: """
<task>
아래 스펙을 읽고 species 테이블의 SEED 마이그레이션 SQL을 생성하라.
스펙: _workspace/spec_db_species_seed.md
출력: db/migrations/20260401_000000_seed_species_300.sql
</task>

<structured_output_contract>
완료 후 반환:
1. 생성된 파일 경로
2. INSERT 행 수
3. 검증: 모든 species_id가 KR-XXX 형식인지 확인
</structured_output_contract>

<completeness_contract>
300개 종 모두 INSERT. 누락 없이 완료 후 종료.
UP/DOWN 섹션 포함. DOWN은 DELETE FROM species.
</completeness_contract>

<action_safety>
species 테이블만 수정. 다른 테이블 건드리지 않음.
</action_safety>
"""
)
```

## 마이그레이션 파일 규칙

```
db/migrations/
  YYYYMMDD_HHMMSS_{description}.sql
  예: 20260401_143000_add_sighting_weather.sql
```

모든 마이그레이션 파일 구조:
```sql
-- Migration: {설명}
-- Author: {생성자}
-- Date: YYYY-MM-DD
-- Depends: {선행 마이그레이션 파일명} (없으면 생략)

-- UP
BEGIN;

{변경 내용}

COMMIT;

-- DOWN
BEGIN;

{롤백 내용}

COMMIT;
```

## 안전한 스키마 변경 패턴

**컬럼 추가** (무중단):
```sql
-- UP: DEFAULT NULL로 추가 (테이블 락 최소화)
ALTER TABLE sightings ADD COLUMN weather_temp NUMERIC(4,1);
-- 이후 필요 시 백필 후 NOT NULL 추가 (별도 마이그레이션)
```

**컬럼 이름 변경** (주의):
```sql
-- 새 컬럼 추가 → 데이터 복사 → 앱 배포 후 구 컬럼 삭제 (3단계)
-- 한 번에 이름 변경하면 롤링 배포 중 오류 발생
```

**인덱스 추가** (무중단):
```sql
-- CONCURRENTLY 옵션 사용 (쓰기 락 없음, 시간 소요)
CREATE INDEX CONCURRENTLY sightings_species_idx
  ON sightings(species_id) WHERE deleted_at IS NULL;
```

**대용량 테이블 데이터 수정**:
```sql
-- 배치 처리 (한 번에 1000행)
DO $$
DECLARE batch_size INT := 1000;
BEGIN
  LOOP
    UPDATE sightings SET ... WHERE id IN (
      SELECT id FROM sightings WHERE ... LIMIT batch_size
    );
    EXIT WHEN NOT FOUND;
    PERFORM pg_sleep(0.1); -- 부하 분산
  END LOOP;
END $$;
```

## 핵심 테이블 스키마 참조

> 전체 스키마는 `db/schema.sql` 참조. 아래는 마이그레이션 작성에 필요한 핵심 요소만 발췌.

**중요 컬럼 타입 규칙:**
- 좌표: `geography(Point, 4326)` — geometry 아님
- 타임스탬프: `TIMESTAMPTZ` (UTC 저장, 표시 시 KST 변환)
- 소프트 삭제: `deleted_at TIMESTAMPTZ` (NULL = 활성)
- UUID: `gen_random_uuid()` 기본값

**공간 인덱스 (GiST) 항상 포함:**
```sql
-- 새 geography 컬럼 추가 시 GiST 인덱스 필수
CREATE INDEX CONCURRENTLY {table}_{col}_gist ON {table} USING GIST({col});
```

## PIPA 관련 마이그레이션 주의사항

개인정보 컬럼을 추가하거나 변경할 때:
1. `개인정보 처리방침` 업데이트 필요 여부 확인
2. 컬럼 보존 기간 주석 필수:
   ```sql
   -- 개인정보: 탈퇴 후 30일 이내 파기 (PIPA)
   ALTER TABLE users ADD COLUMN phone_hash VARCHAR(64);
   ```
3. 삭제 배치 잡에 새 컬럼 포함 확인 (별도 태스크 생성)

## 마이그레이션 실행 및 검증

```bash
# 마이그레이션 실행 전 검토
psql $DATABASE_URL -f migration_file.sql --dry-run

# 실행
psql $DATABASE_URL -f migration_file.sql

# 롤백 (문제 발생 시)
psql $DATABASE_URL <<EOF
$(sed -n '/-- DOWN/,$ p' migration_file.sql | tail -n +2)
EOF
```

## 공간 함수 추가

`db/functions/` 디렉토리에 별도 저장:
```sql
-- db/functions/obscure_coordinate.sql
CREATE OR REPLACE FUNCTION obscure_coordinate(
  coord geography,
  sensitivity_tier INT,
  is_owner BOOLEAN
) RETURNS geography AS $$
...
$$ LANGUAGE plpgsql IMMUTABLE;
```

함수 변경 시 버전 접미사 추가 후 교체:
```sql
-- 1. 새 버전 생성
CREATE OR REPLACE FUNCTION obscure_coordinate_v2(...) ...
-- 2. 앱 배포 후
DROP FUNCTION obscure_coordinate_v1;
ALTER FUNCTION obscure_coordinate_v2 RENAME TO obscure_coordinate;
```
