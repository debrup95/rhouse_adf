/**
 * BuyerRankingService
 * 
 * This service implements the buyer ranking algorithm according to the v3 point system:
 * - Geographic Proximity: 30/18/10/4/1/0 points based on distance (0-2/2-5/5-10/10-15/15-20/>20 miles)
 * - Recency: 24/14/6/0 points based on days since last purchase (0-90/90-180/180-365/>365 days)
 * - Price Alignment: 10/4/0 points based on estimated price vs median purchase price (±20%/>20% to ≤40%/≥±40%)
 * - Property Fit: 26 points total (beds: 8/4/0, baths: 6/3/0, sqft: 6/3/0, year: 6/3/0)
 * - Activity Level: 4/7/10 points based on purchases in last 12 months (2-3/4-7/≥8 buys)
 * Total Max Score: 90 points
 */

import { query } from '../../config/db';
import { Buyer, PurchaseHistoryItem } from '../../models/buyer/buyerModel';

interface PropertyData {
  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
  year_built?: number;
  zip_code?: string;
  city?: string;
  county?: string;
  estimated_price?: number;
  latitude?: number;
  longitude?: number;
}

interface RankedBuyer {
  buyer: Buyer;
  score: number;
  likelihood: string;
  category: 'active' | 'recent';
  matchDetails: {
    geographicScore: number;
    recencyScore: number;
    priceScore: number;
    characteristicsScore: number;
    activityScore: number;
  };
}

interface BuyerMedians {
  buyer: string;
  median_last_sale_amt: number;
  mode_br_cnt: number;
  mode_bth_cnt: number;
  median_sqft: number;
  median_year_built: number;
}

export class BuyerRankingService {
  // Global cache for buyer medians data
  private static medianCache: Map<string, BuyerMedians> = new Map();
  private static lastMedianCacheUpdateTime: number = 0;
  // Cache expiration time in milliseconds (12 hours)
  private static MEDIAN_CACHE_EXPIRATION_TIME = 12 * 60 * 60 * 1000;

  /**
   * Check if the median cache is valid
   * @returns boolean Whether the median cache is valid
   */
  private static isMedianCacheValid(): boolean {
    const currentTime = Date.now();
    return (
      BuyerRankingService.medianCache.size > 0 &&
      currentTime - BuyerRankingService.lastMedianCacheUpdateTime < BuyerRankingService.MEDIAN_CACHE_EXPIRATION_TIME
    );
  }

  /**
   * Update the median cache with new data
   * @param medians The medians data to cache
   */
  private static updateMedianCache(medians: BuyerMedians[]): void {
    BuyerRankingService.medianCache.clear();
    medians.forEach(median => {
      BuyerRankingService.medianCache.set(median.buyer, median);
    });
    BuyerRankingService.lastMedianCacheUpdateTime = Date.now();
    console.log('Updated median cache with', medians.length, 'buyer medians at', new Date().toISOString());
  }

  /**
   * Get cached medians for a list of buyers
   * @param buyerNames Array of buyer names to get medians for
   * @returns Array of cached medians or null if cache miss
   */
  private static getCachedMedians(buyerNames: string[]): BuyerMedians[] | null {
    if (!BuyerRankingService.isMedianCacheValid()) {
      return null;
    }

    const cachedMedians: BuyerMedians[] = [];
    for (const buyerName of buyerNames) {
      const median = BuyerRankingService.medianCache.get(buyerName);
      if (median) {
        cachedMedians.push(median);
      }
    }

    // Only return cached data if we have medians for all requested buyers
    if (cachedMedians.length === buyerNames.length) {
      console.log('Using cached medians for', cachedMedians.length, 'buyers');
      return cachedMedians;
    }

    return null;
  }

  /**
   * Fetch medians from database and update cache
   * @param buyerNames Array of buyer names to get medians for
   * @returns Array of buyer medians
   */
  private static async fetchAndCacheMedians(buyerNames: string[]): Promise<BuyerMedians[]> {
    console.log('Fetching medians from database for', buyerNames.length, 'buyers');

    const medianQuery = `WITH medians AS (
  SELECT
    investor_name AS buyer,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sale_amount) AS median_last_sale_amt,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY building_sqft) AS median_sqft,
    PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY year_built) AS median_year_built,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latitude) AS median_latitude,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY longitude) AS median_longitude
  FROM property_sales
  WHERE investor_name = ANY($1::text[])
  GROUP BY investor_name
)
SELECT
  m.buyer,
  m.median_last_sale_amt,
  br.mode_br_cnt,
  ba.mode_bth_cnt,
  m.median_sqft,
  m.median_year_built,
  m.median_latitude,
  m.median_longitude,
  COUNT(DISTINCT ps.city) as cities_invested_in,
  COUNT(DISTINCT ps.zip_code) as zip_codes_invested_in,
  COUNT(DISTINCT ps.county) as counties_invested_in
FROM medians m
LEFT JOIN LATERAL (
  SELECT bedrooms AS mode_br_cnt
  FROM property_sales x
  WHERE x.investor_name = m.buyer
    AND x.bedrooms IS NOT NULL
  GROUP BY bedrooms
  ORDER BY COUNT(*) DESC
  LIMIT 1
) br ON TRUE
LEFT JOIN LATERAL (
  SELECT bathrooms AS mode_bth_cnt
  FROM property_sales y
  WHERE y.investor_name = m.buyer
    AND y.bathrooms IS NOT NULL
  GROUP BY bathrooms
  ORDER BY COUNT(*) DESC
  LIMIT 1
) ba ON TRUE
LEFT JOIN property_sales ps ON ps.investor_name = m.buyer
GROUP BY 
  m.buyer,
  m.median_last_sale_amt,
  br.mode_br_cnt,
  ba.mode_bth_cnt,
  m.median_sqft,
  m.median_year_built,
  m.median_latitude,
  m.median_longitude
ORDER BY m.buyer;
`

    const result = await query(medianQuery, [buyerNames]);
    const buyersWithMedians = result.rows;
    
    // Update cache with new data
    BuyerRankingService.updateMedianCache(buyersWithMedians);

    return buyersWithMedians;
  }

  /**
   * Ranks buyers based on the defined point system
   * @param buyers List of active buyers to rank
   * @param propertyData Property data for matching
   * @returns Ranked buyers with their scores
   */
  public async rankBuyers(buyers: Buyer[], propertyData: PropertyData): Promise<RankedBuyer[]> {
    console.log('[BUYER RANKING] Starting buyer ranking process');
    console.log('[BUYER RANKING] Property Data:', {
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      square_footage: propertyData.square_footage,
      year_built: propertyData.year_built,
      zip_code: propertyData.zip_code,
      estimated_price: propertyData.estimated_price,
      latitude: propertyData.latitude,
      longitude: propertyData.longitude
    });
    console.log('[BUYER RANKING] Total buyers to process:', buyers.length);

    // Apply hard filters first
    const filteredBuyers = this.applyHardFilters(buyers, propertyData);
    console.log('[BUYER RANKING] Buyers after hard filters:', filteredBuyers.length);

    if (filteredBuyers.length === 0) {
      console.log('[BUYER RANKING] No buyers passed hard filters');
      return []; 
    }

         // Get cached medians or fetch from database
     let buyersWithMedians = BuyerRankingService.getCachedMedians(filteredBuyers.map(buyer => buyer.investor_company_nm_txt));

     if (buyersWithMedians) {
       console.log('[BUYER RANKING] Using cached medians for', buyersWithMedians.length, 'buyers');
     } else {
       // Fetch and cache medians if not available in cache
       buyersWithMedians = await BuyerRankingService.fetchAndCacheMedians(filteredBuyers.map(buyer => buyer.investor_company_nm_txt));
     }
    
    // Calculate scores for each buyer
    const rankedBuyers = filteredBuyers.map(buyer => {
      // Calculate individual category scores
      const geographicScore = this.calculateGeographicScore(buyer, propertyData);
      const recencyScore = this.calculateRecencyScore(buyer);
      const priceScore = this.calculatePriceAlignmentScore(buyer, propertyData, buyersWithMedians);
      const characteristicsScore = this.calculateCharacteristicsScore(buyer, propertyData, buyersWithMedians);
      const activityScore = this.calculateActivityScore(buyer);
      
      // Ensure all scores are numbers and sum for total
      const scores = [
        geographicScore || 0,
        recencyScore || 0,
        priceScore || 0,
        characteristicsScore || 0,
        activityScore || 0
      ];
      const totalScore = scores.reduce((sum, score) => sum + score, 0);

      // Calculate likelihood based on score threshold
      const likelihood = this.determineLikelihood(totalScore);

      // Categorize buyer based on new requirements
      const category = this.categorizeBuyer(buyer);

      // Debug logging for each buyer
      console.log(`[BUYER SCORE] ${buyer.investor_company_nm_txt}:`, {
        totalScore,
        likelihood,
        category,
        breakdown: {
          geographic: geographicScore,
          recency: recencyScore,
          price: priceScore,
          characteristics: characteristicsScore,
          activity: activityScore
        }
      });

      return {
        buyer,
        score: totalScore,
        likelihood,
        category,
        matchDetails: {
          geographicScore,
          recencyScore,
          priceScore,
          characteristicsScore,
          activityScore
        }
      };
    });
    
    // Sort by total score descending
    const sortedBuyers = rankedBuyers.sort((a, b) => b.score - a.score);
    
    console.log('[BUYER RANKING] Final ranking:');
    sortedBuyers.slice(0, 10).forEach((rankedBuyer, index) => {
      console.log(`  ${index + 1}. ${rankedBuyer.buyer.investor_company_nm_txt} - Score: ${rankedBuyer.score} (${rankedBuyer.likelihood})`);
    });
    
    return sortedBuyers;
  }

  /**
   * Determine likelihood category based on score thresholds
   * @param score The total buyer score
   * @returns Likelihood as a string: "Likely", "Most likely", or "Less likely"
   */
  private determineLikelihood(score: number): string {
    if (score > 60) {
      return "Most likely";
    } else if (score > 40) {
      return "Likely";
    } else {
      return "Less likely";
    }
  }

  /**
   * Categorize buyer based on new requirements
   * Active Buyer: Bought 2+ properties in last 12 months to resell or rent
   * Recent Buyer: Bought 1+ property within 24 months to resell or rent
   * @param buyer The buyer to categorize
   * @returns Buyer category: 'active' or 'recent'
   */
  private categorizeBuyer(buyer: Buyer): 'active' | 'recent' {
    const purchaseHistory = buyer.purchase_history || [];
    const purchaseCount12Months = buyer.num_prop_purchased_lst_12_mths_nr || 0;

    // Active Buyer: Bought 2+ properties in last 12 months to resell or rent
    if (purchaseCount12Months >= 3) {
      return 'active';
    }

    // Recent Buyer: Bought 1+ property within 24 months to resell or rent
    // Check if they have any purchase in the last 24 months
    const twentyFourMonthsAgo = new Date();
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

    const recentPurchases = purchaseHistory.filter(purchase => {
      const purchaseDate = new Date(purchase.prop_last_sale_dt);
      return purchaseDate >= twentyFourMonthsAgo;
    });

    if (recentPurchases.length >= 2 || purchaseCount12Months >= 2) {
      return 'recent';
    }

    // Default to recent for any buyer that passed hard filters
    return 'recent';
  }
  
  /**
   * Apply hard filters - if property doesn't meet minimum criteria, filter out
   */
  private applyHardFilters(buyers: Buyer[], propertyData: PropertyData): Buyer[] {
    return buyers.filter(buyer => {
      const profile = buyer.investor_profile || {};
      
      // Check minimum bedrooms
      if (propertyData.bedrooms !== undefined && 
          profile.min_prop_attr_br_cnt && 
          profile.min_prop_attr_br_cnt > propertyData.bedrooms) {
        return false;
      }
      
      // Check minimum bathrooms
      if (propertyData.bathrooms !== undefined && 
          profile.min_prop_attr_bth_cnt && 
          profile.min_prop_attr_bth_cnt > propertyData.bathrooms) {
        return false;
      }
      
      // Check minimum square footage
      if (propertyData.square_footage !== undefined && 
          profile.min_sqft && 
          profile.min_sqft > propertyData.square_footage) {
        return false;
      }
      
      // Check minimum year built
      if (propertyData.year_built !== undefined && 
          profile.min_year && 
          profile.min_year > propertyData.year_built) {
        return false;
      }
      
      // Check county list if specified
      if(profile.arr_prop_cnty_nm && profile.arr_prop_cnty_nm.length > 0 && propertyData.county) {
        if(!profile.arr_prop_cnty_nm.includes((propertyData.county?.split(/\s{1,}/)[0])?.trim())) {
          return false;
        }
      }
    
      
      // Buyer passes all hard filters
      return true;
    });
  }
  
  /**
   * Calculate geographic proximity score based on distance
   * - 30 pts: 0-2 miles (Heaviest weight)
   * - 18 pts: 2-5 miles (Still strong)
   * - 10 pts: 5-10 miles
   * - 4 pts: 10-15 miles
   * - 1 pt: 15-20 miles
   * - 0 pts: >20 miles
   */
  private calculateGeographicScore(buyer: Buyer, propertyData: PropertyData): number {
    // Check if property coordinates are available
    if (!propertyData.latitude || !propertyData.longitude) {
      console.log(`[GEOGRAPHIC] ${buyer.investor_company_nm_txt}: No property coordinates available`);
      return 0;
    }
    
    const purchaseHistory = buyer.purchase_history || [];
    if (purchaseHistory.length === 0) {
      console.log(`[GEOGRAPHIC] ${buyer.investor_company_nm_txt}: No purchase history`);
      return 0;
    }
    
    // Find the minimum distance to any of the buyer's previous purchases
    let minDistance = Infinity;
    let validCoordinates = 0;
    
    for (const purchase of purchaseHistory) {
      if (purchase.prop_latitude && purchase.prop_longitude) {
        validCoordinates++;
        const distance = this.calculateDistance(
          propertyData.latitude!,
          propertyData.longitude!,
          purchase.prop_latitude,
          purchase.prop_longitude
        );
        minDistance = Math.min(minDistance, distance);
      }
    }
    
    // Return 0 if no valid coordinates found
    if (minDistance === Infinity) {
      console.log(`[GEOGRAPHIC] ${buyer.investor_company_nm_txt}: No valid coordinates in purchase history (${validCoordinates}/${purchaseHistory.length} valid)`);
      return 0;
    }
    
    // Apply scoring based on distance ranges
    let score = 0;
    if (minDistance <= 2) score = 30;
    else if (minDistance <= 5) score = 18;
    else if (minDistance <= 10) score = 10;
    else if (minDistance <= 15) score = 4;
    else if (minDistance <= 20) score = 1;
    else score = 0;
    
    console.log(`[GEOGRAPHIC] ${buyer.investor_company_nm_txt}: Min distance ${minDistance.toFixed(2)} miles → ${score} points`);
    return score;
  }
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in miles
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  /**
   * Convert degrees to radians
   * @param degrees Degrees to convert
   * @returns Radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Calculate recency score (v3)
   * - 24 pts: 0-90 days since last purchase
   * - 14 pts: 90-180 days since last purchase
   * - 6 pts: 180-365 days since last purchase
   * - 0 pts: >365 days since last purchase
   */

  private calculateRecencyScore(buyer: Buyer): number {
    const purchaseHistory = buyer.purchase_history || [];
    
    if (purchaseHistory.length === 0) {
      console.log(`[RECENCY] ${buyer.investor_company_nm_txt}: No purchase history → 0 points`);
      return 0;
    }
    
    // Find the most recent purchase date
    const purchaseDates = purchaseHistory
      .map((purchase: PurchaseHistoryItem) => new Date(purchase.prop_last_sale_dt))
      .filter((date: Date) => !isNaN(date.getTime()))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime());
    
    if (purchaseDates.length === 0) {
      console.log(`[RECENCY] ${buyer.investor_company_nm_txt}: No valid purchase dates → 0 points`);
      return 0;
    }
    
    const lastPurchaseDate = purchaseDates[0];
    const today = new Date();
    const daysSinceLastPurchase = Math.floor((today.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));


    const daysBefore90 = new Date();
    daysBefore90.setDate(today.getDate() - 90);

    const daysBefore180 = new Date();
    daysBefore180.setDate(today.getDate() - 180);

    const daysBefore365 = new Date();
    daysBefore365.setDate(today.getDate() - 365);

    let score = 0;
    if(lastPurchaseDate >= daysBefore90) score = 24;
    else if(lastPurchaseDate < daysBefore90 && lastPurchaseDate >= daysBefore180) score = 14;
    else if(lastPurchaseDate < daysBefore180 && lastPurchaseDate >= daysBefore365) score = 6;
    else score = 0;

    console.log(`[RECENCY] ${buyer.investor_company_nm_txt}: Last purchase ${daysSinceLastPurchase} days ago (${lastPurchaseDate.toISOString().split('T')[0]}) → ${score} points`);
    return score;
  }
  
  /**
   * Calculate price alignment score (v3)
   * - 10 pts: Property price within ±20% of investor median purchase price
   * - 4 pts: Property price >20% to ≤40% of investor median purchase price
   * - 0 pts: Property price ≥±40% of investor median purchase price
   */
  private calculatePriceAlignmentScore(buyer: Buyer, propertyData: PropertyData, buyersWithMedians: BuyerMedians[]): number {
    // Skip if estimated price is missing
    if (!propertyData.estimated_price) {
      console.log(`[PRICE] ${buyer.investor_company_nm_txt}: No estimated price available → 0 points`);
      return 0;
    }
    
    // Find the buyer's entry in buyersWithMedians
    const buyerMedians = buyersWithMedians.find(b => b.buyer === buyer.investor_company_nm_txt);
    
    if (buyerMedians && buyerMedians.median_last_sale_amt) {
      // Use median price from buyersWithMedians
      const medianPrice = buyerMedians.median_last_sale_amt;
      const estPrice = propertyData.estimated_price;
      
      // Calculate percentage difference
      const percentDiff = Math.abs((estPrice - medianPrice) / medianPrice * 100);
      
      let score = 0;
      if (percentDiff <= 20) {
        score = 10; // Within 20% of median purchase price
      } else if (percentDiff <= 40) {
        score = 4; // Within 20-40% of median purchase price
      }
      
      console.log(`[PRICE] ${buyer.investor_company_nm_txt}: Est $${estPrice.toLocaleString()} vs Median $${medianPrice.toLocaleString()} (${percentDiff.toFixed(1)}% diff) → ${score} points`);
      return score;
    }
    
    console.log(`[PRICE] ${buyer.investor_company_nm_txt}: No median price data available → 0 points`);
    return 0; // Default if no price data available
  }
  
  /**
   * Calculate property fit score (v3)
   * - Beds: 8 pts (exact = mode), 4 pts (off by ±1), 0 pts (else)
   * - Baths: 6 pts (|Δ| ≤ 0.5), 3 pts (|Δ| ≤ 1.0), 0 pts (else)
   * - Sqft: 6 pts (|Δ|/median ≤ 20%), 3 pts (20-40%), 0 pts (>40%)
   * - Year built: 6 pts (|Δ| ≤ 10 yrs), 3 pts (10-20 yrs), 0 pts (>20 yrs)
   */
  private calculateCharacteristicsScore(buyer: Buyer, propertyData: PropertyData, buyersWithMedians: BuyerMedians[]): number {
    let score = 0;
    let breakdown = { beds: 0, baths: 0, sqft: 0, year: 0 };
    
    // Find the buyer's entry in buyersWithMedians
    const buyerMedians = buyersWithMedians.find(b => b.buyer === buyer.investor_company_nm_txt);
    
    if (!buyerMedians) {
      console.log(`[PROPERTY FIT] ${buyer.investor_company_nm_txt}: No median data available → 0 points`);
      return 0;
    }
    
    // Check bedrooms match (8/4/0 points)
    if (propertyData.bedrooms !== undefined && buyerMedians.mode_br_cnt !== undefined) {
      const bedroomDiff = Math.abs(propertyData.bedrooms - buyerMedians.mode_br_cnt);
      if (bedroomDiff === 0) {
        breakdown.beds = 8; // Exact match
      } else if (bedroomDiff === 1) {
        breakdown.beds = 4; // Off by ±1
      }
      score += breakdown.beds;
    }
    
    // Check bathrooms match (6/3/0 points)
    if (propertyData.bathrooms !== undefined && buyerMedians.mode_bth_cnt !== undefined) {
      const bathroomDiff = Math.abs(propertyData.bathrooms - buyerMedians.mode_bth_cnt);
      if (bathroomDiff <= 0.5) {
        breakdown.baths = 6; // |Δ| ≤ 0.5
      } else if (bathroomDiff <= 1.0) {
        breakdown.baths = 3; // |Δ| ≤ 1.0
      }
      score += breakdown.baths;
    }
    
    // Check square footage match (6/3/0 points)
    if (propertyData.square_footage !== undefined && buyerMedians.median_sqft !== undefined) {
      const medianSqft = buyerMedians.median_sqft;
      const percentDiff = Math.abs((propertyData.square_footage - medianSqft) / medianSqft * 100);
      
      if (percentDiff <= 20) {
        breakdown.sqft = 6; // |Δ|/median ≤ 20%
      } else if (percentDiff <= 40) {
        breakdown.sqft = 3; // 20-40%
      }
      score += breakdown.sqft;
    }
    
    // Check year built match (6/3/0 points)
    if (propertyData.year_built !== undefined && buyerMedians.median_year_built !== undefined) {
      const yearDiff = Math.abs(propertyData.year_built - buyerMedians.median_year_built);
      
      if (yearDiff <= 10) {
        breakdown.year = 6; // |Δ| ≤ 10 yrs
      } else if (yearDiff <= 20) {
        breakdown.year = 3; // 10-20 yrs
      }
      score += breakdown.year;
    }
    
    console.log(`[PROPERTY FIT] ${buyer.investor_company_nm_txt}: Beds(${breakdown.beds}) + Baths(${breakdown.baths}) + Sqft(${breakdown.sqft}) + Year(${breakdown.year}) = ${score} points`);
    return score;
  }
  
  /**
   * Calculate activity level score (v3)
   * - 4 pts: 2-3 buys in last 12 months
   * - 7 pts: 4-7 buys in last 12 months
   * - 10 pts: ≥8 buys in last 12 months
   */

  private calculateActivityScore(buyer: Buyer): number {
    const purchaseHistory = buyer.purchase_history || [];
    
    // If we have num_prop_purchased_lst_12_mths_nr, use that as a fallback
    if (purchaseHistory.length === 0 && buyer.num_prop_purchased_lst_12_mths_nr) {
      // Ensure we're parsing from a string
      const recentPurchasesStr = String(buyer.num_prop_purchased_lst_12_mths_nr);
      const recentPurchases = parseInt(recentPurchasesStr, 10);
      if (!isNaN(recentPurchases)) {
        let score = 0;
        if(recentPurchases >= 2 && recentPurchases <= 3) {
          score = 4;
        } else if(recentPurchases >= 4 && recentPurchases <= 7) {
          score = 7;
        } else if(recentPurchases >= 8) {
          score = 10;
        }
        console.log(`[ACTIVITY] ${buyer.investor_company_nm_txt}: Using fallback data (${recentPurchases} purchases in last 12m) → ${score} points`);
        return score;
      }
    }
    
    // Count purchases in the last 12 months
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const recentPurchases = purchaseHistory.filter((purchase: PurchaseHistoryItem) => {
      const purchaseDate = new Date(purchase.prop_last_sale_dt);
      return !isNaN(purchaseDate.getTime()) && purchaseDate >= oneYearAgo;
    }).length;
    
    let score = 0;
    if(recentPurchases >= 2 && recentPurchases <= 3) {
      score = 4;
    } else if(recentPurchases >= 4 && recentPurchases <= 7) {
      score = 7;
    } else if(recentPurchases >= 8) {
      score = 10;
    }
    
    console.log(`[ACTIVITY] ${buyer.investor_company_nm_txt}: ${recentPurchases} purchases in last 12 months → ${score} points`);
    return score;
  }
}

// Export a singleton instance
export const buyerRankingService = new BuyerRankingService(); 