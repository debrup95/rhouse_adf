import propertyConditionRepository from '../../repositories/propertyConditionRepository';
import logger from '../../utils/logger';

/**
 * Service for property condition cost operations
 */
class PropertyConditionService {
  /**
   * Get property condition costs for a specific condition
   * 
   * @param condition The property condition (e.g., 'Good', 'Fair', 'Poor')
   * @returns Condition cost data with low_cost and high_cost per sqft
   */
  async getPropertyConditionCosts(condition: string): Promise<{
    low_cost: number;
    high_cost: number;
    condition: string;
  }> {
    try {
      // Normalize input
      const normalizedCondition = condition.trim();
      
      logger.info('Getting property condition costs', { condition: normalizedCondition });
      
      // Get condition cost data from repository
      const costData = await propertyConditionRepository.getPropertyConditionCosts(normalizedCondition);
      
      // If condition cost data found, return it
      if (costData) {
        return costData;
      }
      
      // If no condition cost data found, try to get default values
      logger.info('No condition cost data found for condition, using defaults', { 
        condition: normalizedCondition
      });
      
      return await propertyConditionRepository.getDefaultPropertyConditionCosts();
    } catch (error: any) {
      logger.error('Error getting property condition costs', {
        error: error.message,
        condition
      });
      
      // Return default values on error
      return {
        condition: 'Default (Error Fallback)',
        low_cost: 20.0,
        high_cost: 40.0
      };
    }
  }
  
  /**
   * Calculate rehab costs based on condition and square footage
   * 
   * @param condition The property condition (e.g., 'Good', 'Fair', 'Poor')
   * @param squareFootage The square footage of the property
   * @returns Calculated low and high rehab costs in thousands (k)
   */
  async calculateRehabCosts(condition: string, squareFootage: number): Promise<{
    highRehab: number;
    condition: string;
  }> {
    try {
      // Get cost per square foot for the condition
      const costData = await this.getPropertyConditionCosts(condition);
      
      // If square footage is invalid, return default values
      if (!squareFootage || squareFootage <= 0) {
        logger.warn('Invalid square footage provided', { squareFootage });
        return {
          highRehab: 0, // Default 0
          condition: costData.condition
        };
      }

      if(condition.toLowerCase() === 'standard') {
        return {
          highRehab: costData.high_cost,
          condition: costData.condition
        };
      }
      
      const highRehab = Math.round((costData.high_cost * squareFootage));
      
      logger.info('Calculated rehab costs', {
        condition: costData.condition,
        squareFootage,
        highRehabPerSqft: costData.high_cost,
        highRehab: `${highRehab}k`
      });
      
      return {
        highRehab,
        condition: costData.condition
      };
    } catch (error: any) {
      logger.error('Error calculating rehab costs', {
        error: error.message,
        condition,
        squareFootage
      });
      
      // Return default values on error
      return {
        highRehab: 0, // Default 0
        condition: 'Default (Error Fallback)'
      };
    }
  }
}

export default new PropertyConditionService(); 