import { SkipTraceResult } from '../store/skipTraceSlice';

interface CachedSkipTraceData {
  results: SkipTraceResult[];
  timestamp: number;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const CACHE_PREFIX = 'skipTrace_';

export class SkipTraceCacheUtils {
  /**
   * Get cached skip trace results for a user
   */
  static getCachedResults(userId: number): SkipTraceResult[] | null {
    try {
      const cacheKey = `${CACHE_PREFIX}${userId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }
      
      const cachedData: CachedSkipTraceData = JSON.parse(cached);
      const isExpired = Date.now() > (cachedData.timestamp + CACHE_DURATION);
      
      if (isExpired) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return cachedData.results;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Cache skip trace results for a user
   */
  static setCachedResults(userId: number, results: SkipTraceResult[]): void {
    try {
      const cacheKey = `${CACHE_PREFIX}${userId}`;
      const cacheData: CachedSkipTraceData = {
        results,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      // Silently handle cache error
    }
  }
  
  /**
   * Add a new skip trace result to existing cache
   */
  static addResultToCache(userId: number, newResult: SkipTraceResult): void {
    try {
      const existingResults = this.getCachedResults(userId) || [];
      
      // Avoid duplicates by filtering out existing result with same lookupId
      const filteredResults = existingResults.filter(
        result => result.lookupId !== newResult.lookupId
      );
      
      const updatedResults = [newResult, ...filteredResults];
      this.setCachedResults(userId, updatedResults);
    } catch (error) {
      // Silently handle cache error
    }
  }
  
  /**
   * Find a cached result for a specific buyer
   */
  static findCachedResultForBuyer(userId: number, buyerName: string): SkipTraceResult | null {
    const cachedResults = this.getCachedResults(userId);
    if (!cachedResults) {
      return null;
    }
    
    return cachedResults.find(result => 
      result.buyerName?.toLowerCase().trim() === buyerName?.toLowerCase().trim()
    ) || null;
  }
  
  /**
   * Clear cache for a specific user
   */
  static clearUserCache(userId: number): void {
    try {
      const cacheKey = `${CACHE_PREFIX}${userId}`;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      // Silently handle cache error
    }
  }
  
  /**
   * Clear all skip trace caches (useful for logout)
   */
  static clearAllCaches(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Silently handle cache error
    }
  }
  
  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(userId: number): {
    hasCachedData: boolean;
    resultCount: number;
    cacheAge: number;
    isExpired: boolean;
  } {
    try {
      const cacheKey = `${CACHE_PREFIX}${userId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return {
          hasCachedData: false,
          resultCount: 0,
          cacheAge: 0,
          isExpired: false
        };
      }
      
      const cachedData: CachedSkipTraceData = JSON.parse(cached);
      const cacheAge = Date.now() - cachedData.timestamp;
      const isExpired = cacheAge > CACHE_DURATION;
      
      return {
        hasCachedData: true,
        resultCount: cachedData.results?.length || 0,
        cacheAge,
        isExpired
      };
    } catch (error) {
      return {
        hasCachedData: false,
        resultCount: 0,
        cacheAge: 0,
        isExpired: false
      };
    }
  }
} 