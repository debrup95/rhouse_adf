-- Market Underwrite Inputs Table
CREATE TABLE IF NOT EXISTS market_underwrite_inputs (
    id SERIAL PRIMARY KEY,
    market_reference_id INT NOT NULL REFERENCES market_reference(id) ON DELETE CASCADE,
    operating_expense DECIMAL(5,2),
    cap_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_underwrite_reference_id ON market_underwrite_inputs(market_reference_id);