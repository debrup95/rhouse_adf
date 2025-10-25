import { Request, Response } from 'express';
import { 
  saveEstimate, 
  getSavedEstimatesForUser, 
  getSavedEstimateById, 
  deleteSavedEstimate, 
  searchSavedEstimatesByAddress,
  updateSavedEstimate
} from '../models/estimate/savedEstimateModel';
import logger from '../utils/logger';

/**
 * Save an estimate
 */
export const saveEstimateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      user_id, 
      property_address, 
      estimate_data
    } = req.body;

    // Validate request
    if (!user_id || !property_address || !estimate_data) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, property_address, estimate_data',
      });
      return;
    }

    // Save the estimate
    const savedEstimate = await saveEstimate({
      user_id,
      property_address,
      estimate_data
    });

    res.status(201).json({
      success: true,
      message: 'Estimate saved successfully',
      estimate: savedEstimate,
    });
  } catch (error) {
    logger.error('Error saving estimate', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to save estimate',
      error: (error as Error).message,
    });
  }
};

/**
 * Update an existing saved estimate
 */
export const updateSavedEstimateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estimateId } = req.params;
    const { 
      property_address, 
      estimate_data
    } = req.body;

    // Validate request
    if (!estimateId) {
      res.status(400).json({
        success: false,
        message: 'Estimate ID is required',
      });
      return;
    }

    // Update the estimate
    const updatedEstimate = await updateSavedEstimate(parseInt(estimateId), {
      property_address,
      estimate_data
    });

    if (!updatedEstimate) {
      res.status(404).json({
        success: false,
        message: 'Estimate not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Estimate updated successfully',
      estimate: updatedEstimate,
    });
  } catch (error) {
    logger.error('Error updating saved estimate', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update saved estimate',
      error: (error as Error).message,
    });
  }
};

/**
 * Get all saved estimates for a user
 */
export const getSavedEstimatesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Validate request
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    // Get all saved estimates for the user
    logger.info(`Fetching saved estimates for user ${userId}`);
    const savedEstimates = await getSavedEstimatesForUser(parseInt(userId));
    logger.info(`Successfully retrieved ${savedEstimates.length} estimates for user ${userId}`);

    res.status(200).json({
      success: true,
      count: savedEstimates.length,
      estimates: savedEstimates,
    });
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error';
    const errorStack = (error as Error).stack || '';
    
    logger.error('Error getting saved estimates', { 
      error: errorMessage,
      stack: errorStack,
      userId: req.params.userId
    });
    
    // Determine if it's a timeout error
    const isTimeout = errorMessage.includes('timeout') || 
                      errorMessage.includes('terminating connection due to statement timeout');
    
    if (isTimeout) {
      res.status(504).json({
        success: false,
        message: 'Request timed out while fetching saved estimates. Please try again.',
        error: errorMessage
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to get saved estimates',
        error: errorMessage
      });
    }
  }
};

/**
 * Get a specific saved estimate by ID
 */
export const getSavedEstimateByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estimateId } = req.params;

    // Validate request
    if (!estimateId) {
      res.status(400).json({
        success: false,
        message: 'Estimate ID is required',
      });
      return;
    }

    // Get the saved estimate
    const savedEstimate = await getSavedEstimateById(parseInt(estimateId));

    if (!savedEstimate) {
      res.status(404).json({
        success: false,
        message: 'Estimate not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      estimate: savedEstimate,
    });
  } catch (error) {
    logger.error('Error getting saved estimate', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get saved estimate',
      error: (error as Error).message,
    });
  }
};

/**
 * Delete a saved estimate
 */
export const deleteSavedEstimateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estimateId } = req.params;

    // Validate request
    if (!estimateId) {
      res.status(400).json({
        success: false,
        message: 'Estimate ID is required',
      });
      return;
    }

    // Delete the saved estimate
    const deleted = await deleteSavedEstimate(parseInt(estimateId));

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Estimate not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Estimate deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting saved estimate', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete saved estimate',
      error: (error as Error).message,
    });
  }
};

/**
 * Search saved estimates by address
 */
export const searchSavedEstimatesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { searchTerm } = req.query;

    // Validate request
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
      return;
    }

    if (!searchTerm || typeof searchTerm !== 'string') {
      // If no search term provided, return all estimates
      const savedEstimates = await getSavedEstimatesForUser(parseInt(userId));
      
      res.status(200).json({
        success: true,
        count: savedEstimates.length,
        estimates: savedEstimates,
      });
      return;
    }

    // Search saved estimates by address
    const searchResults = await searchSavedEstimatesByAddress(parseInt(userId), searchTerm);

    res.status(200).json({
      success: true,
      count: searchResults.length,
      estimates: searchResults,
    });
  } catch (error) {
    logger.error('Error searching saved estimates', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to search saved estimates',
      error: (error as Error).message,
    });
  }
}; 