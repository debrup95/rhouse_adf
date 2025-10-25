import rehabRepository from '../../repositories/rehabRepository';
import logger from '../../utils/logger';

/**
 * Interface for structured rehab cost data optimized for frontend calculations
 */
interface RehabCalculatorData {
  marketName: string;
  marketReferenceId: number;
  
  // Organized by category -> item -> tier/size lookup
  costData: {
    [categoryName: string]: {
      [itemCode: string]: {
        name: string;
        pricingBasis: 'sqft_floor' | 'sqft_wall' | 'fixed_fee' | 'per_window' | 'per_fixture';
        unitLabel: string;
        scope: string;
        costs: {
          [tier: number]: {
            [sizeName: string]: number;
          };
        };
      };
    };
  };
  
  // Quick tier determination rules
  tierRules: {
    1: { min: number, max: number };
    2: { min: number, max: number };
    3: { min: number, max: number };
  };
  
  // Size bracket rules
  sizeBrackets: {
    Small: { min: number, max: number };
    Medium: { min: number, max: number };
    Large: { min: number, max: number };
  };
}

/**
 * In-memory cache for rehab calculator data
 */
const rehabDataCache = new Map<string | number, RehabCalculatorData>();
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const cacheTimestamps = new Map<string | number, number>();

/**
 * Service for rehab cost calculations with caching
 */
class RehabService {
  
  /**
   * Get structured rehab calculator data for a market with caching
   * Now optimized to only pull relevant size bracket data when square footage is provided
   */
  async getRehabCalculatorData(
    state: string, 
    county: string,
    squareFootage?: number
  ): Promise<RehabCalculatorData | null> {
    try {
      logger.info('Getting rehab calculator data', { state, county, squareFootage });
      
      // Get market reference ID
      const marketReferenceId = await rehabRepository.getMarketReferenceId(state, county);
      if (!marketReferenceId) {
        logger.warn('No market found for location', { state, county });
        return null;
      }
      
      // Check cache first (use different cache keys for different size brackets)
      const cacheKey = squareFootage && squareFootage > 0 ? `${marketReferenceId}_${this.determineSizeBracket(squareFootage)}` : marketReferenceId;
      const cachedData = rehabDataCache.get(cacheKey);
      const cacheTime = cacheTimestamps.get(cacheKey);
      
      if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_EXPIRY_MS) {
        logger.info('Returning cached rehab data', { marketReferenceId, squareFootage, cacheKey });
        return cachedData;
      }
      
      // Fetch fresh data - always pull all tiers, but can still optimize by size if provided
      logger.info('Fetching fresh rehab data from database', { marketReferenceId, squareFootage });
      const [marketName, rawCostData] = await Promise.all([
        rehabRepository.getMarketName(marketReferenceId),
        squareFootage && squareFootage > 0 
          ? rehabRepository.getRehabCostsForMarketAndSize(marketReferenceId, Number(squareFootage))
          : rehabRepository.getRehabCostsForMarket(marketReferenceId)
      ]);
      
      // Structure the data for efficient frontend lookups
      const structuredData = this.structureRehabData(marketName, marketReferenceId, rawCostData);
      
      // Cache the result
      rehabDataCache.set(cacheKey, structuredData);
      cacheTimestamps.set(cacheKey, Date.now());
      
      logger.info('Cached fresh rehab data', { 
        marketReferenceId, 
        squareFootage,
        sizeBracket: squareFootage ? this.determineSizeBracket(squareFootage) : 'All',
        categories: Object.keys(structuredData.costData).length,
        totalItems: Object.values(structuredData.costData).reduce((sum, cat) => sum + Object.keys(cat).length, 0)
      });
      
      return structuredData;
    } catch (error) {
      logger.error('Error getting rehab calculator data', { error, state, county, squareFootage });
      return null;
    }
  }
  
  /**
   * Get rehab calculator data by market ID (for when we already know the market)
   */
  async getRehabCalculatorDataByMarketId(marketReferenceId: number): Promise<RehabCalculatorData | null> {
    try {
      // Check cache first
      const cachedData = rehabDataCache.get(marketReferenceId);
      const cacheTime = cacheTimestamps.get(marketReferenceId);
      
      if (cachedData && cacheTime && (Date.now() - cacheTime) < CACHE_EXPIRY_MS) {
        logger.info('Returning cached rehab data by market ID', { marketReferenceId });
        return cachedData;
      }
      
      // Fetch fresh data
      logger.info('Fetching fresh rehab data by market ID', { marketReferenceId });
      const [marketName, rawCostData] = await Promise.all([
        rehabRepository.getMarketName(marketReferenceId),
        rehabRepository.getRehabCostsForMarket(marketReferenceId)
      ]);
      
      const structuredData = this.structureRehabData(marketName, marketReferenceId, rawCostData);
      
      // Cache the result
      rehabDataCache.set(marketReferenceId, structuredData);
      cacheTimestamps.set(marketReferenceId, Date.now());
      
      return structuredData;
    } catch (error) {
      logger.error('Error getting rehab calculator data by market ID', { error, marketReferenceId });
      return null;
    }
  }
  
  /**
   * Structure raw database cost data for efficient frontend calculations
   */
  private structureRehabData(
    marketName: string, 
    marketReferenceId: number, 
    rawCostData: any[]
  ): RehabCalculatorData {
    const costData: RehabCalculatorData['costData'] = {};
    
    logger.info('Structuring rehab data', { 
      marketName, 
      marketReferenceId, 
      totalRecords: rawCostData.length 
    });
    
    // Track what tiers and sizes we actually have
    const foundTiers = new Set<number>();
    const foundSizes = new Set<string>();
    const foundCategories = new Set<string>();
    
    // Group data by category and item
    for (const cost of rawCostData) {
      const categoryName = cost.line_item.category.name;
      const itemCode = cost.line_item.code;
      const tier = cost.quality_tier.tier_number;
      const sizeName = cost.property_size.name;
      
      foundTiers.add(tier);
      foundSizes.add(sizeName);
      foundCategories.add(categoryName);
      
      // Initialize category if needed
      if (!costData[categoryName]) {
        costData[categoryName] = {};
      }
      
      // Initialize item if needed
      if (!costData[categoryName][itemCode]) {
        costData[categoryName][itemCode] = {
          name: cost.line_item.name,
          pricingBasis: cost.line_item.pricing_basis.code,
          unitLabel: cost.line_item.pricing_basis.unit_label || '',
          scope: cost.line_item.scope || '',
          costs: {}
        };
      }
      
      // Initialize tier if needed
      if (!costData[categoryName][itemCode].costs[tier]) {
        costData[categoryName][itemCode].costs[tier] = {};
      }
      
      // Set the cost amount
      costData[categoryName][itemCode].costs[tier][sizeName] = cost.cost_amount;
    
    }
    
    logger.info('Data structure summary', {
      foundCategories: Array.from(foundCategories),
      foundTiers: Array.from(foundTiers).sort(),
      foundSizes: Array.from(foundSizes),
      categoriesCount: Object.keys(costData).length
    });
    
    // Log a sample of the structured data for debugging
    const firstCategory = Object.keys(costData)[0];
    if (firstCategory) {
      const firstItem = Object.keys(costData[firstCategory])[0];
      if (firstItem) {
        logger.info('Sample structured data', {
          category: firstCategory,
          item: firstItem,
          itemData: costData[firstCategory][firstItem]
        });
      }
    }
    
    return {
      marketName,
      marketReferenceId,
      costData,
      tierRules: {
        1: { min: 0, max: 200000 },
        2: { min: 200000, max: 400000 },
        3: { min: 400000, max: Infinity }
      },
      sizeBrackets: {
        Small: { min: 0, max: 1400 },
        Medium: { min: 1400, max: 2400 },
        Large: { min: 2400, max: Infinity }
      }
    };
  }
  
  /**
   * Determine quality tier based on After Repair Value (ARV)
   */
  determineTier(afterRepairValue: number): number {
    if (afterRepairValue < 200000) return 1;
    if (afterRepairValue <= 400000) return 2;
    return 3;
  }
  
  /**
   * Determine size bracket based on property square footage
   */
  determineSizeBracket(squareFootage: number): 'Small' | 'Medium' | 'Large' {
    if (squareFootage < 1400) return 'Small';
    if (squareFootage <= 2400) return 'Medium';
    return 'Large';
  }
  
  /**
   * Clear cache for a specific market (useful for testing or data updates)
   */
  clearCache(marketReferenceId?: number): void {
    if (marketReferenceId) {
      rehabDataCache.delete(marketReferenceId);
      cacheTimestamps.delete(marketReferenceId);
      logger.info('Cleared cache for market', { marketReferenceId });
    } else {
      rehabDataCache.clear();
      cacheTimestamps.clear();
      logger.info('Cleared all rehab data cache');
    }
  }
  
  /**
   * Get cache statistics (useful for monitoring)
   */
  getCacheStats(): { size: number; markets: (string | number)[]; oldestCacheTime: number | null } {
    const markets = Array.from(rehabDataCache.keys());
    const timestamps = Array.from(cacheTimestamps.values());
    const oldestCacheTime = timestamps.length > 0 ? Math.min(...timestamps) : null;
    
    return {
      size: rehabDataCache.size,
      markets,
      oldestCacheTime
    };
  }
}

export default new RehabService(); 