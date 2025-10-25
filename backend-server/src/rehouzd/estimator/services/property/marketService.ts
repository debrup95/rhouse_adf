import marketRepository from '../../repositories/marketRepository';
import zipCodeCapRateRepository from '../../repositories/zipCodeCapRateRepository';
import logger from '../../utils/logger';
import { query } from '../../config/db';

/**
 * Service for market data operations
 */
class MarketService {
  /**
   * Get market underwrite inputs for a specific location
   * 
   * @param state The state abbreviation (e.g., 'FL')
   * @param county The county name (e.g., 'Lake')
   * @param zipCode Optional zip code for more granular cap rate lookup
   * @returns Market data with cap_rate and operating_expense
   */
  async getMarketUnderwriteInputs(state: string, county: string, zipCode?: string): Promise<{
    cap_rate: number;
    operating_expense: number;
    reference_market: string;
  }> {
    try {
      // Normalize inputs
      const normalizedState = state.trim().toUpperCase();
      const normalizedCounty = county.trim();
      const normalizedZipCode = zipCode?.trim();
      
      logger.info('Getting market underwrite inputs', { 
        state: normalizedState, 
        county: normalizedCounty,
        zipCode: normalizedZipCode 
      });
      
      // Get market data from repository for operating expense and default cap rate
      const marketData = await marketRepository.getMarketUnderwriteInputs(normalizedState, normalizedCounty);
      
      let capRate = 8.0; // Default fallback
      let operatingExpense = 40.0; // Default fallback
      let referenceMarket = 'Default';
      
      // Set defaults from market data if available
      if (marketData) {
        capRate = marketData.cap_rate;
        operatingExpense = marketData.operating_expense;
        referenceMarket = marketData.reference_market;
      } else {
        // If no market data found, try to get default values
        logger.info('No market data found for location, using defaults', { 
          state: normalizedState, 
          county: normalizedCounty 
        });
        
        const defaultMarketData = await marketRepository.getDefaultMarketUnderwriteInputs();
        capRate = defaultMarketData.cap_rate;
        operatingExpense = defaultMarketData.operating_expense;
        referenceMarket = defaultMarketData.reference_market;
      }
      
      // Try to get zip code specific cap rate to override the default
      if (normalizedZipCode) {
        const zipCapRate = await zipCodeCapRateRepository.getZipCodeCapRate(normalizedZipCode);
        
        if (zipCapRate !== null) {
          capRate = zipCapRate;
          logger.info('Using zip code specific cap rate', {
            zipCode: normalizedZipCode,
            cap_rate: capRate
          });
        } else {
          logger.info('No zip code cap rate found, using fallback', {
            zipCode: normalizedZipCode,
            fallback_cap_rate: capRate
          });
        }
      }
      
      return {
        cap_rate: capRate,
        operating_expense: operatingExpense,
        reference_market: referenceMarket
      };
    } catch (error: any) {
      logger.error('Error getting market underwrite inputs', {
        error: error.message,
        state,
        county,
        zipCode
      });
      
      // Return default values on error
      return {
        cap_rate: 8.0,
        operating_expense: 40.0,
        reference_market: 'Default (Error Fallback)'
      };
    }
  }

  /**
   * Get market flip calculation inputs
   * 
   * @returns Market calculation reference data with interest_rate, total_closing_holding_costs, and margin_percentage
   */
  async getMarketFlipCalculationInputs(): Promise<{
    interest_rate: number;
    total_closing_holding_costs: number;
    margin_percentage: number;
    commission_rate: number;
  }> {
    try {
      logger.info('Getting market flip calculation inputs');
      
      // Get calculation reference data from repository
      const referenceData = await marketRepository.getMarketCalculationReference();
      
      // Return the data
      return referenceData;
    } catch (error: any) {
      logger.error('Error getting market flip calculation inputs', {
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

  /**
   * Get count of home sales in a specific zip code for the last 12 months
   * 
   * @param zipCode The zip code to search for (e.g., '38127')
   * @returns The count of home sales in the last 12 months
   */
  async getHomesSoldCount(zipCode: string): Promise<number> {
    try {
      logger.info('Getting homes sold count for zip code', { zipCode });
      
      // Validate zip code
      if (!zipCode || zipCode.length < 5) {
        logger.warn('Invalid zip code provided', { zipCode });
        return 0;
      }

      const queryText = `
        SELECT COUNT(*) AS sales_count
        FROM property_sales
        WHERE zip_code = $1
        AND sale_date BETWEEN NOW() - INTERVAL '12 months' AND NOW()
        --AND sale_price > 0;
      `;
      
      const result = await query(queryText, [zipCode]);
      const salesCount = parseInt(result.rows[0]?.sales_count || '0', 10);
      
      logger.info('Retrieved homes sold count', { zipCode, salesCount });
      
      return salesCount;
    } catch (error: any) {
      logger.error('Error getting homes sold count', {
        error: error.message,
        zipCode
      });
      
      // Return 0 on error
      return 0;
    }
  }
}

export default new MarketService(); 