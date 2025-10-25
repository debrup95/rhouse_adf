import { query } from '../../config/db';
import logger from '../../utils/logger';

export interface OTPRecord {
  id?: number;
  email: string;
  otp_code: string;
  created_at?: Date;
  expires_at: Date;
  used?: boolean;
  attempts?: number;
}

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create a new OTP record for password reset
 * @param email - User's email address
 * @param otpCode - The OTP code (6 digits)
 * @param expirationMinutes - OTP expiration time in minutes (default: 10)
 */
export const createPasswordResetOTP = async (
  email: string, 
  otpCode: string, 
  expirationMinutes: number = 10
): Promise<void> => {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    const queryText = `
      INSERT INTO password_reset_otps (email, otp_code, expires_at)
      VALUES ($1, $2, $3)
    `;
    
    const values = [email, otpCode, expiresAt];
    await query(queryText, values);
    
    logger.info(`[OTP Model] Created password reset OTP for email: ${email}, expires at: ${expiresAt}`);
  } catch (error) {
    logger.error('[OTP Model] Error creating password reset OTP:', error);
    throw error;
  }
};

/**
 * Validate an OTP for password reset
 * @param email - User's email address
 * @param otpCode - The OTP code to validate
 * @returns Object indicating if OTP is valid and any error message
 */
export const validatePasswordResetOTP = async (
  email: string, 
  otpCode: string
): Promise<{ valid: boolean; message: string; otpId?: number }> => {
  try {
    // First, increment the attempts counter
    await query(`
      UPDATE password_reset_otps 
      SET attempts = attempts + 1 
      WHERE email = $1 AND otp_code = $2 AND used = FALSE
    `, [email, otpCode]);

    // Get the OTP record
    const queryText = `
      SELECT id, email, otp_code, created_at, expires_at, used, attempts
      FROM password_reset_otps
      WHERE email = $1 AND otp_code = $2 AND used = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await query(queryText, [email, otpCode]);
    
    if (result.rows.length === 0) {
      logger.warn(`[OTP Model] Invalid or used OTP attempted for email: ${email}`);
      return { valid: false, message: 'Invalid or expired OTP code.' };
    }
    
    const otpRecord = result.rows[0];
    
    // Check if OTP has expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      logger.warn(`[OTP Model] Expired OTP attempted for email: ${email}`);
      return { valid: false, message: 'OTP code has expired. Please request a new one.' };
    }
    
    // Check if too many attempts
    if (otpRecord.attempts > 5) {
      logger.warn(`[OTP Model] Too many OTP attempts for email: ${email}`);
      // Mark as used to prevent further attempts
      await query(`
        UPDATE password_reset_otps 
        SET used = TRUE 
        WHERE id = $1
      `, [otpRecord.id]);
      
      return { valid: false, message: 'Too many invalid attempts. Please request a new OTP.' };
    }
    
    logger.info(`[OTP Model] Valid OTP verified for email: ${email}`);
    return { valid: true, message: 'OTP is valid.', otpId: otpRecord.id };
    
  } catch (error) {
    logger.error('[OTP Model] Error validating password reset OTP:', error);
    throw error;
  }
};

/**
 * Mark an OTP as used
 * @param otpId - The ID of the OTP record to mark as used
 */
export const markOTPAsUsed = async (otpId: number): Promise<void> => {
  try {
    await query(`
      UPDATE password_reset_otps 
      SET used = TRUE 
      WHERE id = $1
    `, [otpId]);
    
    logger.info(`[OTP Model] Marked OTP as used: ${otpId}`);
  } catch (error) {
    logger.error('[OTP Model] Error marking OTP as used:', error);
    throw error;
  }
};

/**
 * Delete expired and used OTPs (cleanup function)
 */
export const cleanupExpiredOTPs = async (): Promise<number> => {
  try {
    const result = await query('SELECT cleanup_expired_otps()');
    const deletedCount = result.rows[0].cleanup_expired_otps;
    
    logger.info(`[OTP Model] Cleaned up ${deletedCount} expired/used OTPs`);
    return deletedCount;
  } catch (error) {
    logger.error('[OTP Model] Error cleaning up expired OTPs:', error);
    throw error;
  }
};

/**
 * Check if user has any recent OTP requests (rate limiting)
 * @param email - User's email address
 * @param withinMinutes - Check for OTPs created within this many minutes (default: 1)
 */
export const hasRecentOTPRequest = async (
  email: string, 
  withinMinutes: number = 1
): Promise<boolean> => {
  try {
    const queryText = `
      SELECT COUNT(*) as count
      FROM password_reset_otps
      WHERE email = $1 
      AND created_at > NOW() - INTERVAL '${withinMinutes} minutes'
    `;
    
    const result = await query(queryText, [email]);
    const count = parseInt(result.rows[0].count);
    
    return count > 0;
  } catch (error) {
    logger.error('[OTP Model] Error checking recent OTP requests:', error);
    throw error;
  }
}; 