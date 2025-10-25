import { Router } from 'express';
import skipTraceController from '../../controllers/skipTraceController';

const router = Router();

// Credit balance endpoint (with userId parameter like credit system)
router.get('/credits/balance/:userId', skipTraceController.getCreditBalance);

// Skip trace lookup endpoint
router.post('/lookup', skipTraceController.performSkipTrace);

// Skip trace history endpoint
router.get('/history/:userId', skipTraceController.getSkipTraceHistory);

// Get specific skip trace result
router.get('/result/:lookupId', skipTraceController.getSkipTraceResult);

// Skip trace statistics
router.get('/stats', skipTraceController.getSkipTraceStats);

export default router; 