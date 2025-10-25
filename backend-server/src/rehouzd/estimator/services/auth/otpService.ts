import { Pool } from 'pg';
import { query } from '../../config/db';
import crypto from 'crypto';
import logger from '../../utils/logger';

export interface OTPData {
  id?: number;
  email: string;
  otp_code: string;
  expires_at: Date;
  is_used: boolean;
  created_at?: Date;
}

/**
 * Generate a 6-digit OTP code
 */
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Store OTP in database with 10-minute expiration
 * @param email - User's email address
 * @param otpCode - 6-digit OTP code
 */
export const storeOTP = async (email: string, otpCode: string): Promise<number> => {
  try {
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // First, invalidate any existing unused OTPs for this email
    await query(
      'UPDATE password_reset_otps SET is_used = true WHERE email = $1 AND is_used = false',
      [email]
    );

    // Insert new OTP
    const result = await query(
      `INSERT INTO password_reset_otps (email, otp_code, expires_at, is_used) 
       VALUES ($1, $2, $3, false) 
       RETURNING id`,
      [email, otpCode, expiresAt]
    );

    logger.info(`OTP stored for email: ${email}`);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error storing OTP:', error);
    throw error;
  }
};

/**
 * Verify OTP code for password reset
 * @param email - User's email address
 * @param otpCode - 6-digit OTP code to verify
 */
export const verifyOTP = async (email: string, otpCode: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT id, expires_at, is_used 
       FROM password_reset_otps 
       WHERE email = $1 AND otp_code = $2 AND is_used = false
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email, otpCode]
    );

    if (result.rows.length === 0) {
      logger.warn(`Invalid OTP attempt for email: ${email}`);
      return false;
    }

    const otpData = result.rows[0];
    
    // Check if OTP has expired
    if (new Date() > new Date(otpData.expires_at)) {
      logger.warn(`Expired OTP attempt for email: ${email}`);
      return false;
    }

    // Mark OTP as used
    await query(
      'UPDATE password_reset_otps SET is_used = true WHERE id = $1',
      [otpData.id]
    );

    logger.info(`OTP verified successfully for email: ${email}`);
    return true;
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Verify OTP code without marking it as used (for verification step only)
 * @param email - User's email address
 * @param otpCode - 6-digit OTP code to verify
 */
export const verifyOTPWithoutUsing = async (email: string, otpCode: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT id, expires_at, is_used 
       FROM password_reset_otps 
       WHERE email = $1 AND otp_code = $2 AND is_used = false
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email, otpCode]
    );

    if (result.rows.length === 0) {
      logger.warn(`Invalid OTP attempt for email: ${email}`);
      return false;
    }

    const otpData = result.rows[0];
    
    // Check if OTP has expired
    if (new Date() > new Date(otpData.expires_at)) {
      logger.warn(`Expired OTP attempt for email: ${email}`);
      return false;
    }

    // Don't mark as used - just verify it's valid
    logger.info(`OTP verified successfully (without marking as used) for email: ${email}`);
    return true;
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Clean up expired OTPs (older than 24 hours)
 * This should be called periodically to maintain database hygiene
 */
export const cleanupExpiredOTPs = async (): Promise<number> => {
  try {
    const result = await query(
      `DELETE FROM password_reset_otps 
       WHERE created_at < NOW() - INTERVAL '24 hours'
       OR (is_used = true AND created_at < NOW() - INTERVAL '1 hour')`
    );

    const deletedCount = result.rowCount || 0;
    logger.info(`Cleaned up ${deletedCount} expired/used OTPs`);
    return deletedCount;
  } catch (error) {
    logger.error('Error cleaning up expired OTPs:', error);
    throw error;
  }
};

/**
 * Check if user has requested OTP recently (rate limiting)
 * @param email - User's email address
 * @param withinMinutes - Check within this many minutes (default: 1)
 */
export const hasRecentOTPRequest = async (
  email: string, 
  withinMinutes: number = 1
): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM password_reset_otps 
       WHERE email = $1 
       AND created_at > NOW() - INTERVAL '${withinMinutes} minutes'`,
      [email]
    );

    const count = parseInt(result.rows[0].count);
    return count > 0;
  } catch (error) {
    logger.error('Error checking recent OTP requests:', error);
    throw error;
  }
};

/**
 * Get the latest OTP for an email (for admin purposes/debugging)
 * @param email - User's email address
 */
export const getLatestOTPForEmail = async (email: string): Promise<OTPData | null> => {
  try {
    const result = await query(
      `SELECT id, email, otp_code, expires_at, is_used, created_at 
       FROM password_reset_otps 
       WHERE email = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as OTPData;
  } catch (error) {
    logger.error('Error getting latest OTP for email:', error);
    throw error;
  }
}; 