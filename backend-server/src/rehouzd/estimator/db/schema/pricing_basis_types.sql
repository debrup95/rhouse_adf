-- Pricing Basis Types Table
-- Defines how different rehab items are priced (per sqft, fixed fee, etc.)
CREATE TABLE IF NOT EXISTS pricing_basis_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    unit_label VARCHAR(20), -- Display label for units (e.g., 'sq ft', 'each', 'fixture')
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default pricing basis types
INSERT INTO pricing_basis_types (code, name, description, unit_label) VALUES 
('sqft_floor', 'Per Square Foot (Floor Space)', 'Pricing based on floor square footage', 'sq ft'),
('sqft_wall', 'Per Square Foot (Wall Space)', 'Pricing based on wall square footage', 'sq ft'),
('fixed_fee', 'Fixed Fee', 'Flat rate pricing regardless of size', 'each'),
('per_fixture', 'Per Fixture', 'Pricing per plumbing fixture', 'fixture'),
('per_window', 'Per Window', 'Pricing per window unit', 'window'),
('per_room', 'Per Room', 'Pricing per room', 'room')
ON CONFLICT (code) DO NOTHING;

-- Index for code lookups
CREATE INDEX IF NOT EXISTS idx_pricing_basis_types_code ON pricing_basis_types(code); 