import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as specialistService from '../services/specialistCallback/specialistService';

/**
 * Get all specialist call requests
 */
export const getAllSpecialistCalls: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const calls = await specialistService.getAllSpecialistCalls();
    if (!calls || calls.length === 0) {
      res.status(404).send('No specialist calls found');
    } else {
      res.status(200).json(calls);
    }
  } catch (error) {
    console.error('Error getting specialist calls:', error);
    res.status(500).json({ message: 'Server error while retrieving specialist calls' });
  }
};

/**
 * Get latest specialist call requests (one per user)
 */
export const getLatestSpecialistCalls: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const calls = await specialistService.getLatestSpecialistCalls();
    if (!calls || calls.length === 0) {
      res.status(404).send('No specialist calls found');
    } else {
      res.status(200).json(calls);
    }
  } catch (error) {
    console.error('Error getting latest specialist calls:', error);
    res.status(500).json({ message: 'Server error while retrieving latest specialist calls' });
  }
};

/**
 * Request a specialist call
 * Supports both formats:
 * - New format: { user_id, mobile_number, property_address }
 * - Frontend format: { userId, phoneNumber, propertyAddress, requestedAt }
 */
export const requestSpecialistCall: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Handle both request formats
    const { 
      user_id, mobile_number, property_address, // New format
      userId, phoneNumber, propertyAddress, requestedAt // Frontend format
    } = req.body;
    
    // Determine which format is being used
    const actualUserId = user_id || userId || null;
    const actualMobileNumber = mobile_number || phoneNumber || null;
    const actualPropertyAddress = property_address || propertyAddress || '';
    
    // For anonymous users, only phone number is required
    if (!actualMobileNumber) {
      res.status(400).json({ message: 'A phone number is required' });
      return;
    }
    
    // Create request with appropriate parameters
    const result = await specialistService.createSpecialistCallRequest(
      actualUserId,
      actualMobileNumber,
      actualPropertyAddress,
      requestedAt || undefined
    );
    
    if (!result.success) {
      res.status(result.code || 400).json({ message: result.message });
      return;
    }
    
    // Return response in format expected by frontend
    res.status(200).json({ 
      success: true,
      message: 'Call request received', 
      requestId: result.id 
    });
  } catch (error: any) {
    console.error('Error creating specialist call request:', error);
    res.status(500).json({ 
      success: false,
      message: `Failed to save specialist call: ${error.message}` 
    });
  }
};