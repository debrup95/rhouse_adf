-- Offer Matching Requests Table: Stores requests for offer sourcing/buyer matching services
CREATE TABLE IF NOT EXISTS offer_matching_requests (
    request_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL, 
    phone_number VARCHAR(20),
    property_address TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    admin_notes TEXT,
    processed_by BIGINT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraint to users table
    CONSTRAINT fk_offer_matching_requests_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE, 
        
    -- Foreign key constraint for admin who processed the request
    CONSTRAINT fk_offer_matching_requests_processed_by
        FOREIGN KEY (processed_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- Indexes for frequent query patterns
CREATE INDEX IF NOT EXISTS idx_offer_matching_requests_user ON offer_matching_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_matching_requests_status ON offer_matching_requests(status);
CREATE INDEX IF NOT EXISTS idx_offer_matching_requests_created ON offer_matching_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_offer_matching_requests_phone ON offer_matching_requests(phone_number);

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_offer_matching_requests_updated_at
BEFORE UPDATE ON offer_matching_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
