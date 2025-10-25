import {
  buyerModel,
  Buyer
} from '../../models/buyer/buyerModel';
import { buyerRankingService } from './buyerRankingService';

/**
 * Interface for property data used in matching
 */
interface PropertyData {
  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
  year_built?: number;
  zip_code?: string;
  city?: string;
  county?: string;
  estimated_price?: number;
}

/**
 * Interface for ranked buyers with their matching score details
 */
interface RankedBuyerResult {
  buyer: Buyer;
  score: number;
  category: 'active' | 'recent';
  matchDetails: {
    geographicScore: number;
    recencyScore: number;
    priceScore: number;
    characteristicsScore: number;
    activityScore: number;
  };
}

/**
 * Service for buyer matching functionality
 */
export class BuyerMatchingService {
  // Cache for storing active buyers
  private activeBuyersCache: Buyer[] | null = null;
  private lastCacheUpdateTime: number = 0;
  // Cache expiration time in milliseconds (12 hours)
  private CACHE_EXPIRATION_TIME = 12 * 60 * 60 * 1000;

  /**
   * Get all active buyers
   * @returns Promise<Buyer[]> Array of active buyers
   */
  public async getAllActiveBuyers(): Promise<Buyer[]> {
    try {
      // If we have a valid cache, use it
      if (this.isCacheValid()) {
        console.log('Using cached buyers list with', this.activeBuyersCache?.length || 0, 'buyers');
        return this.activeBuyersCache || [];
      }
      
      // Otherwise fetch from database and update cache
      console.log('Fetching buyers from database');
      
      try {
        const buyers = await buyerModel.getAllActiveBuyersWithHistory();
        
        // Update cache
        this.updateBuyersCache(buyers);
        
        return buyers;
      } catch (dbError) {
        console.error('Database error when fetching buyers:', dbError);
        
        // If we have stale cache data, use it as fallback
        if (this.activeBuyersCache && this.activeBuyersCache.length > 0) {
          console.log('Using stale cache as fallback with', this.activeBuyersCache.length, 'buyers');
          return this.activeBuyersCache;
        }
        
        // Try batch processing as secondary fallback
        try {
          console.log('Attempting batch processing as fallback');
          const buyers = await buyerModel.getAllActiveBuyersWithHistoryBatched(25); // Smaller batch size for safety
          
          // Update cache with batch results
          this.updateBuyersCache(buyers);
          
          return buyers;
        } catch (batchError) {
          console.error('Batch processing also failed:', batchError);
          
          // If no cache available, try to get buyers without purchase history as last resort
          console.log('Attempting to fetch buyers without purchase history as final fallback');
          const basicBuyers = await buyerModel.getAllActiveBuyers();
          
          // Add empty purchase history to maintain interface compatibility
          const buyersWithEmptyHistory = basicBuyers.map(buyer => ({
            ...buyer,
            purchase_history: []
          }));
          
          // Update cache with basic data
          this.updateBuyersCache(buyersWithEmptyHistory);
          
          return buyersWithEmptyHistory;
        }
      }
    } catch (error) {
      console.error('Service: Error fetching active buyers:', error);
      
      // Return empty array as final fallback to prevent complete failure
      console.log('Returning empty buyers array as final fallback');
      return [];
    }
  }

  /**
   * Check if the buyers cache is valid
   * @returns boolean Whether the cache is valid
   */
  private isCacheValid(): boolean {
    const currentTime = Date.now();
    return (
      this.activeBuyersCache !== null &&
      this.activeBuyersCache.length > 0 &&
      currentTime - this.lastCacheUpdateTime < this.CACHE_EXPIRATION_TIME
    );
  }

  /**
   * Update the buyers cache with new data
   * @param buyers The buyers list to cache
   */
  private updateBuyersCache(buyers: Buyer[]): void {
    this.activeBuyersCache = buyers;
    this.lastCacheUpdateTime = Date.now();
    console.log('Updated buyers cache with', buyers.length, 'buyers at', new Date().toISOString());
  }

  /**
   * Explicitly update the buyers cache with a new list
   * Called from frontend to ensure cache is available
   * @param buyers The buyers list to cache
   */
  public updateCache(buyers: Buyer[]): void {
    this.updateBuyersCache(buyers);
  }

  /**
   * Get all active buyers ranked for a specific property
   * @param propertyData Property data for matching
   * @returns Promise<RankedBuyerResult[]> Array of ranked buyers
   */
  public async getRankedBuyersForProperty(propertyData: PropertyData): Promise<RankedBuyerResult[]> {
    try {
      // Get all active buyers with their purchase history (using cache if available)
      const activeBuyers = await this.getAllActiveBuyers();
      
      console.log('[getRankedBuyersForProperty] Using', activeBuyers.length, 'buyers for ranking');
      
      // Use the ranking service to score and sort buyers
      return buyerRankingService.rankBuyers(activeBuyers, propertyData);
    } catch (error) {
      console.error('Service: Error fetching ranked buyers:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const buyerMatchingService = new BuyerMatchingService(); 