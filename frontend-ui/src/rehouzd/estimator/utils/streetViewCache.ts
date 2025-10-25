// Street View image caching utility to reduce Google API calls
interface StreetViewCache {
  [address: string]: string;
}

class StreetViewCacheManager {
  private cache: StreetViewCache = {};
  private readonly CACHE_KEY = 'streetview_cache';
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Validate cache entries and remove expired ones
        const now = Date.now();
        Object.keys(parsedCache).forEach(address => {
          if (parsedCache[address].timestamp && 
              (now - parsedCache[address].timestamp < this.CACHE_DURATION)) {
            this.cache[address] = parsedCache[address].url;
          }
        });
      }
    } catch (error) {
      this.cache = {};
    }
  }

  private saveToStorage(): void {
    try {
      const cacheWithTimestamp = Object.keys(this.cache).reduce((acc, address) => {
        acc[address] = {
          url: this.cache[address],
          timestamp: Date.now()
        };
        return acc;
      }, {} as any);
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheWithTimestamp));
    } catch (error) {
      // Silently handle cache save error
    }
  }

  public getStreetViewUrl(address: string, apiKey: string, options: {
    size?: string;
    fov?: number;
    pitch?: number;
  } = {}): string {
    if (!address || !apiKey) return '';

    // Check cache first
    const cacheKey = this.generateCacheKey(address, options);
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Generate new URL if not in cache
    const url = this.generateStreetViewUrl(address, apiKey, options);
    
    // Add to cache with size limit
    this.addToCache(cacheKey, url);
    
    return url;
  }

  private generateCacheKey(address: string, options: any): string {
    const optionsStr = JSON.stringify(options);
    return `${address}|${optionsStr}`;
  }

  private generateStreetViewUrl(address: string, apiKey: string, options: {
    size?: string;
    fov?: number;
    pitch?: number;
  }): string {
    const encodedAddress = encodeURIComponent(address);
    const size = options.size || '600x300';
    const fov = options.fov || 80;
    const pitch = options.pitch || -5;
    
    return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodedAddress}&fov=${fov}&pitch=${pitch}&key=${apiKey}`;
  }

  private addToCache(key: string, url: string): void {
    // If cache is at max size, remove oldest entries
    const cacheKeys = Object.keys(this.cache);
    if (cacheKeys.length >= this.MAX_CACHE_SIZE) {
      // Remove first 10 entries to make room
      cacheKeys.slice(0, 10).forEach(k => delete this.cache[k]);
    }

    this.cache[key] = url;
    this.saveToStorage();
  }

  public clearCache(): void {
    this.cache = {};
    localStorage.removeItem(this.CACHE_KEY);
  }

  public getCacheSize(): number {
    return Object.keys(this.cache).length;
  }
}

// Export singleton instance
export const streetViewCache = new StreetViewCacheManager();

// Helper hook for React components
export const useStreetViewUrl = (address: string | null, apiKey: string, options?: {
  size?: string;
  fov?: number;
  pitch?: number;
}) => {
  if (!address) return '';
  return streetViewCache.getStreetViewUrl(address, apiKey, options);
}; 