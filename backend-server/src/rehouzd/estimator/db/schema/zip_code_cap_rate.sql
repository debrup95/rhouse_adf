-- Create table for zip code cap rate summary
-- This table stores aggregated cap rate data by zip code with outlier handling

CREATE TABLE IF NOT EXISTS zip_code_cap_rate (
    id SERIAL PRIMARY KEY,
    zip_code VARCHAR(10) NOT NULL,
    state VARCHAR(2) NOT NULL,
    average_cap_rate DECIMAL(5,2) NOT NULL, -- Stored as decimal (e.g., 6.50 for 6.50%)
    median_cap_rate DECIMAL(5,2) NOT NULL,
    min_cap_rate DECIMAL(5,2) NOT NULL,
    max_cap_rate DECIMAL(5,2) NOT NULL,
    property_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add unique constraint on zip code and state combination
    UNIQUE(zip_code, state)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_zip_code_cap_rate_zip ON zip_code_cap_rate(zip_code);
CREATE INDEX IF NOT EXISTS idx_zip_code_cap_rate_state ON zip_code_cap_rate(state);
CREATE INDEX IF NOT EXISTS idx_zip_code_cap_rate_avg ON zip_code_cap_rate(average_cap_rate DESC);
