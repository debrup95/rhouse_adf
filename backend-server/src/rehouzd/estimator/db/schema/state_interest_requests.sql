-- State Interest Requests Table: Stores user requests for notifications when new states launch
CREATE TABLE IF NOT EXISTS state_interest_requests (
    request_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT, -- NULL for non-authenticated users
    email VARCHAR(255) NOT NULL,
    states JSONB NOT NULL, -- Array of state abbreviations ["TX", "GA", "AZ"]
    source VARCHAR(50) NOT NULL DEFAULT 'address_banner', -- Track where the request came from
    ip_address INET, -- Store IP for rate limiting and analytics
    user_agent TEXT, -- Store user agent for analytics
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'notified', 'unsubscribed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at TIMESTAMPTZ, -- When we sent expansion notification
    
    -- Foreign key constraint to users table (optional for non-authenticated users)
    CONSTRAINT fk_state_interest_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL -- Keep the request even if user is deleted
);

-- Indexes for frequent query patterns
CREATE INDEX IF NOT EXISTS idx_state_interest_user ON state_interest_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_state_interest_email ON state_interest_requests(email);
CREATE INDEX IF NOT EXISTS idx_state_interest_states ON state_interest_requests USING gin(states);
CREATE INDEX IF NOT EXISTS idx_state_interest_status ON state_interest_requests(status);
CREATE INDEX IF NOT EXISTS idx_state_interest_created ON state_interest_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_state_interest_source ON state_interest_requests(source);

-- Unique constraint to prevent duplicate requests for same email + states combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_state_interest_unique 
ON state_interest_requests(email, states) 
WHERE status = 'active';

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_state_interest_requests_updated_at
BEFORE UPDATE ON state_interest_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
