import { Request, Response } from 'express';
import { StateInterestModel, CreateStateInterestRequest } from '../models/stateInterest/stateInterestModel';
import logger from '../utils/logger';

/**
 * Create a new state interest request
 */
export const createStateInterest = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== State Interest Request Received ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { userId, email, states, source } = req.body;

    // Validation
    if (!email || !states || !Array.isArray(states) || states.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Email and states array are required'
      });
      return;
    }

    if (!source) {
      res.status(400).json({
        success: false,
        message: 'Source is required'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
      return;
    }

    // State validation and normalization
    const validStates = new Map([
      // Two-letter codes
      ['AL', 'AL'], ['AK', 'AK'], ['AZ', 'AZ'], ['AR', 'AR'], ['CA', 'CA'],
      ['CO', 'CO'], ['CT', 'CT'], ['DE', 'DE'], ['FL', 'FL'], ['GA', 'GA'],
      ['HI', 'HI'], ['ID', 'ID'], ['IL', 'IL'], ['IN', 'IN'], ['IA', 'IA'],
      ['KS', 'KS'], ['KY', 'KY'], ['LA', 'LA'], ['ME', 'ME'], ['MD', 'MD'],
      ['MA', 'MA'], ['MI', 'MI'], ['MN', 'MN'], ['MS', 'MS'], ['MO', 'MO'],
      ['MT', 'MT'], ['NE', 'NE'], ['NV', 'NV'], ['NH', 'NH'], ['NJ', 'NJ'],
      ['NM', 'NM'], ['NY', 'NY'], ['NC', 'NC'], ['ND', 'ND'], ['OH', 'OH'],
      ['OK', 'OK'], ['OR', 'OR'], ['PA', 'PA'], ['RI', 'RI'], ['SC', 'SC'],
      ['SD', 'SD'], ['TN', 'TN'], ['TX', 'TX'], ['UT', 'UT'], ['VT', 'VT'],
      ['VA', 'VA'], ['WA', 'WA'], ['WV', 'WV'], ['WI', 'WI'], ['WY', 'WY'],
      // Full names
      ['ALABAMA', 'AL'], ['ALASKA', 'AK'], ['ARIZONA', 'AZ'], ['ARKANSAS', 'AR'], ['CALIFORNIA', 'CA'],
      ['COLORADO', 'CO'], ['CONNECTICUT', 'CT'], ['DELAWARE', 'DE'], ['FLORIDA', 'FL'], ['GEORGIA', 'GA'],
      ['HAWAII', 'HI'], ['IDAHO', 'ID'], ['ILLINOIS', 'IL'], ['INDIANA', 'IN'], ['IOWA', 'IA'],
      ['KANSAS', 'KS'], ['KENTUCKY', 'KY'], ['LOUISIANA', 'LA'], ['MAINE', 'ME'], ['MARYLAND', 'MD'],
      ['MASSACHUSETTS', 'MA'], ['MICHIGAN', 'MI'], ['MINNESOTA', 'MN'], ['MISSISSIPPI', 'MS'], ['MISSOURI', 'MO'],
      ['MONTANA', 'MT'], ['NEBRASKA', 'NE'], ['NEVADA', 'NV'], ['NEW HAMPSHIRE', 'NH'], ['NEW JERSEY', 'NJ'],
      ['NEW MEXICO', 'NM'], ['NEW YORK', 'NY'], ['NORTH CAROLINA', 'NC'], ['NORTH DAKOTA', 'ND'], ['OHIO', 'OH'],
      ['OKLAHOMA', 'OK'], ['OREGON', 'OR'], ['PENNSYLVANIA', 'PA'], ['RHODE ISLAND', 'RI'], ['SOUTH CAROLINA', 'SC'],
      ['SOUTH DAKOTA', 'SD'], ['TENNESSEE', 'TN'], ['TEXAS', 'TX'], ['UTAH', 'UT'], ['VERMONT', 'VT'],
      ['VIRGINIA', 'VA'], ['WASHINGTON', 'WA'], ['WEST VIRGINIA', 'WV'], ['WISCONSIN', 'WI'], ['WYOMING', 'WY']
    ]);

    // Validate and normalize states
    const validatedStates: string[] = [];
    const invalidStates: string[] = [];

    for (const state of states) {
      if (typeof state !== 'string') {
        res.status(400).json({
          success: false,
          message: 'All states must be strings'
        });
        return;
      }

      const normalizedState = state.trim().toUpperCase();
      const validStateCode = validStates.get(normalizedState);
      
      if (validStateCode) {
        validatedStates.push(validStateCode);
      } else {
        invalidStates.push(normalizedState);
      }
    }

    if (invalidStates.length > 0) {
      res.status(400).json({
        success: false,
        message: `Invalid state(s): ${invalidStates.join(', ')}. Please use valid state names or two-letter codes.`
      });
      return;
    }

    if (validatedStates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one valid state is required'
      });
      return;
    }

    // Check for duplicate request
    const isDuplicate = await StateInterestModel.checkDuplicate(email, validatedStates);
    if (isDuplicate) {
      logger.info('Duplicate state interest request attempted', { email, states: validatedStates });
      res.status(200).json({
        success: true,
        message: 'We already have your interest for these states recorded!',
        duplicate: true
      });
      return;
    }

    // Get IP address and user agent for analytics
    const ipAddress = req.ip || (req.connection as any)?.remoteAddress || null;
    const userAgent = req.get('User-Agent') || null;

    // Use the userId directly from request body (already converted to number by frontend)
    const resolvedUserId = userId;

    // Create the request data
    const requestData: CreateStateInterestRequest = {
      user_id: resolvedUserId ? parseInt(resolvedUserId.toString(), 10) : null,
      email: email.toLowerCase().trim(),
      states: validatedStates,
      source,
      ip_address: ipAddress,
      user_agent: userAgent
    };

    // Create the state interest request
    const result = await StateInterestModel.create(requestData);

    logger.info('State interest request created successfully', {
      request_id: result.request_id,
      email: requestData.email,
      states: validatedStates,
      source,
      user_id: requestData.user_id
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! We\'ll notify you when we expand to your selected states.',
      data: {
        request_id: result.request_id,
        email: result.email,
        states: result.states,
        source: result.source,
        created_at: result.created_at
      }
    });

  } catch (error: any) {
    logger.error('Error creating state interest request', {
      error: error.message,
      body: req.body,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create state interest request',
      error: error.message
    });
  }
};

/**
 * Get state interest requests for current user or by email
 */
export const getStateInterests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;
    
    // Get user ID using the same pattern as other controllers
    const userId = (req as any).userId || 
      req.params.userId || 
      req.query.userId || 
      req.body.userId || 
      req.headers['x-user-id'];

    let requests;

    if (email && typeof email === 'string') {
      // Get by email (admin functionality)
      requests = await StateInterestModel.getByEmail(email);
    } else if (userId) {
      // Get by user ID
      const userIdNum = parseInt(userId.toString(), 10);
      if (isNaN(userIdNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
        return;
      }
      requests = await StateInterestModel.getByUserId(userIdNum);
    } else {
      res.status(400).json({
        success: false,
        message: 'Either email parameter or user authentication is required'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: requests
    });

  } catch (error: any) {
    logger.error('Error fetching state interest requests', {
      error: error.message,
      query: req.query
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch state interest requests',
      error: error.message
    });
  }
};

/**
 * Update state interest request status
 */
export const updateStateInterestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!requestId || isNaN(Number(requestId))) {
      res.status(400).json({
        success: false,
        message: 'Valid request ID is required'
      });
      return;
    }

    if (!status || !['active', 'notified', 'unsubscribed'].includes(status)) {
      res.status(400).json({
        success: false,
        message: 'Valid status is required (active, notified, unsubscribed)'
      });
      return;
    }

    const updatedRequest = await StateInterestModel.updateStatus(Number(requestId), status);

    if (!updatedRequest) {
      res.status(404).json({
        success: false,
        message: 'State interest request not found'
      });
      return;
    }

    logger.info('State interest request status updated', {
      request_id: requestId,
      status,
      email: updatedRequest.email
    });

    res.status(200).json({
      success: true,
      message: 'Request status updated successfully',
      data: updatedRequest
    });

  } catch (error: any) {
    logger.error('Error updating state interest request status', {
      error: error.message,
      params: req.params,
      body: req.body
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update state interest request status',
      error: error.message
    });
  }
};


