-- Migration: PostGIS 확장 활성화
-- Date: 2026-04-04
-- Description: geography 타입과 좌표 함수 사용을 위한 PostGIS 확장 설치

-- UP
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

COMMIT;

-- DOWN
BEGIN;
DROP EXTENSION IF EXISTS postgis;
COMMIT;
