-- Skip Trace Credits Table: Tracks user's skip trace credits separately from subscription credits
CREATE TABLE IF NOT EXISTS skip_trace_credits (
    user_id BIGINT NOT NULL PRIMARY KEY,
    free_credits_remaining INTEGER NOT NULL DEFAULT 3,
    paid_credits_remaining INTEGER NOT NULL DEFAULT 0,
    total_free_credits_used INTEGER NOT NULL DEFAULT 0,
    total_paid_credits_used INTEGER NOT NULL DEFAULT 0,
    total_lookups_performed INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_skip_trace_credits_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
        
    -- Ensure credits don't go negative
    CONSTRAINT chk_free_credits_non_negative
        CHECK (free_credits_remaining >= 0),
        
    CONSTRAINT chk_paid_credits_non_negative
        CHECK (paid_credits_remaining >= 0),
        
    -- Ensure usage counters are non-negative
    CONSTRAINT chk_free_used_non_negative
        CHECK (total_free_credits_used >= 0),
        
    CONSTRAINT chk_paid_used_non_negative
        CHECK (total_paid_credits_used >= 0),
        
    CONSTRAINT chk_lookups_non_negative
        CHECK (total_lookups_performed >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skip_trace_credits_user ON skip_trace_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_skip_trace_credits_updated ON skip_trace_credits(updated_at);

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_skip_trace_credits_updated_at
BEFORE UPDATE ON skip_trace_credits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize skip trace credits for new users
CREATE OR REPLACE FUNCTION initialize_skip_trace_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO skip_trace_credits (user_id, free_credits_remaining)
    VALUES (NEW.user_id, 3)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create skip trace credits when a new user is created
CREATE TRIGGER trigger_initialize_skip_trace_credits
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION initialize_skip_trace_credits(); 