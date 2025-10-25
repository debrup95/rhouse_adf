import { query } from '../config/db';
import logger from '../utils/logger';

/**
 * Repository for property condition cost operations
 */
class PropertyConditionRepository {
  /**
   * Get property condition costs for a specific condition
   * This queries the database for low_cost and high_cost based on condition
   * 
   * @param condition The property condition (e.g., 'Good', 'Fair', 'Poor')
   * @returns Condition cost data with low_cost and high_cost per sqft
   */
  async getPropertyConditionCosts(condition: string): Promise<{
    low_cost: number;
    high_cost: number;
    condition: string;
  } | null> {
    try {
      logger.info('Fetching property condition costs', { condition });
      
      const conditionQuery = `
        SELECT 
          property_condition,
          low_cost,
          high_cost
        FROM property_condition_cost
        WHERE property_condition = $1 AND is_active = true
      `;
      
      const result = await query(conditionQuery, [condition]);
      
      if (result.rows.length === 0) {
        logger.warn('No condition cost data found for condition', { condition });
        return null;
      }
      
      const costData = result.rows[0];
      
      logger.info('Found condition cost data', { 
        condition,
        low_cost: costData.low_cost,
        high_cost: costData.high_cost
      });
      
      return {
        condition: costData.property_condition,
        low_cost: parseFloat(costData.low_cost) || 0,
        high_cost: parseFloat(costData.high_cost) || 0
      };
    } catch (error: any) {
      logger.error('Error fetching property condition costs', {
        error: error.message,
        condition
      });
      
      // Return default values on error
      return {
        condition,
        low_cost: 20.0,
        high_cost: 40.0
      };
    }
  }
  
  /**
   * Get default property condition costs when condition is not available
   * 
   * @returns Default condition cost data
   */
  async getDefaultPropertyConditionCosts(): Promise<{
    low_cost: number;
    high_cost: number;
    condition: string;
  }> {
    try {
      const defaultQuery = `
        SELECT 
          property_condition,
          low_cost,
          high_cost
        FROM property_condition_cost
        WHERE property_condition = 'Standard' AND is_active = true
        LIMIT 1
      `;
      
      const result = await query(defaultQuery, []);
      
      if (result.rows.length > 0) {
        const costData = result.rows[0];
        
        return {
          condition: costData.property_condition,
          low_cost: parseFloat(costData.low_cost) || 20.0,
          high_cost: parseFloat(costData.high_cost) || 40.0
        };
      }
      
      const anyConditionQuery = `
        SELECT 
          property_condition,
          low_cost,
          high_cost
        FROM property_condition_cost
        WHERE is_active = true
        LIMIT 1
      `;
      
      const anyResult = await query(anyConditionQuery, []);
      
      if (anyResult.rows.length > 0) {
        const costData = anyResult.rows[0];
        
        return {
          condition: costData.property_condition,
          low_cost: parseFloat(costData.low_cost) || 20.0,
          high_cost: parseFloat(costData.high_cost) || 40.0
        };
      }
      
      // Fallback hard-coded defaults if no data is found
      return {
        condition: 'Default',
        low_cost: 20.0,
        high_cost: 40.0
      };
    } catch (error: any) {
      logger.error('Error fetching default property condition costs', {
        error: error.message
      });
      
      // Return hard-coded defaults on error
      return {
        condition: 'Default',
        low_cost: 20.0,
        high_cost: 40.0
      };
    }
  }
}

export default new PropertyConditionRepository(); 