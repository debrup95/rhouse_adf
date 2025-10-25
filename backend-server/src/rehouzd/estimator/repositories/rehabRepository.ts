import { query } from '../config/db';
import logger from '../utils/logger';
import {
  RehabCategory,
  QualityTier,
  PropertySizeCategory,
  PricingBasisType,
  RehabLineItem,
  RehabCost,
  RehabCalculatorOptions
} from '../models/rehab/rehabModels';

/**
 * Repository for rehab cost data operations
 */
class RehabRepository {

  /**
   * Get all rehab categories with their line items
   */
  async getRehabCategories(): Promise<RehabCategory[]> {
    const queryText = `
      SELECT id, name, display_name, description, sort_order, active, created_at
      FROM rehab_categories 
      WHERE active = true 
      ORDER BY sort_order ASC, name ASC
    `;
    
    try {
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching rehab categories:', error);
      throw error;
    }
  }

  /**
   * Get quality tiers
   */
  async getQualityTiers(): Promise<QualityTier[]> {
    const queryText = `
      SELECT id, tier_number, name, description, created_at
      FROM quality_tiers 
      ORDER BY tier_number ASC
    `;
    
    try {
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching quality tiers:', error);
      throw error;
    }
  }

  /**
   * Get property size categories
   */
  async getPropertySizeCategories(): Promise<PropertySizeCategory[]> {
    const queryText = `
      SELECT id, name, sqft_min, sqft_max, description, created_at
      FROM property_size_categories 
      ORDER BY sqft_min ASC
    `;
    
    try {
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching property size categories:', error);
      throw error;
    }
  }

  /**
   * Get pricing basis types
   */
  async getPricingBasisTypes(): Promise<PricingBasisType[]> {
    const queryText = `
      SELECT id, code, name, description, unit_label, created_at
      FROM pricing_basis_types 
      ORDER BY name ASC
    `;
    
    try {
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching pricing basis types:', error);
      throw error;
    }
  }

  /**
   * Get rehab line items with their categories and pricing basis
   */
  async getRehabLineItems(): Promise<any[]> {
    const queryText = `
      SELECT 
        rli.id, rli.category_id, rli.name, rli.code, rli.description, rli.scope,
        rli.pricing_basis_id, rli.applies_to_tiers, rli.applies_to_sizes,
        rli.specifications, rli.sort_order, rli.is_required, rli.active, rli.created_at,
        rc.name as category_name, rc.display_name as category_display_name,
        pbt.code as pricing_basis_code, pbt.name as pricing_basis_name, pbt.unit_label
      FROM rehab_line_items rli
      JOIN rehab_categories rc ON rli.category_id = rc.id
      JOIN pricing_basis_types pbt ON rli.pricing_basis_id = pbt.id
      WHERE rli.active = true AND rc.active = true
      ORDER BY rc.sort_order ASC, rli.sort_order ASC, rli.name ASC
    `;
    
    try {
      const result = await query(queryText);
      return result.rows.map(row => ({
        id: row.id,
        category_id: row.category_id,
        name: row.name,
        code: row.code,
        description: row.description,
        scope: row.scope,
        pricing_basis_id: row.pricing_basis_id,
        applies_to_tiers: row.applies_to_tiers,
        applies_to_sizes: row.applies_to_sizes,
        specifications: row.specifications,
        sort_order: row.sort_order,
        is_required: row.is_required,
        active: row.active,
        created_at: row.created_at,
        category: {
          id: row.category_id,
          name: row.category_name,
          display_name: row.category_display_name
        },
        pricing_basis: {
          id: row.pricing_basis_id,
          code: row.pricing_basis_code,
          name: row.pricing_basis_name,
          unit_label: row.unit_label
        }
      }));
    } catch (error) {
      logger.error('Error fetching rehab line items:', error);
      throw error;
    }
  }

  /**
   * Get rehab costs for a specific market
   * This is the core data needed for calculations
   */
  async getRehabCostsForMarket(marketReferenceId: number): Promise<any[]> {
    const queryText = `
      SELECT 
        rc.id, rc.line_item_id, rc.market_reference_id, rc.quality_tier_id, rc.property_size_id,
        rc.cost_amount, rc.effective_date, rc.expires_date, rc.notes, rc.data_source,
        rc.created_at, rc.updated_at,
        rli.code as line_item_code, rli.name as line_item_name,
        rcat.name as category_name, rcat.display_name as category_display_name,
        pbt.code as pricing_basis_code, pbt.unit_label,
        qt.tier_number, qt.name as tier_name,
        psc.name as size_name, psc.sqft_min, psc.sqft_max
      FROM rehab_costs rc
      JOIN rehab_line_items rli ON rc.line_item_id = rli.id
      JOIN rehab_categories rcat ON rli.category_id = rcat.id
      JOIN pricing_basis_types pbt ON rli.pricing_basis_id = pbt.id
      JOIN quality_tiers qt ON rc.quality_tier_id = qt.id
      JOIN property_size_categories psc ON rc.property_size_id = psc.id
      WHERE rc.market_reference_id = $1
        AND rli.active = true 
        AND rcat.active = true
        AND (rc.expires_date IS NULL OR rc.expires_date > CURRENT_DATE)
        AND rc.effective_date <= CURRENT_DATE
      ORDER BY rcat.sort_order ASC, rli.sort_order ASC, qt.tier_number ASC, psc.sqft_min ASC
    `;
    
    try {
      const result = await query(queryText, [marketReferenceId]);
      return result.rows.map(row => ({
        id: row.id,
        line_item_id: row.line_item_id,
        market_reference_id: row.market_reference_id,
        quality_tier_id: row.quality_tier_id,
        property_size_id: row.property_size_id,
        cost_amount: parseFloat(row.cost_amount),
        effective_date: row.effective_date,
        expires_date: row.expires_date,
        notes: row.notes,
        data_source: row.data_source,
        created_at: row.created_at,
        updated_at: row.updated_at,
        line_item: {
          id: row.line_item_id,
          code: row.line_item_code,
          name: row.line_item_name,
          category: {
            name: row.category_name,
            display_name: row.category_display_name
          },
          pricing_basis: {
            code: row.pricing_basis_code,
            unit_label: row.unit_label
          }
        },
        quality_tier: {
          id: row.quality_tier_id,
          tier_number: row.tier_number,
          name: row.tier_name
        },
        property_size: {
          id: row.property_size_id,
          name: row.size_name,
          sqft_min: row.sqft_min,
          sqft_max: row.sqft_max
        }
      }));
    } catch (error) {
      logger.error('Error fetching rehab costs for market:', error);
      throw error;
    }
  }

  /**
   * Get rehab costs for a specific market and property size (OPTIMIZED)
   * This only pulls the relevant size bracket data, reducing database load
   * Fixed costs (like HVAC repair/replace unit) are included regardless of property size
   */
  async getRehabCostsForMarketAndSize(marketReferenceId: number, squareFootage: number): Promise<any[]> {
    // Determine the size bracket based on square footage
    let sizeBracket = '';
    if (squareFootage < 1400) {
      sizeBracket = 'Small';
    } else if (squareFootage <= 2400) {
      sizeBracket = 'Medium';
    } else {
      sizeBracket = 'Large';
    }

    const queryText = `
      SELECT 
        rc.id, rc.line_item_id, rc.market_reference_id, rc.quality_tier_id, rc.property_size_id,
        rc.cost_amount, rc.effective_date, rc.expires_date, rc.notes, rc.data_source,
        rc.created_at, rc.updated_at,
        rli.code as line_item_code, rli.name as line_item_name,
        rcat.name as category_name, rcat.display_name as category_display_name,
        pbt.code as pricing_basis_code, pbt.unit_label,
        qt.tier_number, qt.name as tier_name,
        psc.name as size_name, psc.sqft_min, psc.sqft_max
      FROM rehab_costs rc
      JOIN rehab_line_items rli ON rc.line_item_id = rli.id
      JOIN rehab_categories rcat ON rli.category_id = rcat.id
      JOIN pricing_basis_types pbt ON rli.pricing_basis_id = pbt.id
      JOIN quality_tiers qt ON rc.quality_tier_id = qt.id
      JOIN property_size_categories psc ON rc.property_size_id = psc.id
      WHERE rc.market_reference_id = $1
        AND rli.active = true 
        AND rcat.active = true
        AND (rc.expires_date IS NULL OR rc.expires_date > CURRENT_DATE)
        AND rc.effective_date <= CURRENT_DATE
        AND (
          psc.name = $2 
          OR pbt.code = 'fixed_fee'
        )
      ORDER BY rcat.sort_order ASC, rli.sort_order ASC, qt.tier_number ASC
    `;
    
    try {
      const result = await query(queryText, [marketReferenceId, sizeBracket]);
      logger.info(`Optimized rehab costs query: Found ${result.rows.length} records for ${squareFootage} sqft property (${sizeBracket})`);

      return result.rows.map(row => ({
        id: row.id,
        line_item_id: row.line_item_id,
        market_reference_id: row.market_reference_id,
        quality_tier_id: row.quality_tier_id,
        property_size_id: row.property_size_id,
        cost_amount: parseFloat(row.cost_amount),
        effective_date: row.effective_date,
        expires_date: row.expires_date,
        notes: row.notes,
        data_source: row.data_source,
        created_at: row.created_at,
        updated_at: row.updated_at,
        line_item: {
          id: row.line_item_id,
          code: row.line_item_code,
          name: row.line_item_name,
          category: {
            name: row.category_name,
            display_name: row.category_display_name
          },
          pricing_basis: {
            code: row.pricing_basis_code,
            unit_label: row.unit_label
          }
        },
        quality_tier: {
          id: row.quality_tier_id,
          tier_number: row.tier_number,
          name: row.tier_name
        },
        property_size: {
          id: row.property_size_id,
          name: row.size_name,
          sqft_min: row.sqft_min,
          sqft_max: row.sqft_max
        }
      }));
    } catch (error) {
      logger.error('Error fetching optimized rehab costs for market and size:', error);
      throw error;
    }
  }

  /**
   * Get all calculator options for dropdowns/selectors
   */
  async getRehabCalculatorOptions(): Promise<RehabCalculatorOptions> {
    try {
      const [categories, qualityTiers, propertySizes, pricingBasisTypes] = await Promise.all([
        this.getRehabCategories(),
        this.getQualityTiers(),
        this.getPropertySizeCategories(),
        this.getPricingBasisTypes()
      ]);

      return {
        categories,
        quality_tiers: qualityTiers,
        property_sizes: propertySizes,
        pricing_basis_types: pricingBasisTypes
      };
    } catch (error) {
      logger.error('Error fetching rehab calculator options:', error);
      throw error;
    }
  }

  /**
   * Get market reference ID by state and county
   * Helper method to find the correct market for cost lookups
   */
  async getMarketReferenceId(state: string, county: string): Promise<number | null> {
    // Clean the county name - remove " County" suffix if it exists
    const cleanCounty = county.replace(/\s+county$/i, '').trim();
    
    const queryText = `
      SELECT mr.id
      FROM market_reference mr
      JOIN market_reference_counties mrc ON mr.id = mrc.market_reference_id
      WHERE LOWER(mrc.state) = LOWER($1)
        AND (LOWER(mrc.county) = LOWER($2) OR LOWER(mrc.county) = LOWER($3))
      LIMIT 1
    `;
    
    try {
      const result = await query(queryText, [state, county, cleanCounty]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
      logger.error('Error fetching market reference ID:', error);
      throw error;
    }
  }

  /**
   * Get market name by reference ID
   */
  async getMarketName(marketReferenceId: number): Promise<string> {
    const queryText = `
      SELECT name
      FROM market_reference
      WHERE id = $1
    `;
    
    try {
      const result = await query(queryText, [marketReferenceId]);
      return result.rows.length > 0 ? result.rows[0].name : 'Unknown Market';
    } catch (error) {
      logger.error('Error fetching market name:', error);
      return 'Unknown Market';
    }
  }
}

export default new RehabRepository(); 