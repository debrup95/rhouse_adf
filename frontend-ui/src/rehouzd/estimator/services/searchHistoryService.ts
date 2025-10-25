import config from '../../../config';

interface SearchHistoryItem {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  fullAddress: string;
  searchedAt: string;
}

export class SearchHistoryService {
  private static readonly MAX_HISTORY_ITEMS = 15;
  private static readonly STORAGE_PREFIX = 'searchHistory_';

  /**
   * Get search history for a user from database
   */
  static async getSearchHistory(userId: string): Promise<SearchHistoryItem[]> {
    try {
      // Fetch from database API
      const response = await fetch(`${config.apiUrl}/api/property/search-history/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data.map((item: any) => ({
          id: item.id,
          address: item.address,
          city: item.city,
          state: item.state,
          zip: item.zip,
          fullAddress: item.fullAddress,
          searchedAt: item.searchedAt
        }));
      }
      
      return [];
    } catch (error) {
      // Fallback to localStorage if API fails
      try {
        const storageKey = `${this.STORAGE_PREFIX}${userId}`;
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : [];
      } catch (localStorageError) {
        return [];
      }
    }
  }

  /**
   * Add a new search to history (still use localStorage for immediate updates)
   */
  static addSearch(userId: string, address: string): void {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${userId}`;
      const history = this.getSearchHistoryFromLocalStorage(userId);
      
      // Create new item
      const newItem: SearchHistoryItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        address,
        city: '', // Will be populated by API
        state: '', // Will be populated by API
        zip: '', // Will be populated by API
        fullAddress: address, // Use the full address string for now
        searchedAt: new Date().toISOString()
      };

      // Remove duplicate if exists
      const filteredHistory = history.filter(item => item.fullAddress !== address);
      
      // Add new item to the beginning
      const updatedHistory = [newItem, ...filteredHistory];
      
      // Keep only the most recent items
      const limitedHistory = updatedHistory.slice(0, this.MAX_HISTORY_ITEMS);
      
      // Save to localStorage for immediate updates
      localStorage.setItem(storageKey, JSON.stringify(limitedHistory));
    } catch (error) {
      // Silently handle error
    }
  }

  /**
   * Get search history from localStorage (fallback method)
   */
  static getSearchHistoryFromLocalStorage(userId: string): SearchHistoryItem[] {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${userId}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear search history for a user
   */
  static clearSearchHistory(userId: string): void {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${userId}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Silently handle error
    }
  }

  /**
   * Remove a specific item from search history
   */
  static removeSearchItem(userId: string, itemId: string): void {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${userId}`;
      const history = this.getSearchHistoryFromLocalStorage(userId);
      const filteredHistory = history.filter(item => item.id !== itemId);
      localStorage.setItem(storageKey, JSON.stringify(filteredHistory));
    } catch (error) {
      // Silently handle error
    }
  }


}

export default SearchHistoryService; 