-- Migration: sightings 테이블 생성
-- Date: 2026-04-04
-- Description: BirdWatch 조류 목격 기록 및 AI 판별 결과 저장 테이블

-- UP
BEGIN;

CREATE TABLE sightings (
    sighting_id          UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID                   NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    species_id           VARCHAR(10)            NOT NULL REFERENCES species(species_id),

    -- 위치 (GPS)
    location             geography(Point, 4326) NOT NULL,
    location_accuracy_m  INTEGER                NULL,
    altitude_m           NUMERIC(7,1)           NULL,

    -- 사진
    photo_s3_key         VARCHAR(500)           NOT NULL,
    photo_cdn_url        VARCHAR(500)           NULL,
    thumbnail_s3_key     VARCHAR(500)           NULL,
    exif_stripped        BOOLEAN                NOT NULL DEFAULT FALSE,

    -- AI 식별 결과
    ai_species_id        VARCHAR(10)            NULL REFERENCES species(species_id),
    ai_confidence        NUMERIC(5,4)           NULL
                         CHECK (ai_confidence IS NULL OR ai_confidence BETWEEN 0 AND 1),
    ai_top3              JSONB                  NULL,
    ai_model_version     VARCHAR(20)            NULL,
    ai_inference_ms      INTEGER                NULL,

    -- 검증 상태
    is_ai_confirmed      BOOLEAN                NOT NULL DEFAULT FALSE,
    is_manually_verified BOOLEAN                NOT NULL DEFAULT FALSE,

    -- 게임
    points_earned        INTEGER                NOT NULL DEFAULT 0,
    is_first_for_user    BOOLEAN                NOT NULL DEFAULT FALSE,

    -- 메타
    observed_at          TIMESTAMPTZ            NOT NULL,
    created_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ            NULL,

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
