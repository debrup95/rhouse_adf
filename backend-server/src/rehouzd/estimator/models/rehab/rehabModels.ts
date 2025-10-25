/**
 * TypeScript models for the rehab calculator system
 * These interfaces correspond to the database tables in the rehab schema
 */

/**
 * Rehab Category Model
 * Represents main categories like Kitchen, Bathroom, HVAC, etc.
 */
export interface RehabCategory {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  created_at: Date;
}

/**
 * Quality Tier Model
 * Represents quality levels (Basic, Mid-Grade, Premium)
 */
export interface QualityTier {
  id: number;
  tier_number: number;
  name: string;
  description?: string;
  created_at: Date;
}

/**
 * Property Size Category Model
 * Represents property size ranges (Small, Medium, Large)
 */
export interface PropertySizeCategory {
  id: number;
  name: string;
  sqft_min: number;
  sqft_max: number;
  description?: string;
  created_at: Date;
}

/**
 * Pricing Basis Type Model
 * Represents how items are priced (per sqft, fixed fee, per window, etc.)
 */
export interface PricingBasisType {
  id: number;
  code: string;
  name: string;
  description?: string;
  unit_label?: string;
  created_at: Date;
}

/**
 * Rehab Line Item Model
 * Represents specific rehab services/products
 */
export interface RehabLineItem {
  id: number;
  category_id: number;
  name: string;
  code: string;
  description?: string;
  scope?: string;
  pricing_basis_id: number;
  applies_to_tiers: number[];
  applies_to_sizes?: number[];
  specifications?: Record<string, any>;
  sort_order: number;
  is_required: boolean;
  active: boolean;
  created_at: Date;
  
  // Joined data (when fetched with relations)
  category?: RehabCategory;
  pricing_basis?: PricingBasisType;
}

/**
 * Rehab Cost Model
 * Stores actual cost data for each line item by market, tier, and size
 */
export interface RehabCost {
  id: number;
  line_item_id: number;
  market_reference_id: number;
  quality_tier_id: number;
  property_size_id: number;
  cost_amount: number;
  effective_date: Date;
  expires_date?: Date;
  notes?: string;
  data_source?: string;
  created_at: Date;
  updated_at: Date;
  
  // Joined data (when fetched with relations)
  line_item?: RehabLineItem;
  quality_tier?: QualityTier;
  property_size?: PropertySizeCategory;
}

/**
 * Request/Response DTOs for API
 */

/**
 * Request parameters for rehab cost calculation
 */
export interface RehabCalculationRequest {
  // Property details
  square_footage: number;
  market_reference_id: number; // Memphis=1, Nashville=2, Knoxville=3
  quality_tier_id?: number; // Optional, can be auto-determined by ARV
  arv?: number; // After Repair Value for auto-tier selection
  
  // Selected categories/items (for detailed calculator)
  selected_categories?: string[]; // Category names like ['kitchen', 'bathroom']
  selected_line_items?: string[]; // Specific line item codes
  
  // Property-specific counts (for per-unit pricing)
  window_count?: number;
  fixture_count?: number; // Plumbing fixtures
  room_count?: number;
}

/**
 * Response for individual line item cost calculation
 */
export interface RehabLineItemCost {
  line_item_code: string;
  line_item_name: string;
  category_name: string;
  pricing_basis: string;
  unit_label: string;
  unit_cost: number;
  quantity: number; // Based on property size, sqft, etc.
  total_cost: number;
  scope?: string;
  specifications?: Record<string, any>;
}

/**
 * Response for category-level cost summary
 */
export interface RehabCategoryCost {
  category_name: string;
  category_display_name: string;
  line_items: RehabLineItemCost[];
  category_total: number;
  sort_order: number;
}

/**
 * Complete rehab calculation response
 */
export interface RehabCalculationResponse {
  // Summary totals
  total_cost: number;
  high_rehab: number; // Higher-end estimate
  
  // Detailed breakdown
  categories: RehabCategoryCost[];
  
  // Calculation metadata
  market_name: string;
  quality_tier_name: string;
  property_size_name: string;
  square_footage: number;
  calculation_date: Date;
}

/**
 * Simple rehab estimate (for existing slider compatibility)
 */
export interface SimpleRehabEstimate {
  highRehab: number;
  condition: string;
}

/**
 * Available options for dropdowns/selectors
 */
export interface RehabCalculatorOptions {
  categories: RehabCategory[];
  quality_tiers: QualityTier[];
  property_sizes: PropertySizeCategory[];
  pricing_basis_types: PricingBasisType[];
}

/**
 * Line items available for a specific category and tier
 */
export interface CategoryLineItems {
  category: RehabCategory;
  line_items: RehabLineItem[];
  applicable_tiers: number[];
} 