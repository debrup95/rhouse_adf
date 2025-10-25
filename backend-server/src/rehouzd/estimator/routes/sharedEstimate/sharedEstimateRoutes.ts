import { Router } from 'express';
import {
  createSharedEstimateHandler,
  getSharedEstimateHandler,
  getUserSharedEstimatesHandler,
  deactivateSharedEstimateHandler,
} from '../../controllers/sharedEstimateController';

const router = Router();

// Create a new shared estimate (PDF report)
router.post('/create', createSharedEstimateHandler);

// Get shared estimate by token (public endpoint)
router.get('/:shareToken', getSharedEstimateHandler);

// Get user's shared estimates (authenticated)
router.get('/user/:userId', getUserSharedEstimatesHandler);

// Deactivate shared estimate (authenticated)
router.put('/:shareToken/deactivate', deactivateSharedEstimateHandler);

export default router;
