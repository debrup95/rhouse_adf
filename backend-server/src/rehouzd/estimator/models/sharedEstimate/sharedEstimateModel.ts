import { query } from '../../config/db';
import logger from '../../utils/logger';

export interface SharedEstimate {
  id?: string; // UUID
  savedEstimateId: number;
  shareToken: string;
  isActive: boolean;
  expiresAt: Date;
  viewCount: number;
  interactionCount: number;
  lastAccessed?: Date;
  sharedByUserId: number;
  reportStrategy: 'rent' | 'flip';
  reportType?: 'investor' | 'seller'; // Add report type to distinguish between investor and seller reports
  presetValues?: Record<string, number>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SharedEstimateAnalytics {
  id?: number;
  sharedEstimateId: string;
  eventType: string;
  eventData?: any;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  sessionId?: string;
  countryCode?: string;
  city?: string;
  userTimezone?: string;
  deviceType?: string;
  browserName?: string;
  osName?: string;
  createdAt?: Date;
}

export interface CreateSharedEstimateData {
  savedEstimateId: number;
  sharedByUserId: number;
  expiresInHours?: number;
  reportStrategy: 'rent' | 'flip';
  reportType?: 'investor' | 'seller'; // Add report type to distinguish between investor and seller reports
  presetValues?: Record<string, number>;
}

export interface SharedEstimateWithDetails extends SharedEstimate {
  propertyAddress: string;
  estimateData: any;
  sharedByUser: {
    first_name: string;
    last_name: string;
    mobile_number: string;
    email: string;
  };
}

/**
 * Create a new shared estimate
 */
export const createSharedEstimate = async (data: CreateSharedEstimateData): Promise<SharedEstimate> => {
  try {
    // Generate unique share token
    const shareTokenResult = await query('SELECT generate_share_token() as token', []);
    const shareToken = shareTokenResult.rows[0].token;

    // Set expiration time (default 48 hours)
    const expiresInHours = data.expiresInHours || 48;
    
    const queryText = `
      INSERT INTO shared_estimates (
        saved_estimate_id,
        share_token,
        shared_by_user_id,
        expires_at,
        report_strategy,
        report_type,
        preset_values
      ) 
      VALUES ($1, $2, $3, NOW() + INTERVAL '${expiresInHours} hours', $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      data.savedEstimateId,
      shareToken,
      data.sharedByUserId,
      data.reportStrategy,
      data.reportType || 'investor', // Default to 'investor' for backward compatibility
      data.presetValues || null,
    ];

    const result = await query(queryText, values);
    const sharedEstimate = result.rows[0];
    
    logger.info('Created shared estimate', {
      id: sharedEstimate.id,
      shareToken: sharedEstimate.share_token,
      savedEstimateId: data.savedEstimateId,
      sharedByUserId: data.sharedByUserId,
      expiresAt: sharedEstimate.expires_at,
    });
    
    return {
      id: sharedEstimate.id,
      savedEstimateId: sharedEstimate.saved_estimate_id,
      shareToken: sharedEstimate.share_token,
      isActive: sharedEstimate.is_active,
      expiresAt: sharedEstimate.expires_at,
      viewCount: sharedEstimate.view_count,
      interactionCount: sharedEstimate.interaction_count,
      lastAccessed: sharedEstimate.last_accessed,
      sharedByUserId: sharedEstimate.shared_by_user_id,
      reportStrategy: sharedEstimate.report_strategy,
      presetValues: sharedEstimate.preset_values || null,
      createdAt: sharedEstimate.created_at,
      updatedAt: sharedEstimate.updated_at,
    };
  } catch (error: any) {
    logger.error('Error creating shared estimate', { error: error.message, data });
    throw error;
  }
};

/**
 * Get shared estimate by token with estimate data
 */
export const getSharedEstimateByToken = async (shareToken: string): Promise<SharedEstimateWithDetails | null> => {
  try {
    // First check if the shared estimate is valid
    const isValidResult = await query('SELECT is_shared_estimate_valid($1) as is_valid', [shareToken]);
    
    if (!isValidResult.rows[0]?.is_valid) {
      return null;
    }

    // Increment view count
    await query('SELECT increment_shared_estimate_view($1)', [shareToken]);

    // Get the shared estimate with saved estimate data and user contact information
    const queryText = `
      SELECT
        se.id,
        se.saved_estimate_id,
        se.share_token,
        se.is_active,
        se.expires_at,
        se.view_count + 1 as view_count, -- Include the increment we just made
        se.interaction_count,
        se.last_accessed,
        se.shared_by_user_id,
        se.report_strategy,
        se.report_type,
        se.preset_values,
        se.created_at,
        se.updated_at,
        sav.property_address,
        sav.estimate_data,
        u.first_name,
        u.last_name,
        u.mobile_number,
        u.email
      FROM shared_estimates se
      JOIN saved_estimates sav ON se.saved_estimate_id = sav.id
      JOIN users u ON se.shared_by_user_id = u.user_id
      WHERE se.share_token = $1
      AND se.is_active = TRUE
      AND se.expires_at > NOW()
    `;

    const result = await query(queryText, [shareToken]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    return {
      id: row.id,
      savedEstimateId: row.saved_estimate_id,
      shareToken: row.share_token,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      viewCount: row.view_count,
      interactionCount: row.interaction_count,
      lastAccessed: row.last_accessed,
      sharedByUserId: row.shared_by_user_id,
      reportStrategy: row.report_strategy,
      presetValues: row.preset_values || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      propertyAddress: row.property_address,
      estimateData: row.estimate_data,
      sharedByUser: {
        first_name: row.first_name,
        last_name: row.last_name,
        mobile_number: row.mobile_number,
        email: row.email,
      },
    };
  } catch (error: any) {
    logger.error('Error getting shared estimate by token', { error: error.message, shareToken });
    throw error;
  }
};

/**
 * Update shared estimate interaction count
 */
export const incrementInteractionCount = async (shareToken: string): Promise<void> => {
  try {
    await query('SELECT increment_shared_estimate_interaction($1)', [shareToken]);
  } catch (error: any) {
    logger.error('Error incrementing interaction count', { error: error.message, shareToken });
    throw error;
  }
};

/**
 * Get all shared estimates for a user
 */
export const getUserSharedEstimates = async (userId: number): Promise<SharedEstimateWithDetails[]> => {
  try {
    const queryText = `
      SELECT
        se.id,
        se.saved_estimate_id,
        se.share_token,
        se.is_active,
        se.expires_at,
        se.view_count,
        se.interaction_count,
        se.last_accessed,
        se.shared_by_user_id,
        se.report_strategy,
        se.report_type,
        se.preset_values,
        se.created_at,
        se.updated_at,
        sav.property_address,
        sav.estimate_data,
        u.first_name,
        u.last_name,
        u.mobile_number,
        u.email
      FROM shared_estimates se
      JOIN saved_estimates sav ON se.saved_estimate_id = sav.id
      JOIN users u ON se.shared_by_user_id = u.user_id
      WHERE se.shared_by_user_id = $1
      ORDER BY se.created_at DESC
    `;

    const result = await query(queryText, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      savedEstimateId: row.saved_estimate_id,
      shareToken: row.share_token,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      viewCount: row.view_count,
      interactionCount: row.interaction_count,
      lastAccessed: row.last_accessed,
      sharedByUserId: row.shared_by_user_id,
      reportStrategy: row.report_strategy,
      presetValues: row.preset_values || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      propertyAddress: row.property_address,
      estimateData: row.estimate_data,
      sharedByUser: {
        first_name: row.first_name,
        last_name: row.last_name,
        mobile_number: row.mobile_number,
        email: row.email,
      },
    }));
  } catch (error: any) {
    logger.error('Error getting user shared estimates', { error: error.message, userId });
    throw error;
  }
};

/**
 * Deactivate a shared estimate
 */
export const deactivateSharedEstimate = async (shareToken: string, userId: number): Promise<boolean> => {
  try {
    const queryText = `
      UPDATE shared_estimates 
      SET is_active = FALSE, updated_at = NOW()
      WHERE share_token = $1 AND shared_by_user_id = $2
      RETURNING id
    `;

    const result = await query(queryText, [shareToken, userId]);
    const success = result.rows.length > 0;
    
    if (success) {
      logger.info('Deactivated shared estimate', { shareToken, userId });
    }
    
    return success;
  } catch (error: any) {
    logger.error('Error deactivating shared estimate', { error: error.message, shareToken, userId });
    throw error;
  }
};

/**
 * Extend shared estimate expiration
 */
export const extendSharedEstimateExpiration = async (shareToken: string, userId: number, additionalHours: number = 48): Promise<boolean> => {
  try {
    const queryText = `
      UPDATE shared_estimates 
      SET expires_at = expires_at + INTERVAL '${additionalHours} hours', updated_at = NOW()
      WHERE share_token = $1 AND shared_by_user_id = $2 AND is_active = TRUE
      RETURNING id, expires_at
    `;

    const result = await query(queryText, [shareToken, userId]);
    const success = result.rows.length > 0;
    
    if (success) {
      logger.info('Extended shared estimate expiration', {
        shareToken,
        userId,
        additionalHours,
        newExpiresAt: result.rows[0].expires_at,
      });
    }
    
    return success;
  } catch (error: any) {
    logger.error('Error extending shared estimate expiration', { error: error.message, shareToken, userId, additionalHours });
    throw error;
  }
};

/**
 * Log analytics event
 */
export const logAnalyticsEvent = async (data: SharedEstimateAnalytics): Promise<void> => {
  try {
    const queryText = `
      SELECT log_shared_estimate_event(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
    `;

    const values = [
      data.sharedEstimateId,
      data.eventType,
      data.eventData ? JSON.stringify(data.eventData) : null,
      data.userAgent,
      data.ipAddress,
      data.referrer,
      data.sessionId,
      data.countryCode,
      data.city,
      data.userTimezone,
      data.deviceType || 'unknown',
      data.browserName,
      data.osName,
    ];

    await query(queryText, values);
  } catch (error: any) {
    logger.error('Error logging analytics event', { error: error.message, data });
    // Don't throw - analytics failures shouldn't break the user experience
  }
};

/**
 * Get analytics summary for a shared estimate
 */
export const getSharedEstimateAnalytics = async (sharedEstimateId: string): Promise<any> => {
  try {
    const queryText = `
      SELECT * FROM get_shared_estimate_analytics_summary($1)
    `;

    const result = await query(queryText, [sharedEstimateId]);
    return result.rows[0] || null;
  } catch (error: any) {
    logger.error('Error getting shared estimate analytics', { error: error.message, sharedEstimateId });
    throw error;
  }
};

/**
 * Get user shared estimate statistics
 */
export const getUserSharedEstimateStats = async (userId: number): Promise<any> => {
  try {
    const queryText = `
      SELECT * FROM get_user_shared_estimates_stats($1)
    `;

    const result = await query(queryText, [userId]);
    return result.rows[0] || null;
  } catch (error: any) {
    logger.error('Error getting user shared estimate stats', { error: error.message, userId });
    throw error;
  }
};