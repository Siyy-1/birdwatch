-- AI 식별 로그 테이블
-- free 사용자 일일 한도(10회) 추적 및 식별 이력 보관

CREATE TABLE IF NOT EXISTS ai_identification_logs (
    log_id        uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    s3_key        text         NOT NULL,
    species_id    text         REFERENCES species(species_id),
    confidence    real,
    model_version text,
    created_at    timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user_created
    ON ai_identification_logs (user_id, created_at);
