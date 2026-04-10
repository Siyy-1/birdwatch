-- Function: obscure_coordinate
-- Purpose: 민감종 좌표 난독화 (PIPA + 생태 보호)
-- Location: db/functions/obscure_coordinate.sql

CREATE OR REPLACE FUNCTION obscure_coordinate(
    coord             geography(Point, 4326),
    sensitivity_tier  INT,
    is_owner          BOOLEAN
) RETURNS geography(Point, 4326) AS $$
BEGIN
    IF is_owner THEN
        RETURN coord;
    END IF;

    IF sensitivity_tier = 3 THEN
        RETURN coord;
    END IF;

    IF sensitivity_tier = 1 THEN
        RETURN ST_SnapToGrid(coord::geometry, 0.5)::geography;
    END IF;

    RETURN ST_SnapToGrid(coord::geometry, 0.05)::geography;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT
   COST 1;

COMMENT ON FUNCTION obscure_coordinate(geography, INT, BOOLEAN) IS
    'BirdWatch 좌표 난독화. is_owner=TRUE면 원본, tier1=0.5도 격자, tier2=0.05도 격자, tier3=원본.';
