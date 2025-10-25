import { Request, Response } from 'express';
import { buyerMatchingService } from '../services/buyerMatching/buyerMatchingService';
import { transformBuyerData } from '../transformers/buyerTransformer';
import { buyerRankingService } from '../services/buyerMatching/buyerRankingService';

/**
 * Controller for buyer matching endpoints
 */
export class BuyerMatchingController {
  /**
   * Get all active buyers
   * @param req Express request
   * @param res Express response
   */
  public async getAllActiveBuyers(req: Request, res: Response): Promise<void> {
  try {
    const buyers = await buyerMatchingService.getAllActiveBuyers();

    res.status(200).json({
      success: true,
      data: buyers
    });
  } catch (error) {
      console.error('Controller: Error fetching active buyers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active buyers',
        error: error instanceof Error ? error.message : String(error)
    });
  }
  }

  // Cache refresh method removed - caches now auto-refresh after 12 hours
  
  /**
   * Get ranked buyers for a property
   * @param req Express request
   * @param res Express response
   */
  public async getRankedBuyersForProperty(req: Request, res: Response): Promise<void> {
    try {
      const propertyData = req.body;
      
      // Basic validation
      if (!propertyData) {
        res.status(400).json({
          success: false,
          message: 'Property data is required'
        });
        return;
      }      
      // Get ranked buyers
      const rankedBuyers = await buyerMatchingService.getRankedBuyersForProperty(propertyData);
      
      // Transform buyers for frontend
      const transformedBuyers = rankedBuyers.map(rankedBuyer => {
        return {
          ...transformBuyerData(rankedBuyer.buyer, rankedBuyer.category),
          score: rankedBuyer.score,
          matchDetails: rankedBuyer.matchDetails,
        };
      });
      
      res.status(200).json({
        success: true,
        data: transformedBuyers
      });
    } catch (error) {
      console.error('Controller: Error fetching ranked buyers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ranked buyers',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Export a singleton instance
export const buyerMatchingController = new BuyerMatchingController(); 