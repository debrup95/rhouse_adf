import { Request, Response } from 'express';
import skipTraceService, { SkipTraceRequest } from '../services/skipTrace/skipTraceServiceV2';
import { query } from '../config/db';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { extractUserContext } from '../types/userActivity';

/**
 * Controller for skip tracing endpoints
 */
class SkipTraceController {

  /**
   * Get user's skip trace credit balance and history
   * GET /api/skip-trace/credits/balance
   */
  getCreditBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      // Debug logs to understand the request structure
      logger.info('Skip trace credit balance request debug', {
        params: req.params,
        query: req.query,
        body: req.body,
        headers: {
          'x-user-id': req.headers['x-user-id'],
          'authorization': req.headers.authorization ? 'present' : 'missing'
        }
      });

      // Try multiple ways to get user ID (similar to underwrite requests)
      const userId = req.params.userId || 
                     req.query.userId || 
                     req.body.userId || 
                     req.headers['x-user-id'];

      logger.info('Skip trace getting credit balance for user', { userId, userIdType: typeof userId });
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required - userId missing from request'
        });
        return;
      }

      const userIdNum = parseInt(userId.toString(), 10);
      if (isNaN(userIdNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
        return;
      }

      logger.info('Getting credit balance for user', { userId: userIdNum });

      // Direct query for credit balance (for testing)
      const creditResult = await query(`
        SELECT 
          free_credits_remaining as free_credits,
          paid_credits_remaining as paid_credits,
          (free_credits_remaining + paid_credits_remaining) as total_credits,
          (total_free_credits_used + total_paid_credits_used) as total_used,
          total_free_credits_used,
          total_paid_credits_used,
          total_lookups_performed
        FROM skip_trace_credits 
        WHERE user_id = $1
      `, [userIdNum]);

      const credits = creditResult.rows[0] || { 
        free_credits: 3, 
        paid_credits: 0, 
        total_credits: 3, 
        total_used: 0 
      };

      // Get recent credit history
      const historyResult = await query(`
        SELECT 
          purchase_id::text as id,
          'purchased' as type,
          credits_purchased as amount,
          'Purchased ' || credits_purchased || ' credits for $' || (amount_paid_cents / 100.0) as description,
          purchase_date as date
        FROM skip_trace_purchases 
        WHERE user_id = $1 AND payment_status = 'completed'
        
        UNION ALL
        
        SELECT 
          access_id::text as id,
          'used' as type,
          -credit_cost as amount,
          'Skip traced ' || buyer_name as description,
          access_date as date
        FROM skip_trace_user_access 
        WHERE user_id = $1 AND credit_cost > 0
        
        ORDER BY date DESC 
        LIMIT 10
      `, [userIdNum]);

      res.status(200).json({
        success: true,
        credits: {
          free: credits.free_credits,
          paid: credits.paid_credits,
          total: credits.total_credits
        },
        usage: {
          totalUsed: credits.total_used,
          remainingFree: credits.free_credits,
          remainingPaid: credits.paid_credits
        },
        history: historyResult.rows
      });

    } catch (error: any) {
      logger.error('Error getting credit balance', { 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get credit balance',
        error: error.message
      });
    }
  };

  /**
   * Perform skip trace lookup
   * POST /api/skip-trace/lookup
   */
  performSkipTrace = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get user_id from request body (like underwrite requests)
      const { user_id, buyerId, buyerName, inputData, propertyAddresses }: SkipTraceRequest & { user_id: number } = req.body;

      logger.info('Skip trace request debug', {
        user_id,
        buyerId,
        buyerName,
        hasInputData: !!inputData,
        propertyCount: propertyAddresses?.length || 0
      });
      
      if (!user_id) {
        res.status(401).json({
          success: false,
          message: 'User authentication required - user_id missing from request body'
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

      // Validate required fields
      if (!buyerId || !buyerName) {
        res.status(400).json({
          success: false,
          message: 'buyerId and buyerName are required'
        });
        return;
      }

      logger.info('Starting skip trace lookup', { 
        userId, 
        buyerId, 
        buyerName,
        propertyCount: propertyAddresses?.length || 0
      });

      // Debug: Log the full skip trace request
      logger.debug('Skip Trace Controller - Full Request Details', {
        userId,
        buyerId,
        buyerName,
        inputData: JSON.stringify(inputData, null, 2),
        propertyAddresses: JSON.stringify(propertyAddresses, null, 2),
        propertyCount: propertyAddresses?.length || 0
      });

      // Perform skip trace
      const result = await skipTraceService.performSkipTrace(userId, {
        buyerId,
        buyerName,
        inputData: inputData || {},
        propertyAddresses
      });

      // Debug: Log the skip trace result
      logger.debug('Skip Trace Controller - Service Result', {
        userId,
        buyerId,
        success: result.success,
        hasContactInfo: !!(result.result && (result.result.emails?.length > 0 || result.result.phones?.length > 0)),
        creditUsed: result.creditUsed,
        error: result.error || 'none'
      });

      if (result.success) {
        res.status(200).json(result);
      } else {
        // Handle specific error cases
        if (result.error === 'Insufficient credits') {
          res.status(402).json(result); // Payment required
        } else {
          res.status(400).json(result);
        }
      }

    } catch (error: any) {
      logger.error('Error performing skip trace', { 
        error: error.message,
        stack: error.stack
      });
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Skip trace lookup failed',
          error: error.message
        });
      }
    }
  };

  /**
   * Get skip trace results history
   * GET /api/skip-trace/history/:userId?limit=50
   */
  getSkipTraceHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get user ID from URL parameter like credit balance endpoint
      const userId = req.params.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required - userId missing from URL'
        });
        return;
      }

      const userIdNum = parseInt(userId.toString(), 10);
      if (isNaN(userIdNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      logger.info('Getting skip trace history', { userId: userIdNum, limit, offset });

      // Get total count first
      const countResult = await query(`
        SELECT COUNT(*) as total_count
        FROM skip_trace_user_access sua
        JOIN skip_trace_results str ON sua.lookup_id = str.lookup_id
        WHERE sua.user_id = $1
      `, [userIdNum]);

      const totalCount = parseInt(countResult.rows[0]?.total_count || '0', 10);

      // Get paginated results
      const result = await query(`
        SELECT 
          str.lookup_id,
          sua.buyer_id,
          sua.buyer_name,
          sua.original_search_address,
          sua.access_date as lookup_date,
          sua.credit_type,
          str.api_response_status,
          str.phone_count,
          str.email_count,
          str.found_phone_numbers,
          str.found_email_addresses,
          str.owner_names,
          str.dnc_status,
          str.litigator_status
        FROM skip_trace_user_access sua
        JOIN skip_trace_results str ON sua.lookup_id = str.lookup_id
        WHERE sua.user_id = $1
        ORDER BY sua.access_date DESC
        LIMIT $2 OFFSET $3
      `, [userIdNum, limit, offset]);

      const skipTraceResults = await Promise.all(result.rows.map(async (row) => {
        const phones = this.parseContactArray(row.found_phone_numbers);
        
        // Get verification data for phones if any exist
        let phonesWithVerification = phones;
        if (phones.length > 0) {
          try {
            // Clean phone numbers before passing to database function
            const cleanedPhoneNumbers = phones.map(phone => {
              const phoneNumber = phone.number || phone;
              return phoneNumber.replace(/\D/g, ''); // Remove all non-digits
            });
            
            const verificationResult = await query(`
              SELECT * FROM get_phone_verification_stats($1, $2)
            `, [row.buyer_name, cleanedPhoneNumbers]); // Pass cleaned numbers
            
            // Merge verification data with phone numbers
            phonesWithVerification = phones.map(phone => {
              const phoneNumber = phone.number || phone;
              const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
              const verification = verificationResult.rows.find(v => v.phone_number === cleanedPhoneNumber);
              
              return {
                ...(typeof phone === 'object' ? phone : { number: phone }),
                verification: verification ? {
                  verifiedCount: verification.verified_count,
                  invalidCount: verification.invalid_count,
                  netScore: verification.net_verification_score,
                  status: verification.verification_status
                } : {
                  verifiedCount: 0,
                  invalidCount: 0,
                  netScore: 0,
                  status: 'unverified'
                }
              };
            });
          } catch (verificationError) {
            logger.warn('Failed to get verification data for phones', { 
              buyerName: row.buyer_name, 
              error: verificationError 
            });
          }
        }

        return {
          lookupId: row.lookup_id.toString(),
          buyerId: row.buyer_id,
          buyerName: row.buyer_name,
          originalSearchAddress: row.original_search_address,
          lookupDate: row.lookup_date,
          creditUsed: row.credit_type,
          apiResponseStatus: row.api_response_status,
          phoneCount: row.phone_count,
          emailCount: row.email_count,
          phones: phonesWithVerification,
          emails: this.parseContactArray(row.found_email_addresses),
          addresses: [], // Not stored currently but needed for ContactInfoDrawer
          matchedOwners: this.parseOwnerNames(row.owner_names), // Add owner names from database
          compliance: {
            dncStatus: row.dnc_status ? 'On DNC List' : 'Not on DNC List',
            litigatorStatus: row.litigator_status ? 'Known Litigator' : 'Not a Known Litigator'
          }
        };
      }));

      res.status(200).json({
        success: true,
        results: skipTraceResults,
        totalCount: totalCount,
        pagination: {
          limit,
          offset,
          count: skipTraceResults.length,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      });

    } catch (error: any) {
      logger.error('Error getting skip trace history', { 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get skip trace history',
        error: error.message
      });
    }
  };

  /**
   * Get a specific skip trace result by lookup ID
   * GET /api/skip-trace/result/:lookupId
   */
  getSkipTraceResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const userContext = extractUserContext(req);
      const userId = userContext.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const { lookupId } = req.params;

      logger.info('Getting skip trace result', { userId, lookupId });

      const result = await query(`
        SELECT 
          str.*,
          sua.buyer_id,
          sua.buyer_name,
          sua.credit_type,
          sua.access_date
        FROM skip_trace_results str
        JOIN skip_trace_user_access sua ON str.lookup_id = sua.lookup_id
        WHERE str.lookup_id = $1 AND sua.user_id = $2
        ORDER BY sua.access_date DESC
        LIMIT 1
      `, [lookupId, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Skip trace result not found'
        });
        return;
      }

      const row = result.rows[0];
      const skipTraceResult = {
        lookupId: row.lookup_id.toString(),
        buyerId: row.buyer_id,
        buyerName: row.buyer_name,
        lookupDate: row.access_date,
        creditUsed: row.credit_type,
        phones: this.parseContactArray(row.found_phone_numbers),
        emails: this.parseContactArray(row.found_email_addresses),
        addresses: [], // Not stored currently
        compliance: {
          dncStatus: row.dnc_status ? 'On DNC List' : 'Not on DNC List',
          litigatorStatus: row.litigator_status ? 'Known Litigator' : 'Not a Known Litigator'
        },
        apiResponseStatus: row.api_response_status
      };

      res.status(200).json({
        success: true,
        result: skipTraceResult
      });

    } catch (error: any) {
      logger.error('Error getting skip trace result', { 
        lookupId: req.params.lookupId,
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get skip trace result',
        error: error.message
      });
    }
  };

  /**
   * Get skip trace statistics for analytics
   * GET /api/skip-trace/stats
   */
  getSkipTraceStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userContext = extractUserContext(req);
      const userId = userContext.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      logger.info('Getting skip trace stats', { userId });

      // Get user statistics
      const statsResult = await query(`
        SELECT 
          COALESCE(stc.total_lookups_performed, 0) as total_lookups,
          COALESCE(stc.total_free_credits_used + stc.total_paid_credits_used, 0) as credits_used,
          COALESCE(stc.free_credits_remaining + stc.paid_credits_remaining, 3) as credits_remaining,
          
          -- Calculate success rate
          CASE 
            WHEN COUNT(str.lookup_id) > 0 THEN
              ROUND(
                COUNT(CASE WHEN str.api_response_status = 'success' THEN 1 END) * 100.0 / COUNT(str.lookup_id),
                2
              )
            ELSE 0
          END as success_rate,
          
          -- Average contact info found
          COALESCE(AVG(str.phone_count), 0) as avg_phone_numbers,
          COALESCE(AVG(str.email_count), 0) as avg_emails
          
        FROM skip_trace_credits stc
        LEFT JOIN skip_trace_user_access sua ON stc.user_id = sua.user_id
        LEFT JOIN skip_trace_results str ON sua.lookup_id = str.lookup_id
        WHERE stc.user_id = $1
        GROUP BY stc.user_id, stc.total_lookups_performed, stc.total_free_credits_used, 
                 stc.total_paid_credits_used, stc.free_credits_remaining, stc.paid_credits_remaining
      `, [userId]);

      const stats = statsResult.rows[0] || {
        total_lookups: 0,
        success_rate: 0,
        avg_phone_numbers: 0,
        avg_emails: 0,
        credits_used: 0,
        credits_remaining: 3
      };

      res.status(200).json({
        success: true,
        stats: {
          totalLookups: parseInt(stats.total_lookups),
          successRate: parseFloat(stats.success_rate),
          avgPhoneNumbers: parseFloat(stats.avg_phone_numbers),
          avgEmails: parseFloat(stats.avg_emails),
          creditsUsed: parseInt(stats.credits_used),
          creditsRemaining: parseInt(stats.credits_remaining)
        }
      });

    } catch (error: any) {
      logger.error('Error getting skip trace stats', { 
        error: error.message 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get skip trace statistics',
        error: error.message
      });
    }
  };

  /**
   * Helper method to parse contact arrays from JSON
   */
  private parseContactArray(contactJson: any): any[] {
    try {
      // If it's already an array, return it
      if (Array.isArray(contactJson)) {
        return contactJson;
      }
      
      // If it's a string, try to parse it as JSON
      if (typeof contactJson === 'string') {
        const parsed = JSON.parse(contactJson);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      // If it's null or undefined, return empty array
      if (contactJson == null) {
        return [];
      }
      
      // For any other type, return empty array
      return [];
    } catch (error) {
      console.error('Error parsing contact array:', error, 'Input:', contactJson);
      return [];
    }
  }

  /**
   * Helper method to parse owner names into consistent format for frontend
   */
  private parseOwnerNames(ownerNamesJson: any): any[] {
    try {
      let ownerData = ownerNamesJson;
      
      // Parse string JSON if needed
      if (typeof ownerNamesJson === 'string') {
        ownerData = JSON.parse(ownerNamesJson);
      }
      
      if (!Array.isArray(ownerData)) {
        return [];
      }
      
      // Transform to consistent frontend format
      return ownerData.map((owner, index) => {
        // If owner is just a string (legacy format)
        if (typeof owner === 'string') {
          return {
            name: owner,
            confidence: 0.5,
            matchType: 'legacy',
            propertyAddress: 'Unknown'
          };
        }
        
        // If owner is an object, try to extract name consistently
        if (typeof owner === 'object' && owner !== null) {
          // Try different name formats
          let name = owner.name || '';
          
          // Handle nested person_name structure
          if (!name && owner.owner?.person_name) {
            const first = owner.owner.person_name.first_name || '';
            const last = owner.owner.person_name.last_name || '';
            name = `${first} ${last}`.trim();
          }
          
          // Handle direct first_name/last_name
          if (!name && (owner.first_name || owner.last_name)) {
            const first = owner.first_name || '';
            const last = owner.last_name || '';
            name = `${first} ${last}`.trim();
          }
          
          return {
            name: name || `Owner ${index + 1}`,
            confidence: owner.confidence || owner.matchConfidence || 0.5,
            matchType: owner.matchType || 'unknown',
            propertyAddress: owner.propertyAddress || 'Unknown',
            // Preserve original structure for debugging
            _original: owner
          };
        }
        
        return {
          name: `Owner ${index + 1}`,
          confidence: 0.5,
          matchType: 'fallback',
          propertyAddress: 'Unknown'
        };
      });
      
    } catch (error) {
      console.error('Error parsing owner names:', error, 'Input:', ownerNamesJson);
      return [];
    }
  }
}

export default new SkipTraceController(); 