-- Rehab Categories Table
-- Defines the main categories for rehab cost calculations
CREATE TABLE IF NOT EXISTS rehab_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default rehab categories
INSERT INTO rehab_categories (name, display_name, description, sort_order) VALUES 
('interior_paint', 'Interior Paint', 'Interior painting costs per square foot of floor space', 1),
('exterior_paint', 'Exterior Paint', 'Exterior painting and pressure washing services', 2),
('flooring', 'Flooring', 'Flooring replacement by room type and quality tier', 3),
('kitchen', 'Kitchen', 'Kitchen renovation from partial refresh to full replacement', 4),
('bathroom', 'Bathroom', 'Bathroom renovation from partial refresh to full replacement', 5),
('roof', 'Roof', 'Roof replacement with different shingle types', 6),
('hvac', 'HVAC', 'HVAC repair and replacement services', 7),
('water_heater', 'Water Heater', 'Water heater replacement by size and type', 8),
('windows', 'Windows', 'Window replacement by quality tier', 9),
('exterior_siding', 'Exterior Siding', 'Siding replacement with vinyl or fiber cement', 10),
('electrical', 'Electrical', 'Electrical panel replacement and rewiring', 11),
('plumbing', 'Plumbing', 'Full house re-pipe with PEX', 12)
ON CONFLICT (name) DO NOTHING;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_rehab_categories_active ON rehab_categories(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_rehab_categories_sort_order ON rehab_categories(sort_order); 