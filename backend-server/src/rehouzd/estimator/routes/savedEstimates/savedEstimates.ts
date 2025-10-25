import { Router } from 'express';
import { 
  saveEstimateHandler, 
  getSavedEstimatesHandler, 
  getSavedEstimateByIdHandler, 
  deleteSavedEstimateHandler, 
  searchSavedEstimatesHandler,
  updateSavedEstimateHandler
} from '../../controllers/savedEstimateController';

const router = Router();

// Save an estimate
router.post('/', saveEstimateHandler);

// Get all saved estimates for a user
router.get('/user/:userId', getSavedEstimatesHandler);

// Search saved estimates by address
router.get('/search/:userId', searchSavedEstimatesHandler);

// Get a specific saved estimate by ID
router.get('/:estimateId', getSavedEstimateByIdHandler);

// Update a saved estimate
router.put('/:estimateId', updateSavedEstimateHandler);

// Delete a saved estimate
router.delete('/:estimateId', deleteSavedEstimateHandler);

export default router; 