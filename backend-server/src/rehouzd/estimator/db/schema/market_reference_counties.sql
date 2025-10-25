-- Market Reference Data Table
CREATE TABLE IF NOT EXISTS market_reference_counties (
    id SERIAL PRIMARY KEY,
    market_reference_id INT REFERENCES market_reference(id) ON DELETE CASCADE,
    state VARCHAR(50) NOT NULL,
    county VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_market_reference UNIQUE (state, county, market_reference_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_market_reference_location ON market_reference_counties(state, county);
CREATE INDEX IF NOT EXISTS idx_market_reference_id ON market_reference_counties(market_reference_id);
