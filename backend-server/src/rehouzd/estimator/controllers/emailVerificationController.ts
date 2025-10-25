import { Request, Response } from 'express';
import { query } from '../config/db';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

/**
 * Controller for email verification endpoints
 */
class EmailVerificationController {

  /**
   * Verify an email address for a buyer
   * POST /api/email-verification/verify
   */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, email, buyerName, verificationStatus } = req.body;

      logger.info('Email verification request', {
        userId: user_id,
        email: email?.substring(0, 3) + '***' + email?.substring(email.lastIndexOf('@')), // Log partial for privacy
        buyerName,
        verificationStatus
      });

      // Validate required fields
      if (!user_id || !email || !buyerName || !verificationStatus) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: user_id, email, buyerName, verificationStatus'
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

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
        return;
      }

      // Clean email (trim and lowercase)
      const cleanEmail = email.trim().toLowerCase();

      // Call database function to add verification
      const result = await query(`
        SELECT * FROM add_email_verification($1, $2, $3, $4)
      `, [cleanEmail, buyerName, userId, verificationStatus]);

      const verificationResult = result.rows[0];

      if (verificationResult.success) {
        logger.info('Email verification successful', {
          userId,
          email: cleanEmail.substring(0, 3) + '***' + cleanEmail.substring(cleanEmail.lastIndexOf('@')),
          buyerName,
          verificationStatus,
          newNetScore: verificationResult.new_net_score
        });

        res.status(200).json({
          success: true,
          message: verificationResult.message,
          verification: {
            email: cleanEmail,
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
      logger.error('Error in email verification', {
        error: error.message,
        stack: error.stack,
        email: req.body.email?.substring(0, 3) + '***',
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
          message: 'Failed to record email verification',
          error: error.message
        });
      }
    }
  }

  /**
   * Get email verification stats for a buyer
   * GET /api/email-verification/stats/:buyerName
   */
  getEmailVerificationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { buyerName } = req.params;
      const { emails } = req.query;

      if (!buyerName) {
        res.status(400).json({
          success: false,
          message: 'Buyer name is required'
        });
        return;
      }

      if (!emails) {
        res.status(400).json({
          success: false,
          message: 'Email addresses are required'
        });
        return;
      }

      // Parse emails array
      let emailsArray: string[];
      try {
        emailsArray = Array.isArray(emails) 
          ? emails as string[]
          : JSON.parse(emails as string);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid emails format'
        });
        return;
      }

      // Clean emails
      const cleanEmails = emailsArray.map(email => email.trim().toLowerCase());

      logger.info('🔍 Getting email verification stats (Controller)', {
        buyerName,
        originalEmails: emailsArray,
        cleanEmails,
        emailCount: cleanEmails.length
      });

      // Test normalization function first
      const normalizeTest = await query(`
        SELECT normalize_buyer_name($1) as normalized_name
      `, [buyerName]);
      
      logger.debug('📝 Buyer name normalization test (Email)', {
        originalBuyerName: buyerName,
        normalizedBuyerName: normalizeTest.rows[0]?.normalized_name
      });

      // Check what buyer names exist in verification table (for debugging)
      const existingBuyers = await query(`
        SELECT DISTINCT buyer_name, normalized_buyer_name 
        FROM skip_trace_verified_emails 
        WHERE buyer_name ILIKE $1 OR normalized_buyer_name = normalize_buyer_name($1)
        LIMIT 5
      `, [`%${buyerName.split(' ')[0]}%`]);
      
      logger.debug('🔍 Existing buyers in email verification table', {
        searchBuyerName: buyerName,
        existingBuyers: existingBuyers.rows
      });

      // Get verification stats from database
      const result = await query(`
        SELECT * FROM get_email_verification_stats($1, $2)
      `, [buyerName, cleanEmails]);

      logger.info('📊 Email verification stats retrieved', {
        buyerName,
        cleanEmails,
        resultCount: result.rows.length,
        results: result.rows.map(row => ({
          email: row.email_address,
          verified: row.verified_count,
          invalid: row.invalid_count,
          status: row.verification_status
        }))
      });

      const stats = result.rows.map(row => ({
        email: row.email_address,
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
      logger.error('Error getting email verification stats', {
        error: error.message,
        buyerName: req.params.buyerName
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get email verification stats',
        error: error.message
      });
    }
  };

  /**
   * Get user's email verification history
   * GET /api/email-verification/user-history/:userId
   */
  getUserEmailVerificationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId || isNaN(parseInt(userId))) {
        res.status(400).json({
          success: false,
          message: 'Valid user ID is required'
        });
        return;
      }

      logger.info('Getting user email verification history', {
        userId,
        limit,
        offset
      });

      // Get user's verification history
      const result = await query(`
        SELECT 
          email_address,
          buyer_name,
          verification_status,
          verification_date,
          created_at
        FROM skip_trace_verified_emails
        WHERE verified_by_user_id = $1
        ORDER BY verification_date DESC
        LIMIT $2 OFFSET $3
      `, [parseInt(userId), limit, offset]);

      // Get total count for pagination
      const countResult = await query(`
        SELECT COUNT(*) as total_count
        FROM skip_trace_verified_emails
        WHERE verified_by_user_id = $1
      `, [parseInt(userId)]);

      const totalCount = parseInt(countResult.rows[0].total_count);

      res.status(200).json({
        success: true,
        history: result.rows.map(row => ({
          email: row.email_address,
          buyerName: row.buyer_name,
          verificationStatus: row.verification_status,
          verificationDate: row.verification_date,
          createdAt: row.created_at
        })),
        pagination: {
          limit,
          offset,
          count: totalCount
        }
      });

    } catch (error: any) {
      logger.error('Error getting user email verification history', {
        error: error.message,
        userId: req.params.userId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get user email verification history',
        error: error.message
      });
    }
  };
}

export default new EmailVerificationController();