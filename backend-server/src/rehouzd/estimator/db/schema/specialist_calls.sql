-- Specialist Calls Table: Tracks when users request calls with specialists
CREATE TABLE IF NOT EXISTS specialist_calls (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to users table
  CONSTRAINT fk_specialist_calls_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_specialist_calls_user_id ON specialist_calls(user_id); 