-- Consolidated Rehab Data Script
-- Creates tables, indexes, and populates rehab line items and cost data for Tennessee markets
-- Uses existing market reference IDs: 1=Memphis, 2=Nashville, 3=Knoxville
-- Based on exact user-provided cost data

-- ===================================
-- TABLE CREATION
-- ===================================

-- Rehab Costs Table
-- Stores actual cost data for each line item by market, tier, and size
CREATE TABLE IF NOT EXISTS rehab_costs (
    id SERIAL PRIMARY KEY,
    line_item_id INTEGER REFERENCES rehab_line_items(id) ON DELETE CASCADE,
    market_reference_id INTEGER REFERENCES market_reference(id) ON DELETE CASCADE,
    quality_tier_id INTEGER REFERENCES quality_tiers(id) ON DELETE CASCADE,
    property_size_id INTEGER REFERENCES property_size_categories(id) ON DELETE CASCADE,
    
    -- Cost data
    cost_amount DECIMAL(10,2) NOT NULL,
    
    -- Time-based versioning
    effective_date DATE DEFAULT CURRENT_DATE,
    expires_date DATE,
    
    -- Metadata
    notes TEXT,
    data_source VARCHAR(100), -- 'manual', 'contractor_quote', 'market_data'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combinations for active cost records
    UNIQUE(line_item_id, market_reference_id, quality_tier_id, property_size_id, effective_date)
);

-- Indexes for cost lookup queries
CREATE INDEX IF NOT EXISTS idx_rehab_costs_line_item ON rehab_costs(line_item_id);
CREATE INDEX IF NOT EXISTS idx_rehab_costs_market ON rehab_costs(market_reference_id);
CREATE INDEX IF NOT EXISTS idx_rehab_costs_tier ON rehab_costs(quality_tier_id);
CREATE INDEX IF NOT EXISTS idx_rehab_costs_size ON rehab_costs(property_size_id);
CREATE INDEX IF NOT EXISTS idx_rehab_costs_effective_date ON rehab_costs(effective_date);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_rehab_costs_lookup ON rehab_costs(line_item_id, market_reference_id, quality_tier_id, property_size_id);

-- Trigger to automatically update the updated_at timestamp
DROP TRIGGER IF EXISTS update_rehab_costs_updated_at ON rehab_costs;
CREATE TRIGGER update_rehab_costs_updated_at
BEFORE UPDATE ON rehab_costs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- LINE ITEMS AND COST DATA
-- ===================================

-- ===================================
-- INTERIOR PAINT
-- ===================================
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'interior_paint'), 
 'Interior Paint', 'interior_paint', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[1,2,3], 
 'Complete interior painting of all rooms based on floor square footage')
ON CONFLICT (code) DO NOTHING;

-- Interior Paint Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Memphis: $2.25
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.25),

-- Nashville: $2.75
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.75),

-- Knoxville: $2.00
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'interior_paint'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- EXTERIOR PAINT
-- ===================================
-- Pressure Wash Only - Fixed Fee
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'exterior_paint'), 
 'Pressure Wash Only', 'exterior_pressure_wash', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'Pressure washing exterior surfaces only')
ON CONFLICT (code) DO NOTHING;

-- Full Repaint Siding - Per SqFt Wall
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'exterior_paint'), 
 'Full Repaint (Siding)', 'exterior_repaint_siding', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_wall'),
 ARRAY[1,2,3], 
 'Complete exterior painting of siding surfaces')
ON CONFLICT (code) DO NOTHING;

-- Full Repaint Brick - Per SqFt Wall
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'exterior_paint'), 
 'Full Repaint (Brick)', 'exterior_repaint_brick', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_wall'),
 ARRAY[1,2,3], 
 'Complete exterior painting of brick surfaces')
ON CONFLICT (code) DO NOTHING;

-- Exterior Paint Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Pressure Wash: Memphis $500, Nashville $600, Knoxville $450
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 450.00),

-- Siding Repaint: Memphis $2.00, Nashville $2.50, Knoxville $1.75
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.50),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1.75),

-- Brick Repaint: Memphis $2.25, Nashville $2.75, Knoxville $2.00
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.00)
ON CONFLICT DO NOTHING;

-- Exterior Paint Costs for all property sizes
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Pressure Wash Costs - Memphis $500, Nashville $600, Knoxville $450
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 450.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 450.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_pressure_wash'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 450.00),

-- Siding Repaint Costs - Memphis $2.00, Nashville $2.50, Knoxville $1.75
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.50),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.50),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.50),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1.75),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1.75),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_siding'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1.75),

-- Brick Repaint Costs - Memphis $2.25, Nashville $2.75, Knoxville $2.00
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'exterior_repaint_brick'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- FLOORING
-- ===================================
-- Carpet (Bedrooms) - Basic Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'flooring'), 
 'Carpet (Bedrooms) - Basic Nylon/Polyester', 'flooring_carpet_basic', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[1], 
 'Tier 1: Basic Nylon/Polyester carpet for bedroom areas')
ON CONFLICT (code) DO NOTHING;

-- Carpet (Bedrooms) - Upgraded Tier 2/3
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'flooring'), 
 'Carpet (Bedrooms) - Upgraded Pad & Carpet', 'flooring_carpet_upgraded', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[2,3], 
 'Tier 2/3: Upgraded Pad & Carpet for bedroom areas')
ON CONFLICT (code) DO NOTHING;

-- LVP (Living Areas) - Basic Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'flooring'), 
 'LVP (Living Areas) - 4-5mm Glue-Down/Click-Lock', 'flooring_lvp_basic', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[1], 
 'Tier 1: 4-5mm Glue-Down/Click-Lock LVP for living areas')
ON CONFLICT (code) DO NOTHING;

-- LVP (Living Areas) - Mid Tier 2
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'flooring'), 
 'LVP (Living Areas) - 6-8mm w/Attached Pad', 'flooring_lvp_mid', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[2], 
 'Tier 2: 6-8mm w/Attached Pad LVP for living areas')
ON CONFLICT (code) DO NOTHING;

-- LVP (Living Areas) - Premium Tier 3
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'flooring'), 
 'LVP (Living Areas) - High-End LVP/Engineered HW', 'flooring_lvp_premium', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[3], 
 'Tier 3: High-End LVP/Engineered HW for living areas')
ON CONFLICT (code) DO NOTHING;

-- Tile (Bathrooms) - Basic Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'flooring'), 
 'Tile (Bathrooms) - Basic Ceramic (12x12)', 'flooring_tile_basic', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[1], 
 'Tier 1: Basic Ceramic (12x12) tile for bathroom floors')
ON CONFLICT (code) DO NOTHING;

-- Tile (Bathrooms) - Mid Tier 2
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'flooring'), 
 'Tile (Bathrooms) - Modern Porcelain (12x24)', 'flooring_tile_mid', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[2], 
 'Tier 2: Modern Porcelain (12x24) tile for bathroom floors')
ON CONFLICT (code) DO NOTHING;

-- Tile (Bathrooms) - Premium Tier 3
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'flooring'), 
 'Tile (Bathrooms) - Designer Look/Complex Pattern', 'flooring_tile_premium', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[3], 
 'Tier 3: Designer Look / Complex Pattern tile for bathroom floors')
ON CONFLICT (code) DO NOTHING;

-- Flooring Costs for all property sizes
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Carpet Basic - Memphis $2.25, Nashville $2.75, Knoxville $2.00
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.00),

-- Carpet Upgraded - Memphis $3.25, Nashville $3.75, Knoxville $3.00
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_carpet_upgraded'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.00),

-- LVP Basic - Memphis $3.50, Nashville $4.25, Knoxville $3.25
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.25),

-- LVP Mid - Memphis $4.75, Nashville $5.50, Knoxville $4.50
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_mid'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4.50),

-- LVP Premium - Memphis $6.00, Nashville $7.00, Knoxville $5.75
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 6.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 6.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 6.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5.75),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_lvp_premium'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5.75),

-- Tile Basic - Memphis $6.00, Nashville $7.50, Knoxville $5.50
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 6.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 6.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 6.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_basic'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5.50),

-- Tile Mid - Memphis $8.00, Nashville $10.00, Knoxville $7.50
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_mid'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7.50),

-- Tile Premium - Memphis $11.00, Nashville $14.00, Knoxville $10.00
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 11.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 11.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 11.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 14.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 14.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 14.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'flooring_tile_premium'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 10.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- BATHROOM
-- ===================================
-- Bathroom Partial Refresh - All Tiers
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'bathroom'), 
 'Bathroom Partial Refresh - All Tiers', 'bathroom_partial_all', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'New vanity top/faucet, new toilet, reglaze tub, new light/mirror, LVP flooring')
ON CONFLICT (code) DO NOTHING;

-- Bathroom Full Replacement - Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'bathroom'), 
 'Bathroom Full Replacement - Tier 1', 'bathroom_full_t1', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1], 
 'New builder-grade vanity, toilet, fiberglass tub/shower insert, basic fixtures, LVP floor')
ON CONFLICT (code) DO NOTHING;

-- Bathroom Full Replacement - Tier 2
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'bathroom'), 
 'Bathroom Full Replacement - Tier 2', 'bathroom_full_t2', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[2], 
 'New mid-grade vanity w/stone top, toilet, new tub w/ basic tile surround, tile floor, upgraded fixtures')
ON CONFLICT (code) DO NOTHING;

-- Bathroom Full Replacement - Tier 3
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'bathroom'), 
 'Bathroom Full Replacement - Tier 3', 'bathroom_full_t3', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[3], 
 'New larger/double vanity w/stone top, custom tile shower w/ glass door, tile floor, premium fixtures')
ON CONFLICT (code) DO NOTHING;

-- Bathroom Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Partial Refresh: Memphis $1,500, Nashville $2,000, Knoxville $1,400
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1400.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1400.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1400.00),

-- Full T1: Memphis $4,000, Nashville $5,000, Knoxville $3,500
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3500.00),

-- Full T2: Memphis $6,000, Nashville $7,500, Knoxville $5,500
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 6000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 6000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 6000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5500.00),

-- Full T3: Memphis $9,000, Nashville $11,000, Knoxville $8,500
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 9000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 9000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 9000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 11000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 11000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 11000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 8500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 8500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 8500.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- KITCHEN
-- ===================================
-- Kitchen Partial Refresh - Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Partial Refresh - Tier 1', 'kitchen_partial_t1', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1], 
 'Paint existing cabinets, new hardware, new laminate countertops, basic faucet')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Partial Refresh - Tier 2
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Partial Refresh - Tier 2', 'kitchen_partial_t2', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[2], 
 'Paint existing cabinets, new hardware, new entry-level granite/quartz, undermount sink, new faucet')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Full Replacement - Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Full Replacement - Tier 1', 'kitchen_full_t1', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1], 
 'New builder-grade (RTA) cabinets, laminate countertops, basic stainless appliance package')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Full Replacement - Tier 2
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Full Replacement - Tier 2', 'kitchen_full_t2', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[2], 
 'New mid-grade Shaker cabinets, granite/quartz, standard stainless appliance package, basic tile backsplash')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Full Replacement - Tier 3
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Full Replacement - Tier 3', 'kitchen_full_t3', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[3], 
 'New semi-custom cabinets, higher-end quartz, upgraded appliance package, full tile backsplash, under-cabinet lighting')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Costs (for Medium and Large properties)
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Kitchen Partial T1 - Memphis $2,500, Nashville $3,500, Knoxville $2,200
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2500.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2500.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3500.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3500.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2200.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2200.00),

-- Kitchen Partial T2 - Memphis $4,000, Nashville $5,000, Knoxville $3,800
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3800.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3800.00),

-- Kitchen Full T1 - Memphis $8,000, Nashville $10,000, Knoxville $7,500
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 8000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 8000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 10000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 10000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7500.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7500.00),

-- Kitchen Full T2 - Memphis $12,000, Nashville $15,000, Knoxville $11,000
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 12000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 12000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 15000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 15000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 11000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 11000.00),

-- Kitchen Full T3 - Memphis $18,000, Nashville $22,000, Knoxville $17,000
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 18000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 18000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 22000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 22000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 17000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 17000.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- KITCHEN
-- ===================================
-- Kitchen Partial Refresh - Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Partial Refresh - Tier 1', 'kitchen_partial_t1', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1], 
 'Paint existing cabinets, new hardware, new laminate countertops, basic faucet')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Partial Refresh - Tier 2
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Partial Refresh - Tier 2', 'kitchen_partial_t2', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[2], 
 'Paint existing cabinets, new hardware, new entry-level granite/quartz, undermount sink, new faucet')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Full Replacement - Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Full Replacement - Tier 1', 'kitchen_full_t1', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1], 
 'New builder-grade (RTA) cabinets, laminate countertops, basic stainless appliance package')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Full Replacement - Tier 2
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Full Replacement - Tier 2', 'kitchen_full_t2', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[2], 
 'New mid-grade Shaker cabinets, granite/quartz, standard stainless appliance package, basic tile backsplash')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Full Replacement - Tier 3
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'kitchen'), 
 'Kitchen Full Replacement - Tier 3', 'kitchen_full_t3', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[3], 
 'New semi-custom cabinets, higher-end quartz, upgraded appliance package, full tile backsplash, under-cabinet lighting')
ON CONFLICT (code) DO NOTHING;

-- Kitchen Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Memphis Kitchen Costs: Partial T1 $2,500, Partial T2 $4,000, Full T1 $8,000, Full T2 $12,000, Full T3 $18,000
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2500.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 8000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 12000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 18000.00),

-- Nashville Kitchen Costs: Partial T1 $3,500, Partial T2 $5,000, Full T1 $10,000, Full T2 $15,000, Full T3 $22,000
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3500.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 10000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 15000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 22000.00),

-- Knoxville Kitchen Costs: Partial T1 $2,200, Partial T2 $3,800, Full T1 $7,500, Full T2 $11,000, Full T3 $17,000
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2200.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_partial_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3800.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7500.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 11000.00),
((SELECT id FROM rehab_line_items WHERE code = 'kitchen_full_t3'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 17000.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- BATHROOM
-- ===================================
-- Bathroom Partial Refresh - All Tiers
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'bathroom'), 
 'Bathroom Partial Refresh - All Tiers', 'bathroom_partial_all', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'New vanity top/faucet, new toilet, reglaze tub, new light/mirror, LVP flooring')
ON CONFLICT (code) DO NOTHING;

-- Bathroom Full Replacement - Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'bathroom'), 
 'Bathroom Full Replacement - Tier 1', 'bathroom_full_t1', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1], 
 'New builder-grade vanity, toilet, fiberglass tub/shower insert, basic fixtures, LVP floor')
ON CONFLICT (code) DO NOTHING;

-- Bathroom Full Replacement - Tier 2
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'bathroom'), 
 'Bathroom Full Replacement - Tier 2', 'bathroom_full_t2', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[2], 
 'New mid-grade vanity w/stone top, toilet, new tub w/ basic tile surround, tile floor, upgraded fixtures')
ON CONFLICT (code) DO NOTHING;

-- Bathroom Full Replacement - Tier 3
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'bathroom'), 
 'Bathroom Full Replacement - Tier 3', 'bathroom_full_t3', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[3], 
 'New larger/double vanity w/stone top, custom tile shower w/ glass door, tile floor, premium fixtures')
ON CONFLICT (code) DO NOTHING;

-- Bathroom Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Partial Refresh: Memphis $1,500, Nashville $2,000, Knoxville $1,400
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_partial_all'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1400.00),

-- Full T1: Memphis $4,000, Nashville $5,000, Knoxville $3,500
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3500.00),

-- Full T2: Memphis $6,000, Nashville $7,500, Knoxville $5,500
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 6000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7500.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t2'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5500.00),

-- Full T3: Memphis $9,000, Nashville $11,000, Knoxville $8,500
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 9000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 11000.00),
((SELECT id FROM rehab_line_items WHERE code = 'bathroom_full_t3'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 8500.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- ROOF
-- ===================================
-- Asphalt Shingle (3-Tab) - Tier 1
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'roof'), 
 'Asphalt Shingle (3-Tab) - Tier 1', 'roof_asphalt_3tab', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[1], 
 'Basic 3-tab asphalt shingle roof replacement')
ON CONFLICT (code) DO NOTHING;

-- Asphalt (Architectural) - Tier 2/3
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'roof'), 
 'Asphalt (Architectural) - Tier 2/3', 'roof_asphalt_architectural', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[2,3], 
 'Architectural asphalt shingle roof replacement')
ON CONFLICT (code) DO NOTHING;

-- Roof Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- 3-Tab: Memphis $2.80, Nashville $3.20, Knoxville $2.70
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.80),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.80),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.80),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.20),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.20),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.20),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2.70),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 2.70),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_3tab'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 2.70),

-- Architectural: Memphis $3.25, Nashville $3.75, Knoxville $3.10
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.10),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.10),
((SELECT id FROM rehab_line_items WHERE code = 'roof_asphalt_architectural'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.10)
ON CONFLICT DO NOTHING;

-- ===================================
-- HVAC
-- ===================================
-- HVAC Repair - Typical Service Call
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'hvac'), 
 'HVAC Repair - Typical Service Call', 'hvac_repair', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'HVAC repair service call')
ON CONFLICT (code) DO NOTHING;

-- Replace Condenser/Furnace Only
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'hvac'), 
 'Replace Condenser/Furnace Only', 'hvac_replace_unit', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'Replace condenser or furnace unit only')
ON CONFLICT (code) DO NOTHING;

-- Full System Replace - Small
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'hvac'), 
 'Full System Replace - Small (<1,400 sqft)', 'hvac_full_small', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'Full HVAC system replacement for small properties (<1,400 sqft)')
ON CONFLICT (code) DO NOTHING;

-- Full System Replace - Medium
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'hvac'), 
 'Full System Replace - Medium (1,400-2,400 sqft)', 'hvac_full_medium', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'Full HVAC system replacement for medium properties (1,400-2,400 sqft)')
ON CONFLICT (code) DO NOTHING;

-- Full System Replace - Large
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'hvac'), 
 'Full System Replace - Large (>2,400 sqft)', 'hvac_full_large', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'Full HVAC system replacement for large properties (>2,400 sqft)')
ON CONFLICT (code) DO NOTHING;

-- HVAC Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Repair: Memphis $500, Nashville $600, Knoxville $450
((SELECT id FROM rehab_line_items WHERE code = 'hvac_repair'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_repair'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_repair'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 450.00),

-- Replace Unit: Memphis $2,500, Nashville $3,000, Knoxville $2,200
((SELECT id FROM rehab_line_items WHERE code = 'hvac_replace_unit'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2500.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_replace_unit'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3000.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_replace_unit'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 2200.00),

-- Full Small: Memphis $5,000, Nashville $6,000, Knoxville $4,800
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_small'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5000.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_small'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 6000.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_small'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4800.00),

-- Full Medium: Memphis $6,500, Nashville $7,500, Knoxville $6,000
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_medium'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 6500.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_medium'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7500.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_medium'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 6000.00),

-- Full Large: Memphis $8,000, Nashville $9,500, Knoxville $7,500
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_large'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 8000.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_large'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 9500.00),
((SELECT id FROM rehab_line_items WHERE code = 'hvac_full_large'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7500.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- WATER HEATER
-- ===================================
-- 40-Gal Electric/Gas Tank - Small/Medium
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'water_heater'), 
 '40-Gal Electric/Gas Tank - Small/Medium (<2,000 sqft)', 'water_heater_40gal', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 '40-gallon electric or gas tank water heater for small/medium properties (<2,000 sqft)')
ON CONFLICT (code) DO NOTHING;

-- 50-Gal Electric/Gas Tank - Medium/Large
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'water_heater'), 
 '50-Gal Electric/Gas Tank - Medium/Large (>2,000 sqft)', 'water_heater_50gal', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 '50-gallon electric or gas tank water heater for medium/large properties (>2,000 sqft)')
ON CONFLICT (code) DO NOTHING;

-- Water Heater Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- 40-Gal: Memphis $750, Nashville $1,300, Knoxville $700
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 750.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 750.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1100.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1100.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 700.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 700.00),

-- 50-Gal: Memphis $1,000, Nashville $1,100, Knoxville $1,000
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1000.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1000.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1300.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1300.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1000.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1000.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- WINDOWS
-- ===================================
-- Windows - Tier 1 (Builder-grade vinyl)
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'windows'), 
 'Windows - Tier 1 (Builder-grade vinyl, double-pane)', 'windows_tier1', 
 (SELECT id FROM pricing_basis_types WHERE code = 'per_window'),
 ARRAY[1], 
 'Builder-grade vinyl, double-pane windows')
ON CONFLICT (code) DO NOTHING;

-- Windows - Tier 2/3 (Higher quality vinyl)
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'windows'), 
 'Windows - Tier 2/3 (Higher quality vinyl, Low-E, Argon)', 'windows_tier23', 
 (SELECT id FROM pricing_basis_types WHERE code = 'per_window'),
 ARRAY[2,3], 
 'Higher quality vinyl, Low-E, Argon windows')
ON CONFLICT (code) DO NOTHING;

-- Windows Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Tier 1: Memphis $350, Nashville $400, Knoxville $325
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 350.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 350.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 350.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 400.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 400.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 400.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 325.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 325.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 325.00),

-- Tier 2/3: Memphis $500, Nashville $600, Knoxville $475
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 475.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 475.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 475.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- EXTERIOR SIDING
-- ===================================
-- Full Replacement (Vinyl)
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'exterior_siding'), 
 'Full Replacement (Vinyl)', 'siding_vinyl', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_wall'),
 ARRAY[1,2,3], 
 'Full vinyl siding replacement per square foot')
ON CONFLICT (code) DO NOTHING;

-- Full Replacement (Fiber Cement)
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'exterior_siding'), 
 'Full Replacement (Fiber Cement)', 'siding_fiber_cement', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_wall'),
 ARRAY[1,2,3], 
 'Full fiber cement siding replacement per square foot')
ON CONFLICT (code) DO NOTHING;

-- Exterior Siding Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Vinyl: Memphis $4.00, Nashville $5.00, Knoxville $3.75
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.75),

-- Fiber Cement: Memphis $8.00, Nashville $10.00, Knoxville $7.50
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7.50)
ON CONFLICT DO NOTHING;

-- ===================================
-- ELECTRICAL
-- ===================================
-- Replace Panel
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'electrical'), 
 'Replace Panel', 'electrical_panel', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'Electrical panel replacement')
ON CONFLICT (code) DO NOTHING;

-- Full House Rewire
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'electrical'), 
 'Full House Rewire', 'electrical_rewire', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[1,2,3], 
 'Full house electrical rewiring per square foot')
ON CONFLICT (code) DO NOTHING;

-- Electrical Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Panel: Memphis $1,200, Nashville $1,500, Knoxville $1,100
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1200.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1200.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1200.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1100.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1100.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1100.00),

-- Rewire: Memphis $5.00, Nashville $7.00, Knoxville $4.50
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4.50),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4.50),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4.50)
ON CONFLICT DO NOTHING;

-- ===================================
-- PLUMBING
-- ===================================
-- Full House Re-pipe (PEX) - Per Fixture
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'plumbing'), 
 'Full House Re-pipe (PEX) - Per Fixture', 'plumbing_repipe_fixture', 
 (SELECT id FROM pricing_basis_types WHERE code = 'per_fixture'),
 ARRAY[1,2,3], 
 'Full house re-pipe with PEX, priced per plumbing fixture')
ON CONFLICT (code) DO NOTHING;

-- Full House Re-pipe (PEX) - Per SqFt
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'plumbing'), 
 'Full House Re-pipe (PEX) - Per SqFt (Approx)', 'plumbing_repipe_sqft', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[1,2,3], 
 'Full house re-pipe with PEX, approximate per square foot pricing')
ON CONFLICT (code) DO NOTHING;

-- Plumbing Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Per Fixture: Memphis $600, Nashville $800, Knoxville $550
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 800.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 800.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 800.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 550.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 550.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_fixture'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 550.00),

-- Per SqFt: Memphis $4.00, Nashville $5.00, Knoxville $3.50
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.50),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.50),
((SELECT id FROM rehab_line_items WHERE code = 'plumbing_repipe_sqft'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.50)
ON CONFLICT DO NOTHING;

-- ===================================
-- WATER HEATER
-- ===================================
-- 40-Gal Electric/Gas Tank - Small/Medium
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'water_heater'), 
 '40-Gal Electric/Gas Tank - Small/Medium (<2,000 sqft)', 'water_heater_40gal', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 '40-gallon electric or gas tank water heater for small/medium properties (<2,000 sqft)')
ON CONFLICT (code) DO NOTHING;

-- 50-Gal Electric/Gas Tank - Medium/Large
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'water_heater'), 
 '50-Gal Electric/Gas Tank - Medium/Large (>2,000 sqft)', 'water_heater_50gal', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 '50-gallon electric or gas tank water heater for medium/large properties (>2,000 sqft)')
ON CONFLICT (code) DO NOTHING;

-- Water Heater Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- 40-Gal: Memphis $750, Nashville $1,300, Knoxville $700
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 750.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 750.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1300.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1300.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 700.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_40gal'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 700.00),

-- 50-Gal: Memphis $1,000, Nashville $1,300, Knoxville $1,000
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1000.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1000.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1300.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1300.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1000.00),
((SELECT id FROM rehab_line_items WHERE code = 'water_heater_50gal'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1000.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- WINDOWS
-- ===================================
-- Windows - Tier 1 (Builder-grade vinyl)
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'windows'), 
 'Windows - Tier 1 (Builder-grade vinyl, double-pane)', 'windows_tier1', 
 (SELECT id FROM pricing_basis_types WHERE code = 'per_window'),
 ARRAY[1], 
 'Builder-grade vinyl, double-pane windows')
ON CONFLICT (code) DO NOTHING;

-- Windows - Tier 2/3 (Higher quality vinyl)
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'windows'), 
 'Windows - Tier 2/3 (Higher quality vinyl, Low-E, Argon)', 'windows_tier23', 
 (SELECT id FROM pricing_basis_types WHERE code = 'per_window'),
 ARRAY[2,3], 
 'Higher quality vinyl, Low-E, Argon windows')
ON CONFLICT (code) DO NOTHING;

-- Windows Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Tier 1: Memphis $350, Nashville $400, Knoxville $325
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 350.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 350.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 350.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 400.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 400.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 400.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 325.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 325.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier1'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 325.00),

-- Tier 2/3: Memphis $500, Nashville $600, Knoxville $475
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 1, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 500.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 2, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 600.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 475.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 475.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 2, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 475.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 475.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 475.00),
((SELECT id FROM rehab_line_items WHERE code = 'windows_tier23'), 3, 3, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 475.00)
ON CONFLICT DO NOTHING;

-- ===================================
-- EXTERIOR SIDING
-- ===================================
-- Full Replacement (Vinyl)
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'exterior_siding'), 
 'Full Replacement (Vinyl)', 'siding_vinyl', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_wall'),
 ARRAY[1,2,3], 
 'Full vinyl siding replacement per square foot')
ON CONFLICT (code) DO NOTHING;

-- Full Replacement (Fiber Cement)
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'exterior_siding'), 
 'Full Replacement (Fiber Cement)', 'siding_fiber_cement', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_wall'),
 ARRAY[1,2,3], 
 'Full fiber cement siding replacement per square foot')
ON CONFLICT (code) DO NOTHING;

-- Exterior Siding Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Vinyl: Memphis $4.00, Nashville $5.00, Knoxville $3.75
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 5.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.75),
((SELECT id FROM rehab_line_items WHERE code = 'siding_vinyl'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.75),

-- Fiber Cement: Memphis $8.00, Nashville $10.00, Knoxville $7.50
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 8.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 10.00),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 7.50),
((SELECT id FROM rehab_line_items WHERE code = 'siding_fiber_cement'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 7.50)
ON CONFLICT DO NOTHING;

-- ===================================
-- ELECTRICAL
-- ===================================
-- Replace Panel
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'electrical'), 
 'Replace Panel', 'electrical_panel', 
 (SELECT id FROM pricing_basis_types WHERE code = 'fixed_fee'),
 ARRAY[1,2,3], 
 'Electrical panel replacement')
ON CONFLICT (code) DO NOTHING;

-- Full House Rewire
INSERT INTO rehab_line_items (category_id, name, code, pricing_basis_id, applies_to_tiers, scope) VALUES 
((SELECT id FROM rehab_categories WHERE name = 'electrical'), 
 'Full House Rewire', 'electrical_rewire', 
 (SELECT id FROM pricing_basis_types WHERE code = 'sqft_floor'),
 ARRAY[1,2,3], 
 'Full house electrical rewiring per square foot')
ON CONFLICT (code) DO NOTHING;

-- Electrical Costs
INSERT INTO rehab_costs (line_item_id, market_reference_id, quality_tier_id, property_size_id, cost_amount) VALUES 
-- Panel: Memphis $1,200, Nashville $1,500, Knoxville $1,100
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1200.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1200.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1200.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1500.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 1100.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 1100.00),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_panel'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 1100.00),

-- Rewire: Memphis $3.50, Nashville $4.50, Knoxville $3.25
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.50),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.50),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 1, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.50),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 4.50),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 4.50),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 2, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 4.50),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Small'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Medium'), 3.25),
((SELECT id FROM rehab_line_items WHERE code = 'electrical_rewire'), 3, 1, 
 (SELECT id FROM property_size_categories WHERE name = 'Large'), 3.25)
ON CONFLICT DO NOTHING; 