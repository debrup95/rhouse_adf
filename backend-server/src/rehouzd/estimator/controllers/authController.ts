import { Request, Response, NextFunction, RequestHandler } from 'express';
import passport from 'passport';
import * as authService from '../services/auth/authService';
import * as otpService from '../services/auth/otpService';
import * as acsEmailService from '../services/acsEmailService';
import * as authModel from '../models/auth/authModel';
import logger from '../utils/logger';

const ENV = process.env.NODE_ENV || "local";

// Login controller
export const login: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  try {
    const result = await authService.loginUser(email, password);
    
    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }
    
    res.json({ 
      message: 'Login successful.', 
      token: result.token, 
      user: result.user 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// Signup controller
export const signup: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { firstName, lastName, email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  try {
    const result = await authService.registerUser(firstName, lastName, email, password);
    
    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }
    
    res.status(201).json({ message: 'User created successfully.', user: result.user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

// Update user profile controller
export const updateProfile: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { user_id, email, first_name, last_name, mobile_number } = req.body;

  if (!user_id) {
    res.status(400).json({ message: 'User id is required.' });
    return;
  }

  try {
    const result = await authService.updateUserProfile(user_id, { email, first_name, last_name, mobile_number });
    
    if (!result.success) {
      res.status(result.code || 400).json({ message: result.message });
      return;
    }
    
    res.status(200).json({
      message: 'Profile updated successfully.',
      user: result.user,
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error during profile update.' });
  }
};

// Password reset request controller
export const requestPasswordReset: RequestHandler = async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400).json({ message: 'Email is required.' });
    return;
  }
  
  try {
    const result = await authService.createPasswordResetToken(email);
    
    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }
    
    res.json({ message: 'Password reset token generated.', token: result.token });
  } catch (err) {
    console.error('Request password reset error:', err);
    res.status(500).json({ message: 'Server error during password reset request.' });
  }
};

// Reset password controller
export const resetPassword: RequestHandler = async (req, res, next) => {
  const { email, token, newPassword } = req.body;
  
  if (!email || !token || !newPassword) {
    res.status(400).json({ message: 'Email, token, and new password are required.' });
    return;
  }
  
  try {
    const result = await authService.resetUserPassword(email, token, newPassword);
    
    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }
    
    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error during password reset.' });
  }
};

// ===============================
// OTP-Based Password Reset Controllers
// ===============================

// Request OTP for password reset
export const requestPasswordResetOTP: RequestHandler = async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400).json({ message: 'Email is required.' });
    return;
  }

  try {
    logger.info(`Password reset OTP requested for email: ${email}`);
    
    // Check if user exists
    const user = await authModel.getUserByEmail(email);
    if (!user) {
      // Return explicit error when user doesn't exist
      res.status(404).json({ 
        message: 'User with this email address does not exist.',
        success: false 
        });
      return;
    }

    // Generate OTP
    const otp = otpService.generateOTP();
    
    // Store OTP in database
    await otpService.storeOTP(email, otp);
    
    // Send OTP via ACS email
    await acsEmailService.sendPasswordResetOTP(
      email, 
      otp, 
      user.first_name || user.username
    );
    
    logger.info(`Password reset OTP sent successfully to: ${email}`);
    
    res.json({ 
      message: 'OTP has been sent to your email address. Please check your inbox.',
      success: true 
    });
  } catch (err) {
    logger.error('Request password reset OTP error:', err);
    res.status(500).json({ message: 'Server error while sending OTP. Please try again.' });
  }
};

// Verify OTP for password reset
export const verifyPasswordResetOTP: RequestHandler = async (req, res, next) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    res.status(400).json({ message: 'Email and OTP are required.' });
    return;
  }

  try {
    logger.info(`OTP verification attempted for email: ${email}`);
    
    // Verify OTP without marking it as used (so it can be used for password reset)
    const isValid = await otpService.verifyOTPWithoutUsing(email, otp);
    
    if (!isValid) {
      res.status(400).json({ 
        message: 'Invalid or expired OTP. Please request a new one.',
        success: false 
      });
      return;
    }
    
    logger.info(`OTP verified successfully for email: ${email}`);
    
    res.json({ 
      message: 'OTP verified successfully. You can now reset your password.',
      success: true,
      canResetPassword: true
    });
  } catch (err) {
    logger.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Server error during OTP verification.' });
  }
};

// Reset password with OTP verification
export const resetPasswordWithOTP: RequestHandler = async (req, res, next) => {
  const { email, otp, newPassword } = req.body;
  
  if (!email || !otp || !newPassword) {
    res.status(400).json({ message: 'Email, OTP, and new password are required.' });
    return;
  }

  // Basic password validation
  if (newPassword.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    return;
  }

  try {
    logger.info(`Password reset with OTP attempted for email: ${email}`);
    
    // Verify OTP again (security measure)
    const isValidOTP = await otpService.verifyOTP(email, otp);
    
    if (!isValidOTP) {
      res.status(400).json({ 
        message: 'Invalid or expired OTP. Please request a new one.',
        success: false 
      });
      return;
    }
    
    // Reset password using existing auth service
    const result = await authService.updateUserPassword(email, newPassword);
    
    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }
    
    logger.info(`Password reset successfully for email: ${email}`);
    
    res.json({ 
      message: 'Password has been reset successfully. You can now login with your new password.',
      success: true 
    });
  } catch (err) {
    logger.error('Reset password with OTP error:', err);
    res.status(500).json({ message: 'Server error during password reset.' });
  }
};

// Google OAuth initialization controller
export const googleAuthInitiate: RequestHandler = (req, res, next) => {
  logger.info('[googleAuthInitiate] Starting Google OAuth flow', {
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    referer: req.headers.referer
  });
  
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};

// Google OAuth callback controller
export const googleAuthCallback: RequestHandler = (req, res, next) => {
  const requestStartTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  logger.info('[googleAuthCallback] Received callback request', {
    requestId,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    },
    url: req.originalUrl,
    timestamp: new Date().toISOString()
  });
  
  // Set up timeout handler
  const timeoutId = setTimeout(() => {
    const elapsedTime = Date.now() - requestStartTime;
    logger.error('[googleAuthCallback] Request timeout', {
      requestId,
      elapsedTimeMs: elapsedTime,
      message: 'OAuth callback taking too long, potential hang'
    });
  }, 25000); // 25 second timeout warning
  
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    clearTimeout(timeoutId);
    const authTime = Date.now();
    logger.info('[googleAuthCallback] Passport authentication result', {
      requestId,
      hasError: !!err,
      hasUser: !!user,
      info: info,
      errorMessage: err?.message,
      userEmail: user?.email,
      authTimeMs: authTime - requestStartTime
    });
    
    if (err) {
      logger.error('[googleAuthCallback] Passport authentication error:', {
        requestId,
        error: err.message,
        errorType: err.constructor.name,
        stack: err.stack,
        timeMs: authTime - requestStartTime,
        passportInfo: info,
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = encodeURIComponent(err.message || 'passport_auth_error');
      return res.redirect(`/login?error=google&reason=passport_error&message=${errorMessage}`);
    }
    
    if (!user) {
      logger.warn('[googleAuthCallback] No user returned from passport authentication', {
        requestId,
        info,
        timeMs: authTime - requestStartTime,
        possibleCause: 'Google strategy may have failed to create/find user',
        timestamp: new Date().toISOString()
      });
      
      const infoMessage = info ? encodeURIComponent(JSON.stringify(info)) : 'no_info';
      return res.redirect(`/login?error=google&reason=no_user_returned&info=${infoMessage}`);
    }
    
    try {
      logger.info('[googleAuthCallback] Processing authenticated user', {
        requestId,
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      });
      
      const result = await authService.handleGoogleAuthCallback(user);
      
      logger.info('[googleAuthCallback] Auth service result', {
        requestId,
        success: result.success,
        isNewUser: result.isNewUser,
        hasToken: !!result.token,
        tokenLength: result.token?.length,
        message: result.message,
        userId: user.user_id,
        userEmail: user.email
      });
      
      if (!result.success) {
        logger.error('[googleAuthCallback] Auth service failed', {
          requestId,
          result,
          userEmail: user?.email,
          userId: user?.user_id,
          serviceMessage: result.message,
          timestamp: new Date().toISOString()
        });
        
        // Provide specific error reason for frontend debugging
        const errorReason = encodeURIComponent(result.message || 'service_error');
        return res.redirect(`/login?error=google&reason=auth_service_failed&message=${errorReason}`);
      }
      
      // Use environment variable for frontend URL to support both development and production
      const origin = req.headers.origin; // This will be 'www.rehouzd.com' or 'app.rehouzd.com'
      const frontendUrl = ENV === 'local' ? 'http://localhost:3000' : (origin || 'https://www.rehouzd.com');
      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${result.token}&email=${encodeURIComponent(user.email)}&firstName=${encodeURIComponent(user.first_name)}&lastName=${encodeURIComponent(user.last_name)}&userId=${encodeURIComponent(user.user_id)}&mobileNumber=${encodeURIComponent(user.mobile_number || '')}&isNewUser=${result.isNewUser ? 'true' : 'false'}`;
      
      const totalTime = Date.now() - requestStartTime;
      logger.info('[googleAuthCallback] Redirecting to frontend', {
        requestId,
        frontendUrl,
        redirectUrl: redirectUrl.substring(0, 200) + '...', // Truncate for logging
        totalProcessingTimeMs: totalTime
      });
      
      return res.redirect(redirectUrl);
    } catch (error) {
      const totalTime = Date.now() - requestStartTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      logger.error('[googleAuthCallback] Unexpected error during callback processing:', {
        requestId,
        error: err.message,
        errorType: err.constructor.name,
        stack: err.stack,
        totalProcessingTimeMs: totalTime,
        userContext: user ? {
          userId: user.user_id,
          email: user.email,
          isNewUser: (user as any).isNewUser
        } : null,
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = encodeURIComponent(err.message || 'unexpected_processing_error');
      return res.redirect(`/login?error=google&reason=processing_error&message=${errorMessage}`);
    }
  })(req, res, next);
}; 
