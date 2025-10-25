import { Router } from 'express';
import phoneVerificationController from '../../controllers/phoneVerificationController';

const router = Router();

// Verify a phone number for a buyer
router.post('/verify', phoneVerificationController.verifyPhone);

// Get phone verification stats for a buyer
router.get('/stats/:buyerName', phoneVerificationController.getPhoneVerificationStats);

// Get user's verification history
router.get('/user-history/:userId', phoneVerificationController.getUserVerificationHistory);

export default router; 