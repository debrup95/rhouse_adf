import { query } from '../../config/db';
import logger from '../../utils/logger';

export interface SavedEstimate {
  id?: number;
  user_id: number;
  property_address: string;
  estimate_data: {
    property?: any;
    address?: any;
    addressState?: any;
    offer_range_low?: number;
    offer_range_high?: number;
    rent_underwrite_values?: {
      rent: number;
      expense: number;
      capRate: number;
      highRehab: number;
    };
    flip_underwrite_values?: {
      sellingCosts: number;
      holdingCosts: number;
      margin: number;
      highRehab: number;
    };
    notes?: string;
    active_investment_strategy?: string;
    timestamp?: string;
    [key: string]: any;
  };
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Save an estimate to the database
 */
export const saveEstimate = async (estimateData: SavedEstimate): Promise<SavedEstimate> => {
  try {
    const queryText = `
      INSERT INTO saved_estimates (
        user_id, 
        property_address, 
        estimate_data
      ) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `;
    const values = [
      estimateData.user_id,
      estimateData.property_address,
      estimateData.estimate_data
    ];

    const result = await query(queryText, values);
    logger.info(`Saved estimate for user ${estimateData.user_id} and property ${estimateData.property_address}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error in saveEstimate', { error });
    throw error;
  }
};

/**
 * Get all saved estimates for a specific user
 */
export const getSavedEstimatesForUser = async (userId: number): Promise<SavedEstimate[]> => {
  try {
    // Set a statement timeout of 25 seconds (less than typical 30s gateway timeout)
    await query('SET statement_timeout = 25000');
    
    const queryText = `
      SELECT * FROM saved_estimates 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(queryText, [userId]);
    return result.rows;
  } catch (error) {
    logger.error('Error in getSavedEstimatesForUser', { error });
    throw error;
  } finally {
    // Reset the statement timeout to default before releasing
    try {
      await query('SET statement_timeout = 0');
    } catch (resetError) {
      logger.error('Error resetting statement timeout', { resetError });
    }
  }
};

/**
 * Get a specific saved estimate by ID
 */
export const getSavedEstimateById = async (estimateId: number): Promise<SavedEstimate | null> => {
  try {
        const queryText = `
      SELECT * FROM saved_estimates 
      WHERE id = $1
    `;
    const result = await query(queryText, [estimateId]);

    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    logger.error('Error in getSavedEstimateById', { error });
    throw error;
  }
};

/**
 * Update a saved estimate
 */
export const updateSavedEstimate = async (estimateId: number, updateData: Partial<SavedEstimate>): Promise<SavedEstimate | null> => {
  try {
    // First check if the estimate exists
    const checkQueryText = `SELECT * FROM saved_estimates WHERE id = $1`;
    const checkResult = await query(checkQueryText, [estimateId]);
    
    if (checkResult.rows.length === 0) {
      return null;
    }
    
    // Get the existing estimate data
    const existingEstimateData = checkResult.rows[0].estimate_data || {};
    
    // Create the updated estimate_data by merging the existing data with the new data
    let updatedEstimateData = { ...existingEstimateData };
    
    // Handle updating the nested JSON data
    if (updateData.estimate_data) {
      updatedEstimateData = {
        ...updatedEstimateData,
        ...updateData.estimate_data
      };
    }
    
    // Build the update query
    const updateQueryText = `
      UPDATE saved_estimates 
      SET estimate_data = $1,
          property_address = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const updateValues = [
      updatedEstimateData,
      updateData.property_address || checkResult.rows[0].property_address,
      estimateId
    ];
    
    const result = await query(updateQueryText, updateValues);
    logger.info(`Updated saved estimate with ID ${estimateId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error in updateSavedEstimate', { error });
    throw error;
  }
};

/**
 * Delete a saved estimate
 */
export const deleteSavedEstimate = async (estimateId: number): Promise<boolean> => {
  try {
    const queryText = `
      DELETE FROM saved_estimates 
      WHERE id = $1
      RETURNING id
    `;
    const result = await query(queryText, [estimateId]);

    if (result.rows.length === 0) {
      return false;
    }
    
    logger.info(`Deleted saved estimate with ID ${estimateId}`);
    return true;
  } catch (error) {
    logger.error('Error in deleteSavedEstimate', { error });
    throw error;
  }
};

/**
 * Search saved estimates by address
 */
export const searchSavedEstimatesByAddress = async (userId: number, searchTerm: string): Promise<SavedEstimate[]> => {
  try {
    const queryText = `
      SELECT * FROM saved_estimates 
      WHERE user_id = $1 AND property_address ILIKE $2
      ORDER BY created_at DESC
    `;
    const result = await query(queryText, [userId, `%${searchTerm}%`]);
    return result.rows;
  } catch (error) {
    logger.error('Error in searchSavedEstimatesByAddress', { error });
    throw error;
  }
}; 