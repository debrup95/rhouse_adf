import { Router } from 'express';
import * as specialistController from '../../controllers/specialistController';

const router = Router();

// Get all specialist calls
router.get('/', specialistController.getAllSpecialistCalls);

// Get latest specialist calls (one per user)
router.get('/latest', specialistController.getLatestSpecialistCalls);

// Create a new specialist call request (handles both standard and frontend formats)
router.post('/', specialistController.requestSpecialistCall);

export default router; 