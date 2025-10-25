import { Router } from 'express';
import signupHandler from '../auth/signUpController';
import loginHandler from '../auth/loginController';
import {requestPasswordReset, resetPassword} from "../auth/passwordReset";
import {googleAuthCallback, googleAuthInitiate} from "../auth/googleAuthController";
import updateUserProfile from "../auth/updateUserProfile";


const router = Router();

// Auth
router.post('/signup', signupHandler);
router.post('/login', loginHandler);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/profile-update', updateUserProfile);

// Google OAuth endpoints
router.get('/google', googleAuthInitiate);
router.get('/google/callback', googleAuthCallback);

export default router;
