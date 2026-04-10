-- UP

CREATE TABLE gallery_posts (
  post_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  sighting_id      UUID         NOT NULL REFERENCES sightings(sighting_id) ON DELETE CASCADE,
  user_id          UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  species_id       VARCHAR(10)  NOT NULL REFERENCES species(species_id),
  photo_cdn_url    TEXT         NOT NULL,
  location_province VARCHAR(50) NULL,        -- 도 단위 텍스트 (예: '경상북도'), 유저 선택 공개
  hearts_count     INT          NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_gallery_posts_sighting UNIQUE (sighting_id)  -- 목격 1건당 갤러리 포스트 1개
);

CREATE TABLE gallery_hearts (
  user_id    UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id    UUID        NOT NULL REFERENCES gallery_posts(post_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- 피드 정렬 (최신순)
CREATE INDEX idx_gallery_posts_created_at ON gallery_posts (created_at DESC);
-- 종별 필터
CREATE INDEX idx_gallery_posts_species_id  ON gallery_posts (species_id);
-- 유저별 조회 (내 공유 목록, 무료 제한 체크)
CREATE INDEX idx_gallery_posts_user_id     ON gallery_posts (user_id);
-- 지역별 필터
CREATE INDEX idx_gallery_posts_province    ON gallery_posts (location_province)
  WHERE location_province IS NOT NULL;

-- 좋아요 집계 함수 (hearts_count 동기화 트리거)
CREATE OR REPLACE FUNCTION sync_gallery_hearts_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE gallery_posts SET hearts_count = hearts_count + 1 WHERE post_id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE gallery_posts SET hearts_count = GREATEST(hearts_count - 1, 0) WHERE post_id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_gallery_hearts_count
AFTER INSERT OR DELETE ON gallery_hearts
FOR EACH ROW EXECUTE FUNCTION sync_gallery_hearts_count();

-- DOWN

DROP TRIGGER IF EXISTS trg_gallery_hearts_count ON gallery_hearts;
DROP FUNCTION IF EXISTS sync_gallery_hearts_count();
DROP TABLE IF EXISTS gallery_hearts;
DROP TABLE IF EXISTS gallery_posts;
