import { Router } from 'express';
import emailVerificationController from '../../controllers/emailVerificationController';

const router = Router();

// Verify an email address for a buyer
router.post('/verify', emailVerificationController.verifyEmail);

// Get email verification stats for a buyer
router.get('/stats/:buyerName', emailVerificationController.getEmailVerificationStats);

// Get user's email verification history
router.get('/user-history/:userId', emailVerificationController.getUserEmailVerificationHistory);

export default router;