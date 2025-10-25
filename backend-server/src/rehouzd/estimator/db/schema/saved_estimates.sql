-- Saved Estimates Table: Persists user-saved property estimates
CREATE TABLE IF NOT EXISTS saved_estimates (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    property_address VARCHAR(255) NOT NULL,
    estimate_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to users table
    CONSTRAINT fk_saved_estimates_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_saved_estimates_user_id ON saved_estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_estimates_property_address ON saved_estimates(property_address);
CREATE INDEX IF NOT EXISTS idx_saved_estimates_created_at ON saved_estimates(created_at);

-- GIN index for JSON data search
CREATE INDEX IF NOT EXISTS idx_saved_estimates_estimate_data ON saved_estimates USING GIN (estimate_data);

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_saved_estimates_updated_at
BEFORE UPDATE ON saved_estimates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 