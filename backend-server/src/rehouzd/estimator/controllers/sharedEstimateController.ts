import { Request, Response } from 'express';
import {
  createSharedEstimate,
  getSharedEstimateByToken,
  getUserSharedEstimates,
  deactivateSharedEstimate,
  extendSharedEstimateExpiration,
  logAnalyticsEvent,
  getSharedEstimateAnalytics,
  getUserSharedEstimateStats,
  incrementInteractionCount,
} from '../models/sharedEstimate/sharedEstimateModel';
import { getSavedEstimateById } from '../models/estimate/savedEstimateModel';
import { PropertyService } from '../services/property/propertyService';
import logger from '../utils/logger';

/**
 * Create a new shared estimate link (supports both interactive estimates and PDF reports)
 * POST /api/shared-estimates/create
 */
export const createSharedEstimateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      savedEstimateId, 
      expiresInHours, 
      reportStrategy, // 'rent' | 'flip' - REQUIRED for PDF reports
      reportType = 'investor', // 'investor' | 'seller' - defaults to 'investor' for backward compatibility
      presetValues // rehab calculator values for PDF reports
    } = req.body;
    
    // Debug logs to understand the request structure (similar to other controllers)
    logger.info('Create shared estimate request debug', {
      params: req.params,
      query: req.query,
      body: req.body,
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'authorization': req.headers.authorization ? 'present' : 'missing'
      }
    });

    // Try multiple ways to get user ID (same pattern as skipTraceController and stateInterestController)
    // Also check user_id (like saved estimates endpoint) for consistency
    const userId = (req as any).userId || 
                   req.params.userId || 
                   req.query.userId || 
                   req.body.userId || 
                   req.body.user_id ||  // Check for user_id like saved estimates
                   req.headers['x-user-id'];

    logger.info('Share estimate extracting userId', { 
      userId, 
      userIdType: typeof userId,
      savedEstimateId,
      expiresInHours 
    });

    // Validate request
    if (!savedEstimateId) {
      logger.warn('Share estimate missing savedEstimateId', { body: req.body });
      res.status(400).json({
        success: false,
        message: 'Missing required field: savedEstimateId',
      });
      return;
    }

    if (!reportStrategy) {
      logger.warn('Share estimate missing reportStrategy', { body: req.body });
      res.status(400).json({
        success: false,
        message: 'Missing required field: reportStrategy (rent or flip)',
      });
      return;
    }

    // Parse and validate savedEstimateId
    const savedEstimateIdNum = parseInt(savedEstimateId.toString(), 10);
    if (isNaN(savedEstimateIdNum)) {
      logger.warn('Share estimate invalid savedEstimateId format', { 
        savedEstimateId, 
        savedEstimateIdType: typeof savedEstimateId 
      });
      res.status(400).json({
        success: false,
        message: 'Invalid saved estimate ID format',
      });
      return;
    }

    if (!userId) {
      logger.warn('Share estimate missing userId', { 
        body: req.body, 
        headers: { 'x-user-id': req.headers['x-user-id'] }
      });
      res.status(401).json({
        success: false,
        message: 'User authentication required - userId missing from request',
      });
      return;
    }

    // Parse userId to number (consistent with other controllers)
    const userIdNum = parseInt(userId.toString(), 10);
    if (isNaN(userIdNum)) {
      logger.warn('Share estimate invalid userId format', { 
        userId, 
        userIdType: typeof userId 
      });
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
      return;
    }

    // Verify the saved estimate exists and belongs to the user
    logger.info('Looking up saved estimate', { savedEstimateId: savedEstimateIdNum });
    const savedEstimate = await getSavedEstimateById(savedEstimateIdNum);
    if (!savedEstimate) {
      logger.warn('Saved estimate not found', { savedEstimateId: savedEstimateIdNum });
      res.status(404).json({
        success: false,
        message: 'Saved estimate not found',
      });
      return;
    }

    // Parse savedEstimate.user_id to number for proper comparison
    const savedEstimateUserId = parseInt(savedEstimate.user_id.toString(), 10);
    
    logger.info('Verifying estimate ownership', { 
      savedEstimateUserId: savedEstimate.user_id, 
      savedEstimateUserIdType: typeof savedEstimate.user_id,
      savedEstimateUserIdParsed: savedEstimateUserId,
      requestingUserId: userIdNum, 
      requestingUserIdType: typeof userIdNum 
    });

    if (savedEstimateUserId !== userIdNum) {
      logger.warn('User attempting to share estimate they do not own', {
        savedEstimateUserId: savedEstimate.user_id,
        savedEstimateUserIdParsed: savedEstimateUserId,
        requestingUserId: userIdNum,
        savedEstimateId: savedEstimateIdNum,
        comparisonResult: `${savedEstimateUserId} !== ${userIdNum}`
      });
      res.status(403).json({
        success: false,
        message: 'You can only share your own estimates',
      });
      return;
    }

    logger.info('Ownership verification passed', {
      savedEstimateUserIdParsed: savedEstimateUserId,
      requestingUserId: userIdNum,
      match: savedEstimateUserId === userIdNum
    });

    // Create the shared estimate with PDF report support
    logger.info('Creating shared PDF report', { 
      savedEstimateId: savedEstimateIdNum, 
      sharedByUserId: userIdNum, 
      expiresInHours,
      reportStrategy
    });
    const sharedEstimate = await createSharedEstimate({
      savedEstimateId: savedEstimateIdNum,
      sharedByUserId: userIdNum,
      expiresInHours,
      reportStrategy,
      reportType,
      presetValues,
    });

    // Generate the share URL for PDF reports based on report type
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareUrl = reportType === 'seller' 
      ? `${baseUrl}/shared/seller-report/${sharedEstimate.shareToken}`
      : `${baseUrl}/shared/report/${sharedEstimate.shareToken}`;

    logger.info('Created shared estimate', {
      sharedEstimateId: sharedEstimate.id,
      shareToken: sharedEstimate.shareToken,
      userId: userIdNum,
      savedEstimateId: savedEstimateIdNum,
    });

    res.status(201).json({
      success: true,
      data: {
        shareToken: sharedEstimate.shareToken,
        shareUrl,
        expiresAt: sharedEstimate.expiresAt.toISOString(),
        estimateData: sharedEstimate,
      },
    });
  } catch (error: any) {
    logger.error('Error creating shared estimate', { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      message: 'Failed to create shared estimate',
      error: error.message,
    });
  }
};

/**
 * Get shared estimate by token (public endpoint)
 * GET /api/shared-estimates/:shareToken
 */
export const getSharedEstimateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareToken } = req.params;

    if (!shareToken) {
      res.status(400).json({
        success: false,
        message: 'Share token is required',
      });
      return;
    }

    // Get the shared estimate with saved estimate data
    const sharedEstimate = await getSharedEstimateByToken(shareToken);
    
    if (!sharedEstimate) {
      res.status(404).json({
        success: false,
        message: 'Shared estimate not found or expired',
      });
      return;
    }


    const response = {
      id: sharedEstimate.id,
      shareToken: sharedEstimate.shareToken,
      isActive: sharedEstimate.isActive,
      expiresAt: sharedEstimate.expiresAt.toISOString(),
      viewCount: sharedEstimate.viewCount,
      interactionCount: sharedEstimate.interactionCount,
      lastAccessed: sharedEstimate.lastAccessed?.toISOString(),
      createdAt: sharedEstimate.createdAt?.toISOString(),
      propertyAddress: sharedEstimate.propertyAddress,
      estimateData: sharedEstimate.estimateData,
      reportStrategy: sharedEstimate.reportStrategy,
      presetValues: sharedEstimate.presetValues,
      sharedByUser: sharedEstimate.sharedByUser,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    logger.error('Error getting shared estimate', { error: error.message, shareToken: req.params.shareToken });
    res.status(500).json({
      success: false,
      message: 'Failed to get shared estimate',
      error: error.message,
    });
  }
};

/**
 * Update shared estimate calculation (public endpoint)
 * PUT /api/shared-estimates/:shareToken/calculate
 */
export const updateSharedCalculationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareToken } = req.params;
    const { underwriteValues, filters } = req.body;

    if (!shareToken) {
      res.status(400).json({
        success: false,
        message: 'Share token is required',
      });
      return;
    }

    if (!underwriteValues) {
      res.status(400).json({
        success: false,
        message: 'Underwrite values are required',
      });
      return;
    }

    // Get the shared estimate
    const sharedEstimate = await getSharedEstimateByToken(shareToken);
    
    if (!sharedEstimate) {
      res.status(404).json({
        success: false,
        message: 'Shared estimate not found or expired',
      });
      return;
    }

    // Increment interaction count
    await incrementInteractionCount(shareToken);

    // Use ONLY stored data for shared estimate calculations - NO API calls
    const propertyData = null;

    // Update the estimate data with new underwrite values
    const updatedEstimateData = {
      ...sharedEstimate.estimateData,
      rent_underwrite_values: {
        ...sharedEstimate.estimateData.rent_underwrite_values,
        ...Object.entries(underwriteValues).reduce((acc, [key, value]) => {
          if (['rent', 'expense', 'capRate', 'highRehab'].includes(key)) {
            acc[key] = value;
          }
          return acc;
        }, {} as any),
      },
      flip_underwrite_values: {
        ...sharedEstimate.estimateData.flip_underwrite_values,
        ...Object.entries(underwriteValues).reduce((acc, [key, value]) => {
          if (['sellingCosts', 'holdingCosts', 'margin', 'highRehab'].includes(key)) {
            acc[key] = value;
          }
          return acc;
        }, {} as any),
      },
    };

    res.status(200).json({
      success: true,
      data: {
        estimateData: updatedEstimateData,
      },
    });
  } catch (error: any) {
    logger.error('Error updating shared calculation', { 
      error: error.message, 
      shareToken: req.params.shareToken,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update calculation',
      error: error.message,
    });
  }
};

/**
 * Get user's shared estimates (authenticated endpoint)
 * GET /api/shared-estimates/user/:userId
 */
export const getUserSharedEstimatesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    const sharedEstimates = await getUserSharedEstimates(parseInt(userId));
    
    // Format response data
    const formattedEstimates = sharedEstimates.map(estimate => ({
      id: estimate.id,
      shareToken: estimate.shareToken,
      propertyAddress: estimate.propertyAddress,
      isActive: estimate.isActive,
      expiresAt: estimate.expiresAt.toISOString(),
      createdAt: estimate.createdAt?.toISOString(),
      viewCount: estimate.viewCount,
      interactionCount: estimate.interactionCount,
      lastAccessed: estimate.lastAccessed?.toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: formattedEstimates,
    });
  } catch (error: any) {
    logger.error('Error getting user shared estimates', { error: error.message, userId: req.params.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to get shared estimates',
      error: error.message,
    });
  }
};

/**
 * Deactivate shared estimate (authenticated endpoint)
 * PUT /api/shared-estimates/:shareToken/deactivate
 */
export const deactivateSharedEstimateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareToken } = req.params;
    const { userId } = req.body;

    if (!shareToken || !userId) {
      res.status(400).json({
        success: false,
        message: 'Share token and user ID are required',
      });
      return;
    }

    const success = await deactivateSharedEstimate(shareToken, userId);
    
    if (!success) {
      res.status(404).json({
        success: false,
        message: 'Shared estimate not found or you do not have permission to deactivate it',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Shared estimate deactivated successfully',
    });
  } catch (error: any) {
    logger.error('Error deactivating shared estimate', { 
      error: error.message, 
      shareToken: req.params.shareToken,
      userId: req.body.userId,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate shared estimate',
      error: error.message,
    });
  }
};