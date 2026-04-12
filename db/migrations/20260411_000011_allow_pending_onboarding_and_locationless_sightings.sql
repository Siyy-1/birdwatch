-- Migration: 온보딩 전 약관 미동의 상태 및 위치 없는 사이팅 허용
-- Date: 2026-04-11
-- Description:
--   1. users.terms_agreed_at / privacy_agreed_at 를 nullable 로 변경
--   2. sightings.location 을 nullable 로 변경

-- UP
BEGIN;

ALTER TABLE users
  ALTER COLUMN terms_agreed_at DROP NOT NULL,
  ALTER COLUMN privacy_agreed_at DROP NOT NULL;

ALTER TABLE sightings
  ALTER COLUMN location DROP NOT NULL;

COMMIT;

-- DOWN
BEGIN;

UPDATE users
   SET terms_agreed_at = COALESCE(terms_agreed_at, created_at),
       privacy_agreed_at = COALESCE(privacy_agreed_at, created_at)
 WHERE terms_agreed_at IS NULL
    OR privacy_agreed_at IS NULL;

ALTER TABLE users
  ALTER COLUMN terms_agreed_at SET NOT NULL,
  ALTER COLUMN privacy_agreed_at SET NOT NULL;

UPDATE sightings
   SET location = ST_SetSRID(ST_MakePoint(126.9780, 37.5665), 4326)::geography
 WHERE location IS NULL;

ALTER TABLE sightings
  ALTER COLUMN location SET NOT NULL;

COMMIT;
