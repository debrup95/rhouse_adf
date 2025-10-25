import { query } from '../config/db';
import logger from '../utils/logger';

/**
 * Repository for market data operations
 */
class MarketRepository {
  /**
   * Get market underwrite inputs for a specific location
   * This queries the database for cap_rate and operating_expense based on state and county
   * 
   * @param state The state abbreviation (e.g., 'FL')
   * @param county The county name (e.g., 'Lake')
   * @returns Market data with cap_rate and operating_expense
   */
  async getMarketUnderwriteInputs(state: string, county: string): Promise<{
    cap_rate: number;
    operating_expense: number;
    reference_market: string;
  } | null> {
    try {
      const marketQuery = `
        SELECT 
          mrc.market_reference_id,
          mr.name AS reference_market,
          mui.cap_rate,
          mui.operating_expense
        FROM market_reference_counties mrc
        JOIN market_reference mr
          ON mrc.market_reference_id = mr.id
        JOIN market_underwrite_inputs mui
          ON mrc.market_reference_id = mui.market_reference_id
        WHERE mrc.state = $1 AND mrc.county = $2
      `;

      const shortCounty = county.split(' County')[0];

      logger.info('Fetching market underwrite inputs', { shortCounty, state });
      
      const result = await query(marketQuery, [state, shortCounty]);
      
      if (result.rows.length === 0) {
        logger.warn('No market data found for location', { state, shortCounty });
        return null;
      }
      
      const marketData = result.rows[0];
      
      logger.info('Found market data', { 
        state, 
        county,
        market: marketData.reference_market,
        cap_rate: marketData.cap_rate,
        operating_expense: marketData.operating_expense
      });
      
      return {
        cap_rate: parseFloat(marketData.cap_rate) || 0,
        operating_expense: parseFloat(marketData.operating_expense) || 0,
        reference_market: marketData.reference_market
      };
    } catch (error: any) {
      logger.error('Error fetching market underwrite inputs', {
        error: error.message,
        state,
        county
      });
      
      // Return default values on error
      return {
        cap_rate: 8.0,
        operating_expense: 40.0,
        reference_market: 'Default'
      };
    }
  }
  
  /**
   * Get default market underwrite inputs when location data is not available
   * 
   * @returns Default market data
   */
  async getDefaultMarketUnderwriteInputs(): Promise<{
    cap_rate: number;
    operating_expense: number;
    reference_market: string;
  }> {
    try {
      // Try to get the most common market data as default
      const defaultQuery = `
        SELECT 
          mr.name AS reference_market,
          mui.cap_rate,
          mui.operating_expense
        FROM market_underwrite_inputs mui
        JOIN market_reference mr
          ON mui.market_reference_id = mr.id
        ORDER BY mui.id
        LIMIT 1
      `;
      
      const result = await query(defaultQuery, []);
      
      if (result.rows.length > 0) {
        const marketData = result.rows[0];
        
        return {
          cap_rate: parseFloat(marketData.cap_rate) || 8.0,
          operating_expense: parseFloat(marketData.operating_expense) || 40.0,
          reference_market: marketData.reference_market || 'Default'
        };
      }
      
      // Fallback hard-coded defaults if no data is found
      return {
        cap_rate: 8.0,
        operating_expense: 40.0,
        reference_market: 'Default'
      };
    } catch (error: any) {
      logger.error('Error fetching default market underwrite inputs', {
        error: error.message
      });
      
      // Return hard-coded defaults on error
      return {
        cap_rate: 8.0,
        operating_expense: 40.0,
        reference_market: 'Default'
      };
    }
  }

  /**
   * Get market calculation reference data
   * 
   * @returns Market calculation reference data with interest_rate, total_closing_holding_costs, and margin_percentage
   */
  async getMarketCalculationReference(): Promise<{
    interest_rate: number;
    total_closing_holding_costs: number;
    margin_percentage: number;
    commission_rate: number;
  }> {
    try {
      logger.info('Fetching market calculation reference data');
      
      const referenceQuery = `
        SELECT 
          interest_rate,
          total_closing_holding_costs,
          margin_percentage,
          commission_rate
        FROM market_calculation_reference
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await query(referenceQuery, []);
      
      if (result.rows.length === 0) {
        logger.warn('No market calculation reference data found, using defaults');
        return {
          interest_rate: 7.0,
          total_closing_holding_costs: 4.0,
          margin_percentage: 20.0,
          commission_rate: 6.0
        };
      }
      
      const referenceData = result.rows[0];
      
      // logger.info('Found market calculation reference data', { 
      //   interest_rate: referenceData.interest_rate,
      //   total_closing_holding_costs: referenceData.total_closing_holding_costs,
      //   margin_percentage: referenceData.margin_percentage
      // });
      
      return {
        interest_rate: parseFloat(referenceData.interest_rate) || 7.0,
        total_closing_holding_costs: parseFloat(referenceData.total_closing_holding_costs) || 4.0,
        margin_percentage: parseFloat(referenceData.margin_percentage) || 20.0,
        commission_rate: parseFloat(referenceData.commission_rate) || 6.0
      };
    } catch (error: any) {
      logger.error('Error fetching market calculation reference data', {
        error: error.message
      });
      
      // Return default values on error
      return {
        interest_rate: 7.0,
        total_closing_holding_costs: 4.0,
        margin_percentage: 20.0,
        commission_rate: 6.0
      };
    }
  }
}

export default new MarketRepository(); 