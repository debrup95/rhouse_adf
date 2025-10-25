import { query } from '../../config/db';

export interface PurchaseHistoryItem {
  prop_last_sale_dt: string;
  prop_last_sale_amt: number;
  prop_address_line_txt: string;
  prop_city_nm: string;
  prop_state_nm: string;
  prop_zip_cd: string;
  prop_county_nm?: string;
  prop_attr_br_cnt?: number;
  prop_attr_bth_cnt?: number;
  prop_attr_sqft_nr?: number;
  prop_yr_blt_nr?: number;
  prop_latitude?: number;
  prop_longitude?: number;
}

export interface InvestorProfile {
  // Hard filter attributes
  min_prop_attr_br_cnt?: number;
  min_prop_attr_bth_cnt?: number;
  min_sqft?: number;
  min_year?: number;
  list_zips?: string[];
  adjacent_zip_codes?: string[];
  min_props_amnt?: number;
  mx_props_amnt?: number;
  arr_prop_cnty_nm?: string[];
  
  // Scoring attributes
  median_purchase_price?: number;
  mode_bedrooms?: number;
  avg_square_footage?: number;
  avg_year_built?: number;
  
  // Buyer type flags
  is_flipper?: boolean;
  is_landlord?: boolean;
  is_developer?: boolean;
  is_wholesaler?: boolean;
  
  // Contact information
  full_mailing_addr?: string;
  phone?: string;
  email?: string;
}

export interface Buyer {
  id: number;
  investor_company_nm_txt: string;
  investor_profile: InvestorProfile;
  num_prop_purchased_lst_12_mths_nr: number;
  active_flg: boolean;
  skip_flg?: boolean;
  purchase_history?: PurchaseHistoryItem[];
}

/**
 * Buyer Model - Handles database operations for buyers
 */
export class BuyerModel {
  /**
   * Get all active buyers
   * @returns Promise<Buyer[]> Array of active buyers
   */
  public async getAllActiveBuyers(): Promise<Buyer[]> {
        try {
      const queryText = `
        SELECT DISTINCT ON (investor_company_nm_txt)
              investor_company_nm_txt,
              num_prop_purchased_lst_12_mths_nr
        FROM staging_investor_profiles
        WHERE active_rec_ind = TRUE
          AND active_flg = TRUE
          AND skip_flg = FALSE
          AND num_prop_purchased_lst_12_mths_nr >= 1
        ORDER BY investor_company_nm_txt, num_prop_purchased_lst_12_mths_nr DESC;
        `;

        const result = await query(queryText);
      return result.rows;
    } catch (error) {
      console.error('Model: Error fetching buyers:', error);
      throw error;
    }
  }

  /**
   * Get a buyer by ID
   * @param buyerId The ID of the buyer to retrieve
   * @returns Promise<Buyer | null> The buyer if found, null otherwise
   */
  public async getBuyerById(buyerId: number): Promise<Buyer | null> {
    try {
      const queryText = `
        SELECT *
        FROM staging_investor_profiles
        WHERE id = $1;
      `;

      const result = await query(queryText, [buyerId]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      } else {
        return null;
      }
    } catch (error) {
      console.error('Model: Error fetching buyer:', error);
      throw error;
    }
  }

  /**
   * Get purchase history for a specific buyer
   * @param buyerName The name of the buyer
   * @returns Promise<PurchaseHistoryItem[]> Array of purchase history items
   */
  public async getBuyerPurchaseHistory(buyerName: string): Promise<PurchaseHistoryItem[]> {
    try {
      // console.log(`Fetching purchase history for buyer: ${buyerName}`);
      
      // Set a query timeout to prevent hanging
      await query('SET statement_timeout = 15000'); // 15 second timeout
      
      const queryText = `
        SELECT * FROM staging_investor_profiles
    WHERE active_rec_ind = TRUE
    AND active_flg = TRUE
    AND skip_flg = FALSE
    AND num_prop_purchased_lst_12_mths_nr >= 1;
`;

      const result = await query(queryText, [buyerName]);
      
      // Check if we have results
      if (result.rows.length > 0 && result.rows[0].purchase_history) {
        return result.rows[0].purchase_history;
      }
      
      console.log(`No purchase history found for buyer: ${buyerName}`);
      return [];
    } catch (error) {
      console.error('Model: Error fetching buyer purchase history:', error);
      throw error;
    } finally {
      // Reset the statement timeout to default before releasing
      try {
        await query('SET statement_timeout = 0');
      } catch (resetError) {
        console.error('Error resetting statement timeout:', resetError);
      }
    }
  }

  /**
   * Get all active buyers with their purchase history
   * @returns Promise<Buyer[]> Array of active buyers with purchase history
   */
  public async getAllActiveBuyersWithHistory(): Promise<Buyer[]> {
    try {
      
      // Set a query timeout to prevent hanging
      await query('SET statement_timeout = 30000'); // 30 second timeout for the main query
      
      // Single optimized query to get all buyers and their purchase history
      const queryText = `
        SELECT * FROM staging_investor_profiles
    WHERE active_rec_ind = TRUE
    AND active_flg = TRUE
    AND skip_flg = FALSE
    AND num_prop_purchased_lst_12_mths_nr >= 1;
      `;


      const result = await query(queryText);
      
      console.log(`Successfully fetched ${result.rows.length} buyers with purchase history in single query`);
      
      // Process the results to ensure purchase_history is properly formatted
      const buyersWithHistory = result.rows.map(buyer => {
        const purchaseHistory = buyer.purchase_history || [];
        const historyCount = Array.isArray(purchaseHistory) ? purchaseHistory.length : 0;
        
        // if (historyCount > 0) {
        //   console.log(`Buyer ${buyer.investor_company_nm_txt} has ${historyCount} purchase records`);
        // }
        
        return {
          id: buyer.id,
          investor_company_nm_txt: buyer.investor_company_nm_txt,
          investor_profile: buyer.investor_profile,
          num_prop_purchased_lst_12_mths_nr: buyer.num_prop_purchased_lst_12_mths_nr,
          active_flg: buyer.active_flg,
          purchase_history: purchaseHistory
        };
      });
      
      return buyersWithHistory;
    } catch (error) {
      console.error('Model: Error fetching buyers with purchase history:', error);
      throw error;
    } finally {
      // Reset the statement timeout to default before releasing
      try {
        await query('SET statement_timeout = 0');
      } catch (resetError) {
        console.error('Error resetting statement timeout:', resetError);
      }
    }
  }


  /**
   * Get all active buyers with their purchase history using batch processing
   * This is a fallback method in case the single query approach fails
   * @param batchSize Number of buyers to process in each batch
   * @returns Promise<Buyer[]> Array of active buyers with purchase history
   */
  public async getAllActiveBuyersWithHistoryBatched(batchSize: number = 50): Promise<Buyer[]> {
    try {
      const buyers = await this.getAllActiveBuyers();
      
      const buyersWithHistory: Buyer[] = [];
      
      // Process buyers in batches to avoid overwhelming the connection pool
      for (let i = 0; i < buyers.length; i += batchSize) {
        const batch = buyers.slice(i, i + batchSize);
        
        // Process current batch
        const batchResults = await Promise.all(
          batch.map(async (buyer) => {
            try {
              const purchaseHistory = await this.getBuyerPurchaseHistory(buyer.investor_company_nm_txt);
              return {
                ...buyer,
                purchase_history: purchaseHistory
              };
            } catch (error) {
              console.error(`Error fetching purchase history for buyer ${buyer.id}:`, error);
              return {
                ...buyer,
                purchase_history: []
              };
            }
          })
        );
        
        buyersWithHistory.push(...batchResults);
        
        // Small delay between batches to prevent overwhelming the database
        if (i + batchSize < buyers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return buyersWithHistory;
    } catch (error) {
      console.error('Model: Error in batch processing buyers with purchase history:', error);
      throw error;
    }
  }
}

// Export a singleton instance for use throughout the application
export const buyerModel = new BuyerModel();

// Also export the original functions for backward compatibility
export const getAllActiveBuyers = async (): Promise<Buyer[]> => {
  return buyerModel.getAllActiveBuyers();
};

export const getBuyerById = async (buyerId: number): Promise<Buyer | null> => {
  return buyerModel.getBuyerById(buyerId);
};

export const getAllActiveBuyersWithHistory = async (): Promise<Buyer[]> => {
  return buyerModel.getAllActiveBuyersWithHistory();
}; 