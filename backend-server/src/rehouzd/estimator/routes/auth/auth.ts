import { Router } from 'express';
import * as authController from '../../controllers/authController';
import logger from '../../utils/logger';

const router = Router();

// Add request logging middleware for all auth routes
router.use((req, res, next) => {
  logger.info(`[AUTH_ROUTE] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.method === 'POST' ? { ...req.body, password: '[REDACTED]' } : undefined,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'referer': req.headers['referer']
    },
    timestamp: new Date().toISOString()
  });
  next();
});

// Auth
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.post('/profile-update', authController.updateProfile);

// OTP-based password reset endpoints
router.post('/request-password-reset-otp', authController.requestPasswordResetOTP);
router.post('/verify-password-reset-otp', authController.verifyPasswordResetOTP);
router.post('/reset-password-with-otp', authController.resetPasswordWithOTP);

// Google OAuth endpoints
router.get('/google', authController.googleAuthInitiate);
router.get('/google/callback', authController.googleAuthCallback);

export default router;
