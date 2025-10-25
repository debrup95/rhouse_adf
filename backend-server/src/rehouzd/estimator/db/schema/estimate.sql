-- Estimate Table: Contains property valuation and estimates
CREATE TABLE IF NOT EXISTS estimate (
    estimate_id BIGSERIAL PRIMARY KEY, 
    user_id BIGINT NOT NULL,
    address_id BIGINT UNIQUE, 
    address_value VARCHAR(255) NOT NULL,

    estimate_offer_min VARCHAR(255),
    estimate_offer_max VARCHAR(255),
    estimate_offer_value VARCHAR(255),

    underwrite_rent VARCHAR(255),
    underwrite_expense VARCHAR(255),
    underwrite_cap_rate VARCHAR(255),
    underwrite_selling_costs VARCHAR(255),
    underwrite_holding_costs VARCHAR(255),
    underwrite_margin VARCHAR(255),
    underwrite_low VARCHAR(255),
    underwrite_high VARCHAR(255),

    rental_or_flip BOOLEAN,
    after_repair_value VARCHAR(255),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to users table
    CONSTRAINT fk_estimate_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_estimate_user_id ON estimate(user_id);
CREATE INDEX IF NOT EXISTS idx_estimate_address_value ON estimate(address_value); 