-- Underwrite Requests Table: Stores user requests for property underwriting services
CREATE TABLE IF NOT EXISTS underwrite_requests (
    request_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    property_address TEXT NOT NULL,
    estimated_price VARCHAR(50) NOT NULL,
    notes TEXT NOT NULL,
    property_beds VARCHAR(20),
    property_baths VARCHAR(20),
    property_sqft VARCHAR(20),
    property_year VARCHAR(20),
    photo_url TEXT, -- Store photo links provided by users
    images_data JSONB, -- Store image information as JSON
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    processed_by BIGINT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraint to users table
    CONSTRAINT fk_underwrite_requests_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
        
    -- Foreign key constraint for admin who processed the request
    CONSTRAINT fk_underwrite_requests_processed_by
        FOREIGN KEY (processed_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- Indexes for frequent query patterns
CREATE INDEX IF NOT EXISTS idx_underwrite_requests_user ON underwrite_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_underwrite_requests_status ON underwrite_requests(status);
CREATE INDEX IF NOT EXISTS idx_underwrite_requests_created ON underwrite_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_underwrite_requests_property ON underwrite_requests USING gin(to_tsvector('english', property_address));

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_underwrite_requests_updated_at
BEFORE UPDATE ON underwrite_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();