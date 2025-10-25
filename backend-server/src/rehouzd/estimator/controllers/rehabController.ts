import { Request, Response } from 'express';
import rehabService from '../services/rehab/rehabService';
import logger from '../utils/logger';

/**
 * Helper function to add no-cache headers to responses
 */
const addNoCacheHeaders = (res: Response): void => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
};

/**
 * Controller for rehab calculator endpoints
 */
class RehabController {

  /**
   * Get rehab calculator data for a property location
   * GET /api/rehab/calculator-data?state=TN&county=Shelby
   * Or POST with addressData in body
   */
  getRehabCalculatorData = async (req: Request, res: Response): Promise<void> => {
    try {
      addNoCacheHeaders(res);
      
      // Extract location data from query params or body
      let state: string;
      let county: string;
      let squareFootage: number | undefined;
      
      if (req.method === 'GET') {
        state = req.query.state as string;
        county = req.query.county as string;
        squareFootage = req.query.squareFootage ? parseInt(req.query.squareFootage as string) : undefined;
      } else {
        // POST request with addressData in body
        const { addressData } = req.body;
        state = addressData?.state_abbreviation || addressData?.state || '';
        county = addressData?.county || '';
        // Ensure squareFootage is a number
        const rawSquareFootage = addressData?.square_footage || addressData?.squareFootage;
        squareFootage = typeof rawSquareFootage === 'number' ? rawSquareFootage : 
                       typeof rawSquareFootage === 'string' ? parseInt(rawSquareFootage) : undefined;
      }
      
      if (!state || !county) {
        res.status(400).json({
          success: false,
          message: 'State and county are required',
          error: 'Missing location parameters'
        });
        return;
      }
      
      logger.info('Getting rehab calculator data', { state, county, squareFootage });
      
      const calculatorData = await rehabService.getRehabCalculatorData(state, county, squareFootage);
      
      if (!calculatorData) {
        res.status(404).json({
          success: false,
          message: 'No rehab cost data found for this location',
          error: 'Market not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: calculatorData,
        meta: {
          cacheStats: rehabService.getCacheStats(),
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Error in getRehabCalculatorData', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to load rehab calculator data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get rehab calculator data by market ID (faster when market is known)
   * GET /api/rehab/calculator-data/market/:marketId
   */
  getRehabCalculatorDataByMarket = async (req: Request, res: Response): Promise<void> => {
    try {
      addNoCacheHeaders(res);
      
      const marketId = parseInt(req.params.marketId);
      
      if (isNaN(marketId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid market ID',
          error: 'Market ID must be a number'
        });
        return;
      }
      
      logger.info('Getting rehab calculator data by market ID', { marketId });
      
      const calculatorData = await rehabService.getRehabCalculatorDataByMarketId(marketId);
      
      if (!calculatorData) {
        res.status(404).json({
          success: false,
          message: 'No rehab cost data found for this market',
          error: 'Market data not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: calculatorData,
        meta: {
          cacheStats: rehabService.getCacheStats(),
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Error in getRehabCalculatorDataByMarket', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to load rehab calculator data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Calculate tier and size bracket for given property parameters
   * POST /api/rehab/calculate-parameters
   * Body: { afterRepairValue: number, squareFootage: number }
   */
  calculateParameters = async (req: Request, res: Response): Promise<void> => {
    try {
      addNoCacheHeaders(res);
      
      const { afterRepairValue, squareFootage } = req.body;
      
      if (typeof afterRepairValue !== 'number' || typeof squareFootage !== 'number') {
        res.status(400).json({
          success: false,
          message: 'afterRepairValue and squareFootage must be numbers',
          error: 'Invalid parameters'
        });
        return;
      }
      
      const tier = rehabService.determineTier(afterRepairValue);
      const sizeBracket = rehabService.determineSizeBracket(squareFootage);
      
      res.json({
        success: true,
        data: {
          tier,
          sizeBracket,
          afterRepairValue,
          squareFootage,
          tierRule: {
            1: { min: 0, max: 200000 },
            2: { min: 200000, max: 400000 },
            3: { min: 400000, max: Infinity }
          }[tier],
          sizeBracketRule: {
            Small: { min: 0, max: 1400 },
            Medium: { min: 1400, max: 2400 },
            Large: { min: 2400, max: Infinity }
          }[sizeBracket]
        }
      });
      
    } catch (error) {
      logger.error('Error in calculateParameters', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to calculate parameters',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Clear cache for testing or data updates
   * DELETE /api/rehab/cache/:marketId (optional marketId)
   */
  clearCache = async (req: Request, res: Response): Promise<void> => {
    try {
      const marketId = req.params.marketId ? parseInt(req.params.marketId) : undefined;
      
      if (req.params.marketId && isNaN(marketId!)) {
        res.status(400).json({
          success: false,
          message: 'Invalid market ID',
          error: 'Market ID must be a number'
        });
        return;
      }
      
      rehabService.clearCache(marketId);
      
      res.json({
        success: true,
        message: marketId 
          ? `Cache cleared for market ${marketId}` 
          : 'All rehab cache cleared',
        data: {
          clearedMarket: marketId || 'all',
          cacheStats: rehabService.getCacheStats()
        }
      });
      
    } catch (error) {
      logger.error('Error in clearCache', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to clear cache',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get cache statistics for monitoring
   * GET /api/rehab/cache/stats
   */
  getCacheStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = rehabService.getCacheStats();
      
      res.json({
        success: true,
        data: {
          ...stats,
          expiryTimeMs: 30 * 60 * 1000, // 30 minutes
          currentTime: Date.now()
        }
      });
      
    } catch (error) {
      logger.error('Error in getCacheStats', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to get cache stats',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export default new RehabController(); 