-- Property Size Categories Table
-- Defines property size ranges for size-based pricing
CREATE TABLE IF NOT EXISTS property_size_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    sqft_min INTEGER NOT NULL,
    sqft_max INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default property size categories
INSERT INTO property_size_categories (name, sqft_min, sqft_max, description) VALUES 
('Small', 0, 1399, 'Properties under 1,400 square feet'),
('Medium', 1400, 2399, 'Properties between 1,400-2,400 square feet'),
('Large', 2400, 999999, 'Properties over 2,400 square feet')
ON CONFLICT (name) DO NOTHING;

-- Indexes for size range queries
CREATE INDEX IF NOT EXISTS idx_property_size_categories_range ON property_size_categories(sqft_min, sqft_max); 