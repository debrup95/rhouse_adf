import { Request, Response } from 'express';
import { query } from '../config/db';
import logger from '../utils/logger';

// In-memory cache for verification stats to reduce database load
const verificationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Rate limiting for verification requests
const activeRequests = new Map<string, Promise<any>>();
import { AppError } from '../middleware/errorHandler';

/**
 * Controller for phone verification endpoints
 */
class PhoneVerificationController {

  /**
   * Verify a phone number for a buyer
   * POST /api/phone-verification/verify
   */
  verifyPhone = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, phoneNumber, buyerName, verificationStatus } = req.body;

      logger.info('Phone verification request', {
        userId: user_id,
        phoneNumber: phoneNumber?.substring(0, 3) + '***', // Log partial for privacy
        buyerName,
        verificationStatus
      });

      // Validate required fields
      if (!user_id || !phoneNumber || !buyerName || !verificationStatus) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: user_id, phoneNumber, buyerName, verificationStatus'
        });
        return;
      }

      // Validate verification status
      if (!['verified', 'invalid'].includes(verificationStatus)) {
        res.status(400).json({
          success: false,
          message: 'verificationStatus must be either "verified" or "invalid"'
        });
        return;
      }

      const userId = parseInt(user_id.toString(), 10);
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
        return;
      }

      // Clean phone number (remove formatting)
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      // Call database function to add verification
      const result = await query(`
        SELECT * FROM add_phone_verification($1, $2, $3, $4)
      `, [cleanPhoneNumber, buyerName, userId, verificationStatus]);

      const verificationResult = result.rows[0];

      if (verificationResult.success) {
        logger.info('Phone verification successful', {
          userId,
          phoneNumber: cleanPhoneNumber.substring(0, 3) + '***',
          buyerName,
          verificationStatus,
          newNetScore: verificationResult.new_net_score
        });

        res.status(200).json({
          success: true,
          message: verificationResult.message,
          verification: {
            phoneNumber: cleanPhoneNumber,
            buyerName,
            verificationStatus,
            verifiedCount: verificationResult.new_verified_count,
            invalidCount: verificationResult.new_invalid_count,
            netScore: verificationResult.new_net_score,
            overallStatus: verificationResult.new_net_score > 0 ? 'verified' : 
                          verificationResult.new_net_score < 0 ? 'invalid' : 'unverified'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: verificationResult.message
        });
      }

    } catch (error: any) {
      logger.error('Error in phone verification', {
        error: error.message,
        stack: error.stack,
        phoneNumber: req.body.phoneNumber?.substring(0, 3) + '***',
        buyerName: req.body.buyerName
      });

      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to record phone verification',
          error: error.message
        });
      }
    }
  };

  /**
   * Get phone verification stats for a buyer
   * GET /api/phone-verification/stats/:buyerName
   */
  getPhoneVerificationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { buyerName } = req.params;
      const { phoneNumbers } = req.query;

      if (!buyerName) {
        res.status(400).json({
          success: false,
          message: 'Buyer name is required'
        });
        return;
      }

      if (!phoneNumbers) {
        res.status(400).json({
          success: false,
          message: 'Phone numbers are required'
        });
        return;
      }

      // Parse phone numbers array
      let phoneNumbersArray: string[];
      try {
        phoneNumbersArray = Array.isArray(phoneNumbers) 
          ? phoneNumbers as string[]
          : JSON.parse(phoneNumbers as string);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid phone numbers format'
        });
        return;
      }

      // Clean phone numbers
      const cleanPhoneNumbers = phoneNumbersArray.map(phone => phone.replace(/\D/g, ''));

      logger.info('🔍 Getting phone verification stats (Controller)', {
        buyerName,
        originalPhoneNumbers: phoneNumbersArray,
        cleanPhoneNumbers,
        phoneCount: cleanPhoneNumbers.length
      });

      // Get verification stats from database (combined query)
      const result = await query(`
        SELECT * FROM get_phone_verification_stats($1, $2)
      `, [buyerName, cleanPhoneNumbers]);

      logger.info('📊 Phone verification stats retrieved', {
        buyerName,
        cleanPhoneNumbers,
        resultCount: result.rows.length,
        results: result.rows.map(row => ({
          phone: row.phone_number,
          verified: row.verified_count,
          invalid: row.invalid_count,
          status: row.verification_status
        }))
      });

      const stats = result.rows.map(row => ({
        phoneNumber: row.phone_number,
        verifiedCount: row.verified_count,
        invalidCount: row.invalid_count,
        netScore: row.net_verification_score,
        verificationStatus: row.verification_status
      }));

      res.status(200).json({
        success: true,
        buyerName,
        verificationStats: stats
      });

    } catch (error: any) {
      logger.error('Error getting phone verification stats', {
        error: error.message,
        buyerName: req.params.buyerName
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get phone verification stats',
        error: error.message
      });
    }
  };

  /**
   * Get user's verification history
   * GET /api/phone-verification/user-history/:userId
   */
  getUserVerificationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
        return;
      }

      logger.info('Getting user verification history', { userId: userIdNum, limit, offset });

      const result = await query(`
        SELECT 
          phone_number,
          buyer_name,
          verification_status,
          verification_date,
          created_at
        FROM skip_trace_verified_phones
        WHERE verified_by_user_id = $1
        ORDER BY verification_date DESC
        LIMIT $2 OFFSET $3
      `, [userIdNum, limit, offset]);

      const history = result.rows.map(row => ({
        phoneNumber: row.phone_number,
        buyerName: row.buyer_name,
        verificationStatus: row.verification_status,
        verificationDate: row.verification_date,
        createdAt: row.created_at
      }));

      res.status(200).json({
        success: true,
        history,
        pagination: {
          limit,
          offset,
          count: history.length
        }
      });

    } catch (error: any) {
      logger.error('Error getting user verification history', {
        error: error.message,
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get user verification history',
        error: error.message
      });
    }
  };
}

export default new PhoneVerificationController(); 