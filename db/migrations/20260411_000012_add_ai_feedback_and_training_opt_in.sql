-- 20260411_000012_add_ai_feedback_and_training_opt_in.sql
-- UP

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ai_training_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_training_opt_in_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS ai_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  sighting_id UUID NOT NULL REFERENCES sightings(sighting_id) ON DELETE CASCADE,
  photo_s3_key TEXT NOT NULL,
  ai_species_id VARCHAR(10) NULL REFERENCES species(species_id),
  ai_confidence NUMERIC(5,4) NULL CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_top3 JSONB NULL,
  user_selected_species_id VARCHAR(10) NOT NULL REFERENCES species(species_id),
  was_corrected BOOLEAN NOT NULL DEFAULT FALSE,
  model_version VARCHAR(20) NULL,
  training_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_feedback_user_created_idx
  ON ai_feedback(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_feedback_training_corrected_idx
  ON ai_feedback(training_consent, was_corrected, created_at DESC);

-- DOWN

DROP INDEX IF EXISTS ai_feedback_training_corrected_idx;
DROP INDEX IF EXISTS ai_feedback_user_created_idx;
DROP TABLE IF EXISTS ai_feedback;

ALTER TABLE users
  DROP COLUMN IF EXISTS ai_training_opt_in_at,
  DROP COLUMN IF EXISTS ai_training_opt_in;
