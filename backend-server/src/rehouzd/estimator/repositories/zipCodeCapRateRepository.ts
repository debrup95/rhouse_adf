import { query } from '../config/db';
import logger from '../utils/logger';

/**
 * Repository for zip code cap rate operations
 */
class ZipCodeCapRateRepository {
  /**
   * Get cap rate for a specific zip code
   * 
   * @param zipCode The zip code (e.g., '38109')
   * @returns Cap rate data for the zip code
   */
  async getZipCodeCapRate(zipCode: string): Promise<number | null> {
    try {
      const zipQuery = `
        SELECT 
          average_cap_rate
        FROM zip_code_cap_rate
        WHERE zip_code = $1
      `;

      logger.info('Fetching zip code cap rate', { zipCode });
      
      const result = await query(zipQuery, [zipCode]);
      
      if (result.rows.length === 0) {
        logger.info('No zip code cap rate found', { zipCode });
        return null;
      }
      
      const zipData = result.rows[0];
      const capRate = parseFloat(zipData.average_cap_rate) || null;
      
      logger.info('Found zip code cap rate', { 
        zipCode,
        average_cap_rate: capRate
      });
      
      return capRate;
    } catch (error: any) {
      logger.error('Error fetching zip code cap rate', {
        error: error.message,
        zipCode
      });
      
      return null;
    }
  }


}

export default new ZipCodeCapRateRepository();
