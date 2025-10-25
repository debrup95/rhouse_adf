import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import * as authModel from '../../models/auth/authModel';
import { ensureUserSubscription } from '../credit/creditService';
import logger from "../../utils/logger";

dotenv.config();

// In production, store reset tokens in a database instead of memory.
const resetTokens: { [email: string]: { token: string; expires: number } } = {};

interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
  code?: number;
  isNewUser?: boolean;
}

// Login a user with email and password
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Find user by email
    logger.info('Login authService initiated for email:........', email);
    const user = await authModel.getUserByEmail(email);
    if (!user) {
      logger.warn('Login authService user not found:', email);
      return { success: false, message: 'Invalid credentials.' };
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      logger.warn('Login authService invalid password for user:', email);
      return { success: false, message: 'Invalid credentials.' };
    }

    // Generate a JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    return { 
      success: true, 
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        fname: user.first_name,
        lname: user.last_name,
        mobile: user.mobile_number
      }
    };
  } catch (error) {
    console.error('Login service error:', error);
    throw error;
  }
};

// Register a new user
export const registerUser = async (
  firstName: string, 
  lastName: string, 
  email: string, 
  password: string
): Promise<AuthResult> => {
  try {
    // Check if user already exists
    const userExists = await authModel.checkUserExists(email);
    if (userExists) {
      return { success: false, message: 'User already exists. Please try a different email.' };
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user
    const newUser = await authModel.createUser({
      email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName
    });

    // Create a free subscription for the new user
    try {
      await ensureUserSubscription(newUser.user_id);
      logger.info(`Free subscription created for new user: ${newUser.user_id}`);
    } catch (subscriptionError) {
      logger.error(`Failed to create subscription for new user ${newUser.user_id}:`, subscriptionError);
      // Don't fail the registration if subscription creation fails
    }

    return { success: true, message: 'User created successfully.', user: newUser };
  } catch (error) {
    console.error('Registration service error:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (
  userId: number, 
  profileData: { email?: string; first_name?: string; last_name?: string; mobile_number?: string }
): Promise<AuthResult> => {
  try {
    // Check if the user exists
    const user = await authModel.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User not found.', code: 404 };
    }

    if (Object.keys(profileData).length === 0) {
      return { success: false, message: 'No profile data provided to update.' };
    }

    const updatedUser = await authModel.updateUser(userId, profileData);
    
    return {
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser,
    };
  } catch (error) {
    console.error('Profile update service error:', error);
    throw error;
  }
};

// Create password reset token
export const createPasswordResetToken = async (email: string): Promise<AuthResult> => {
  try {
    // Check if user exists
    const user = await authModel.getUserByEmail(email);
    if (!user) {
      return { success: false, message: 'No user found with that email.' };
    }
    
    // Generate a reset token
    const token = crypto.randomBytes(32).toString('hex');
    // Token expires in 1 hour
    const expires = Date.now() + 3600000;
    resetTokens[email] = { token, expires };

    // In production, email the reset token or link to the user
    return { success: true, message: 'Password reset token generated.', token };
  } catch (error) {
    console.error('Create password reset token service error:', error);
    throw error;
  }
};

// Reset user password
export const resetUserPassword = async (
  email: string, 
  token: string, 
  newPassword: string
): Promise<AuthResult> => {
  try {
    const record = resetTokens[email];
    if (!record || record.token !== token || record.expires < Date.now()) {
      return { success: false, message: 'Invalid or expired token.' };
    }
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the user's password in the database
    await authModel.updatePassword(email, hashedPassword);
    
    // Invalidate the token
    delete resetTokens[email];
    
    return { success: true, message: 'Password has been reset successfully.' };
  } catch (error) {
    console.error('Reset password service error:', error);
    throw error;
  }
};

// Update user password (for OTP-based reset)
export const updateUserPassword = async (
  email: string, 
  newPassword: string
): Promise<AuthResult> => {
  try {
    // Check if user exists
    const user = await authModel.getUserByEmail(email);
    if (!user) {
      return { success: false, message: 'User not found.' };
    }
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the user's password in the database
    await authModel.updatePassword(email, hashedPassword);
    
    return { success: true, message: 'Password has been updated successfully.' };
  } catch (error) {
    console.error('Update password service error:', error);
    throw error;
  }
};

// Handle Google auth callback
export const handleGoogleAuthCallback = async (user: any): Promise<AuthResult & { isNewUser: boolean }> => {
  try {
    // Generate a JWT token
    logger.info('Google authService callback initiated for user:.....', user.email);
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
    logger.info('[handleGoogleAuthCallback] Google authService callback user authenticated:....', {
      email: user.email,
      isNewUser: user.isNewUser,
    });
    return { success: true, message: 'Google authentication successful', token,
      isNewUser: user.isNewUser || false, };
  } catch (error) {
    console.error('Google auth callback service error:', error);
    throw error;
  }
};

// Configure Google OAuth strategy
export const configureGoogleStrategy = () => {
  logger.info('[configureGoogleStrategy] Starting Google OAuth strategy configuration...');
  
  // Log environment configuration (without sensitive data)
  logger.info('[configureGoogleStrategy] Environment check', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    nodeEnv: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL
  });
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    logger.error('[configureGoogleStrategy] GOOGLE_CLIENT_ID is not set!');
  }
  
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    logger.error('[configureGoogleStrategy] GOOGLE_CLIENT_SECRET is not set!');
  }
  
  const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
  const passport = require('passport');
  
  const strategyConfig = {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  };
  
  logger.info('[configureGoogleStrategy] Strategy configuration', {
    clientIdSet: !!strategyConfig.clientID,
    clientSecretSet: !!strategyConfig.clientSecret,
    callbackURL: strategyConfig.callbackURL
  });
  
  passport.use(new GoogleStrategy(strategyConfig,
  async (accessToken: string, refreshToken: string, profile: any, done: Function) => {
    const startTime = Date.now();
    logger.info('[GoogleStrategy] OAuth callback started', {
      profileId: profile?.id,
      profileProvider: profile?.provider,
      profileDisplayName: profile?.displayName,
      accessTokenLength: accessToken?.length,
      refreshTokenExists: !!refreshToken,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Validate profile data
      if (!profile) {
        logger.error('[GoogleStrategy] No profile received from Google');
        return done(new Error('No profile received from Google'), false);
      }
      
      if (!profile.emails || !Array.isArray(profile.emails) || profile.emails.length === 0) {
        logger.error('[GoogleStrategy] No emails in profile', { profile });
        return done(new Error('No email addresses found in Google profile'), false);
      }
      
      const email = profile.emails[0].value;
      const firstName = profile.name?.givenName || '';
      const lastName = profile.name?.familyName || '';
      
      logger.info('[GoogleStrategy] Profile data extracted', {
        email,
        firstName,
        lastName,
        profileId: profile.id
      });
      
      if (!email) {
        logger.error('[GoogleStrategy] Empty email value from profile');
        return done(new Error('Empty email address from Google profile'), false);
      }
      
      let isNewUser = false;
      
      // Check if user exists
      logger.info('[GoogleStrategy] Checking if user exists in database');
      let user = await authModel.getUserByEmail(email);
      logger.info('[GoogleStrategy] User retrieved from DB and Flag set:.....', {userId: user?.user_id, isNewUser});
      if (!user) {
        // Create a new user with a random password
        isNewUser = true;
        logger.info('[GoogleStrategy] No user found, creating new user for:.....', {email, isNewUser});
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        const newUserData = {
          email,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName
        };
        
        logger.info('[GoogleStrategy] Calling createUser with data', { 
          email: newUserData.email,
          firstName: newUserData.first_name,
          lastName: newUserData.last_name,
          hasPasswordHash: !!newUserData.password_hash
        });
        
        const newUser = await authModel.createUser(newUserData);
        
        logger.info('[GoogleStrategy] New user created successfully', {
          userId: newUser.user_id,
          email: newUser.email
        });
        
        // Create a free subscription for the new Google user
        try {
          logger.info('[GoogleStrategy] Creating subscription for new user', { userId: newUser.user_id });
          await ensureUserSubscription(newUser.user_id);
          logger.info(`[GoogleStrategy] Free subscription created for new Google user: ${newUser.user_id}`);
        } catch (subscriptionError) {
          logger.error(`[GoogleStrategy] Failed to create subscription for new Google user ${newUser.user_id}:`, subscriptionError);
          // Don't fail the authentication if subscription creation fails
        }
        
        // Fetch the created user to ensure we have complete data
        logger.info('[GoogleStrategy] Fetching created user from database');
        user = await authModel.getUserByEmail(email);
      }
      
      if (!user) {
        logger.error('[GoogleStrategy] Failed to retrieve user after creation/lookup', { email });
        return done(new Error('Failed to retrieve user data'), false);
      }
      
      const processingTime = Date.now() - startTime;
      logger.info('[GoogleStrategy] Authentication completed successfully', {
        email,
        userId: user.user_id,
        isNewUser,
        processingTimeMs: processingTime
      });
      
      (user as any).isNewUser = isNewUser;
      return done(null, user);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[GoogleStrategy] Error during OAuth processing:', {
        error: err.message,
        stack: err.stack,
        processingTimeMs: processingTime
      });
      return done(err, false);
    }
  }));

  passport.serializeUser((user: any, done: Function) => {
    logger.info('[passport.serializeUser] Serializing user', {
      userId: user?.user_id,
      email: user?.email
    });
    done(null, user.user_id);
  });

  passport.deserializeUser(async (id: number, done: Function) => {
    try {
      logger.info('[passport.deserializeUser] Deserializing user', { id });
      const user = await authModel.getUserById(id);
      logger.info('[passport.deserializeUser] User deserialized', {
        userId: user?.user_id,
        email: user?.email
      });
      done(null, user);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[passport.deserializeUser] Error deserializing user:', {
        id,
        error: err.message
      });
      done(error, null);
    }
  });
  
  logger.info('[configureGoogleStrategy] Google OAuth strategy configuration completed');
}; 