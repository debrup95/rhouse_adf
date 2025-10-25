-- Rehab Line Items Table
-- Defines specific rehab services/products with their attributes
CREATE TABLE IF NOT EXISTS rehab_line_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES rehab_categories(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    scope TEXT, -- Detailed scope description
    pricing_basis_id INTEGER REFERENCES pricing_basis_types(id),
    
    -- Applicability rules
    applies_to_tiers INTEGER[], -- Array of tier numbers [1,2,3] or [1] for tier-specific items
    applies_to_sizes INTEGER[], -- Array of property_size_categories.id values
    
    -- Additional specifications for complex items
    specifications JSONB, -- Flexible specs like {"surface_type": "siding", "material": "vinyl"}
    
    -- UI and business logic
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_rehab_line_items_category ON rehab_line_items(category_id);
CREATE INDEX IF NOT EXISTS idx_rehab_line_items_code ON rehab_line_items(code);
CREATE INDEX IF NOT EXISTS idx_rehab_line_items_active ON rehab_line_items(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_rehab_line_items_pricing_basis ON rehab_line_items(pricing_basis_id);

-- GIN index for JSONB specifications
CREATE INDEX IF NOT EXISTS idx_rehab_line_items_specifications ON rehab_line_items USING GIN (specifications); 