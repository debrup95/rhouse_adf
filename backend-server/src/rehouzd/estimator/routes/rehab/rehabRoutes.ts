import { Router } from 'express';
import rehabController from '../../controllers/rehabController';

const router = Router();

/**
 * Get rehab calculator data for a property location
 * GET /api/rehab/calculator-data?state=TN&county=Shelby
 * POST /api/rehab/calculator-data (with addressData in body)
 */
router.get('/calculator-data', rehabController.getRehabCalculatorData);
router.post('/calculator-data', rehabController.getRehabCalculatorData);

/**
 * Get rehab calculator data by market ID (faster when market is known)
 * GET /api/rehab/calculator-data/market/:marketId
 */
router.get('/calculator-data/market/:marketId', rehabController.getRehabCalculatorDataByMarket);

/**
 * Calculate tier and size bracket for given property parameters
 * POST /api/rehab/calculate-parameters
 * Body: { afterRepairValue: number, squareFootage: number }
 */
router.post('/calculate-parameters', rehabController.calculateParameters);

/**
 * Cache management endpoints
 */
router.delete('/cache/:marketId?', rehabController.clearCache);
router.get('/cache/stats', rehabController.getCacheStats);

export default router; 