-- Quality Tiers Table
-- Defines quality/ARV tiers for different finishing levels
CREATE TABLE IF NOT EXISTS quality_tiers (
    id SERIAL PRIMARY KEY,
    tier_number INTEGER NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert quality tiers based on user data
INSERT INTO quality_tiers (tier_number, name, description) VALUES 
(1, 'Tier 1', 'Basic/Builder-grade materials and finishes'),
(2, 'Tier 2', 'Mid-grade materials and finishes'),
(3, 'Tier 3', 'Premium/High-end materials and finishes')
ON CONFLICT (tier_number) DO NOTHING;

-- Index for tier number lookups
CREATE INDEX IF NOT EXISTS idx_quality_tiers_tier_number ON quality_tiers(tier_number); 