import config from '../../../config';

/**
 * Interface for rehab calculator data from backend
 */
export interface RehabCalculatorData {
  marketName: string;
  marketReferenceId: number;
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
  tierRules: {
    1: { min: number; max: number };
    2: { min: number; max: number };
    3: { min: number; max: number };
  };
  sizeBrackets: {
    Small: { min: number; max: number };
    Medium: { min: number; max: number };
    Large: { min: number; max: number };
  };
}

/**
 * Interface for calculation request payload
 */
export interface RehabCalculationRequest {
  // Property parameters
  afterRepairValue: number;
  squareFootage: number;
  
  // Category values from slider inputs (0-1 scale usually)
  bathrooms: number;       // 0=None, 1=Partial, 2=Full
  windows: number;         // 0=None, 1-20=Number of windows
  electrical: number;      // 0=None, 1=Replace Panel, 2=Full House Rewire
  plumbing: number;        // 0=None, 1=Half Re-pipe, 2=Full Re-pipe
  interiorPaint: number;   // 0=None, 1=Half Repaint, 2=Full Repaint
  exteriorPaint: number;   // 0=None, 1=Pressure Wash Only, 2=Half Repaint, 3=Full Repaint
  exteriorSiding: number;  // 0=None, 1=1/4 Vinyl, 2=2/4 Vinyl, 3=3/4 Vinyl, 4=Full Vinyl
  kitchen: number;         // 0=None, 1=Partial Refresh, 2=Full Replacement
  roof: number;            // 0=None, 1=3-Tab Shingles, 2=Architectural Shingles
  hvac: number;            // 0=None, 1=Repair, 2=Unit Replace, 3=Full System
  flooring: number;        // 0=None, 1=Bedrooms Only, 2=Living Areas Only, 3=Full (Beds & Living)
  waterHeater: number;     // 0=None, 1=40-Gal Tank, 2=50-Gal Tank
  
  // Contingency percentage (0-25)
  contingency: number;
}

/**
 * Interface for calculation results
 */
export interface RehabCalculationResult {
  // Individual category costs
  categoryBreakdown: {
    [categoryName: string]: {
      cost: number;
      details: string;
      pricingBasis: string;
    };
  };
  
  // Summary totals
  subtotal: number;
  contingencyAmount: number;
  total: number;
  perSquareFoot: number;
  
  // Parameters used
  tier: number;
  sizeBracket: 'Small' | 'Medium' | 'Large';
  
  // Applied values
  afterRepairValue: number;
  squareFootage: number;
  contingencyPercentage: number;
}

/**
 * In-memory cache for rehab calculator data (30 minute expiry like backend)
 */
const rehabDataCache = new Map<string, { data: RehabCalculatorData; timestamp: number }>();
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Service for rehab calculator operations
 */
class RehabCalculatorService {
  
  /**
   * Get rehab calculator data for a property location with caching
   * Now only requires location and square footage - ARV tier calculated dynamically
   */
  async getRehabCalculatorData(
    state: string, 
    county: string,
    squareFootage?: number
  ): Promise<RehabCalculatorData | null> {
    try {
      const cacheKey = `${state}_${county}`;
      
      // Check cache first
      const cached = rehabDataCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY_MS) {
        return cached.data;
      }
      
      // Add cache buster like existing code
      const cacheBuster = `_=${new Date().getTime()}`;
      
      const response = await fetch(`${config.apiUrl}/api/rehab/calculator-data?${cacheBuster}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addressData: {
            state_abbreviation: state,
            county: county,
            square_footage: squareFootage
          }
        })
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      
      if (!result.success) {
        return null;
      }
      
      // Cache the result
      rehabDataCache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now()
      });
      
      return result.data;
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Calculate tier based on After Repair Value (ARV)
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
   * Calculate detailed rehab costs based on slider inputs
   */
  calculateRehabCosts(
    request: RehabCalculationRequest,
    calculatorData: RehabCalculatorData,
    bathroomCount?: number
  ): RehabCalculationResult {
    const tier = this.determineTier(request.afterRepairValue);
    const sizeBracket = this.determineSizeBracket(request.squareFootage);
    
    const categoryBreakdown: RehabCalculationResult['categoryBreakdown'] = {};
    let subtotal = 0;
    
    // Category mapping from frontend slider keys to backend category names
    const categoryMapping = {
      bathrooms: 'bathroom',
      windows: 'windows',
      electrical: 'electrical',
      plumbing: 'plumbing',
      interiorPaint: 'interior_paint',
      exteriorPaint: 'exterior_paint',
      exteriorSiding: 'exterior_siding',
      kitchen: 'kitchen',
      roof: 'roof',
      hvac: 'hvac',
      flooring: 'flooring',
      waterHeater: 'water_heater'
    };
    
    // Calculate cost for each category
    Object.entries(categoryMapping).forEach(([sliderKey, categoryName]) => {
      const sliderValue = request[sliderKey as keyof RehabCalculationRequest] as number;
      
      if (sliderValue > 0 && calculatorData.costData[categoryName]) {
        const categoryData = calculatorData.costData[categoryName];
        
        // Special handling for bathroom category
        if (categoryName === 'bathroom') {
          let selectedItemCode = null;
          let selectedItemData = null;
          
          if (sliderValue === 1) {
            // Partial Refresh - look for partial refresh item (applies to all tiers)
            selectedItemCode = 'bathroom_partial_all';
            selectedItemData = categoryData[selectedItemCode];
          } else if (sliderValue === 2) {
            // Full Replacement - look for tier-specific item
            const tierItemCode = `bathroom_full_t${tier}`;
            selectedItemCode = tierItemCode;
            selectedItemData = categoryData[selectedItemCode];
          }
          
          if (selectedItemCode && selectedItemData) {
            // For bathroom, we use tier 1 for partial refresh (since it applies to all tiers)
            // and the appropriate tier for full replacement
            const lookupTier = sliderValue === 1 ? 1 : tier;
            const costLookup = selectedItemData.costs[lookupTier]?.[sizeBracket];
            
            if (costLookup !== undefined) {
              // Multiply by actual bathroom count
              const count = bathroomCount ?? 1;
              const itemCost = costLookup * count;
              categoryBreakdown[categoryName] = {
                cost: itemCost,
                details: `${selectedItemData.name} - ${selectedItemData.scope} (${count} bathroom${count !== 1 ? 's' : ''})`,
                pricingBasis: selectedItemData.pricingBasis
              };
              subtotal += itemCost;
            }
          }
        } else if (categoryName === 'electrical') {
          // Special handling for electrical category
          let totalCost = 0;
          const details = [];
          
          if (sliderValue === 1) {
            // Replace Panel Only - fixed fee
            const panelData = categoryData['electrical_panel'];
            if (panelData) {
              const panelCostLookup = panelData.costs[1]?.[sizeBracket];
              if (panelCostLookup !== undefined) {
                totalCost = panelCostLookup;
                details.push(`${panelData.name} - ${panelData.scope}`);
              }
            }
          } else if (sliderValue === 2) {
            // Full House Rewire - per sqft + panel replacement
            const rewireData = categoryData['electrical_rewire'];
            const panelData = categoryData['electrical_panel'];
            
            // Add rewiring cost (per sqft)
            if (rewireData) {
              const rewireCostLookup = rewireData.costs[1]?.[sizeBracket];
              if (rewireCostLookup !== undefined) {
                const rewireCost = rewireCostLookup * request.squareFootage;
                totalCost += rewireCost;
                details.push(`${rewireData.name} - ${rewireData.scope}`);
              }
            }
            
            // Add panel replacement cost (fixed fee)
            if (panelData) {
              const panelCostLookup = panelData.costs[1]?.[sizeBracket];
              if (panelCostLookup !== undefined) {
                totalCost += panelCostLookup;
                details.push(`${panelData.name} - ${panelData.scope}`);
              }
            }
          }
          
          if (totalCost > 0) {
            categoryBreakdown[categoryName] = {
              cost: totalCost,
              details: details.join(' + '),
              pricingBasis: sliderValue === 1 ? 'fixed_fee' : 'sqft_floor + fixed_fee'
            };
            
            subtotal += totalCost;
          }
        } else if (categoryName === 'plumbing') {
          // Special handling for plumbing category
          if (sliderValue > 0) {
            // Half Re-pipe (1) or Full Re-pipe (2) - per sqft
            const selectedItemCode = 'plumbing_repipe_sqft';
            const selectedItemData = categoryData[selectedItemCode];
            
            if (selectedItemData) {
              // Plumbing uses tier 1 (no tier differentiation)
              const costLookup = selectedItemData.costs[1]?.[sizeBracket];
              
              if (costLookup !== undefined) {
                // Calculate coverage percentage: Half (50%) or Full (100%)
                const coveragePercentage = sliderValue === 1 ? 0.5 : 1.0;
                // Per SqFt: cost per square foot
                const itemCost = costLookup * request.squareFootage * coveragePercentage;
                
                const coverageLabel = sliderValue === 1 ? 'Half Re-pipe' : 'Full Re-pipe';
                
                categoryBreakdown[categoryName] = {
                  cost: itemCost,
                  details: `${selectedItemData.name} - ${coverageLabel}`,
                  pricingBasis: selectedItemData.pricingBasis
                };
                
                subtotal += itemCost;
              }
            }
          }
        } else if (categoryName === 'interior_paint') {
          // Special handling for interior paint category
          if (sliderValue > 0) {
            // Half Repaint (1) or Full Repaint (2) - per sqft floor
            const selectedItemCode = 'interior_paint';
            const selectedItemData = categoryData[selectedItemCode];
            
            if (selectedItemData) {
              // Interior paint uses tier 1 (no tier differentiation)
              const costLookup = selectedItemData.costs[1]?.[sizeBracket];
              
              if (costLookup !== undefined) {
                // Calculate coverage percentage: Half (50%) or Full (100%)
                const coveragePercentage = sliderValue === 1 ? 0.5 : 1.0;
                // Per SqFt Floor: cost per square foot of floor space
                const itemCost = costLookup * request.squareFootage * coveragePercentage;
                
                const coverageLabel = sliderValue === 1 ? 'Half Repaint' : 'Full Repaint';
                
                categoryBreakdown[categoryName] = {
                  cost: itemCost,
                  details: `${selectedItemData.name} - ${coverageLabel}`,
                  pricingBasis: selectedItemData.pricingBasis
                };
                
                subtotal += itemCost;
              }
            }
          }
        } else if (categoryName === 'exterior_paint') {
          // Special handling for exterior paint category
          let selectedItemCode = null;
          let selectedItemData = null;
          let itemCost = 0;
          
          if (sliderValue === 1) {
            // Pressure Wash Only - fixed fee
            selectedItemCode = 'exterior_pressure_wash';
            selectedItemData = categoryData[selectedItemCode];
            
            if (selectedItemData) {
              const costLookup = selectedItemData.costs[1]?.[sizeBracket];
              if (costLookup !== undefined) {
                itemCost = costLookup; // Fixed fee
              }
            }
          } else if (sliderValue === 2 || sliderValue === 3) {
            // Half Repaint (2) or Full Repaint (3) - per sqft
            selectedItemCode = 'exterior_repaint_siding';
            selectedItemData = categoryData[selectedItemCode];
            
            if (selectedItemData) {
              const costLookup = selectedItemData.costs[1]?.[sizeBracket];
              if (costLookup !== undefined) {
                // Calculate coverage percentage: Half (50%) or Full (100%)
                const coveragePercentage = sliderValue === 2 ? 0.5 : 1.0;
                // Use square footage directly
                itemCost = costLookup * request.squareFootage * coveragePercentage;
              }
            }
          }
          
          if (selectedItemCode && selectedItemData && itemCost > 0) {
            const serviceLabel = sliderValue === 1 ? 'Pressure Wash Only' : 
                                sliderValue === 2 ? 'Half Repaint' : 'Full Repaint';
            
            categoryBreakdown[categoryName] = {
              cost: itemCost,
              details: `${selectedItemData.name} - ${serviceLabel}`,
              pricingBasis: selectedItemData.pricingBasis
            };
            
            subtotal += itemCost;
          }
        } else if (categoryName === 'exterior_siding') {
          // Special handling for exterior siding category - vinyl only with coverage options
          if (sliderValue > 0) {
            // Vinyl siding with coverage: 1/4, 2/4, 3/4, or Full
            const selectedItemCode = 'siding_vinyl';
            const selectedItemData = categoryData[selectedItemCode];
            
            if (selectedItemData) {
              // Siding items use tier 1 (no tier differentiation)
              const costLookup = selectedItemData.costs[1]?.[sizeBracket];
              
              if (costLookup !== undefined) {
                // Calculate coverage percentage: 1/4=25%, 2/4=50%, 3/4=75%, 4=100%
                const coveragePercentage = sliderValue / 4;
                // Per SqFt: Use square footage with coverage
                const itemCost = costLookup * request.squareFootage * coveragePercentage;
                
                const coverageLabel = sliderValue === 4 ? 'Full Vinyl Siding' : `${sliderValue}/4 Vinyl Siding`;
                
                categoryBreakdown[categoryName] = {
                  cost: itemCost,
                  details: `${selectedItemData.name} - ${coverageLabel}`,
                  pricingBasis: selectedItemData.pricingBasis
                };
                
                subtotal += itemCost;
              }
            }
          }
        } else if (categoryName === 'kitchen') {
          // Special handling for kitchen category
          let selectedItemCode = null;
          let selectedItemData = null;
          
          if (sliderValue === 1) {
            // Partial Refresh - select tier based on ARV (only tier 1 and 2 available)
            const partialTierCode = tier <= 2 ? `kitchen_partial_t${tier}` : 'kitchen_partial_t2';
            selectedItemCode = partialTierCode;
            selectedItemData = categoryData[selectedItemCode];
          } else if (sliderValue === 2) {
            // Full Replacement - select tier based on ARV (tier 1, 2, or 3)
            const fullTierCode = `kitchen_full_t${tier}`;
            selectedItemCode = fullTierCode;
            selectedItemData = categoryData[selectedItemCode];
          }
          
          if (selectedItemCode && selectedItemData) {
            // Kitchen items use the appropriate tier for cost lookup
            const lookupTier = sliderValue === 1 ? Math.min(tier, 2) : tier; // Partial only has T1/T2
            const costLookup = selectedItemData.costs[lookupTier]?.[sizeBracket];
            
            if (costLookup !== undefined) {
              // Kitchen is always fixed cost
              const itemCost = costLookup;
              
              categoryBreakdown[categoryName] = {
                cost: itemCost,
                details: `${selectedItemData.name} - ${selectedItemData.scope}`,
                pricingBasis: selectedItemData.pricingBasis
              };
              
              subtotal += itemCost;
            }
          }
        } else if (categoryName === 'roof') {
          // Special handling for roof category
          let selectedItemCode = null;
          let selectedItemData = null;
          
          if (sliderValue === 1) {
            // 3-Tab Shingles - Tier 1 only
            selectedItemCode = 'roof_asphalt_3tab';
            selectedItemData = categoryData[selectedItemCode];
          } else if (sliderValue === 2) {
            // Architectural Shingles - Tier 2/3
            selectedItemCode = 'roof_asphalt_architectural';
            selectedItemData = categoryData[selectedItemCode];
          }
          
          if (selectedItemCode && selectedItemData) {
            // Roof items: 3-tab uses tier 1, architectural uses tier 2
            const lookupTier = sliderValue === 1 ? 1 : 2;
            const costLookup = selectedItemData.costs[lookupTier]?.[sizeBracket];
            
            if (costLookup !== undefined) {
              // Per SqFt: Use square footage directly
              const itemCost = costLookup * request.squareFootage;
              
              categoryBreakdown[categoryName] = {
                cost: itemCost,
                details: `${selectedItemData.name} - Full roof replacement`,
                pricingBasis: selectedItemData.pricingBasis
              };
              
              subtotal += itemCost;
            }
          }
        } else if (categoryName === 'hvac') {
          // Special handling for HVAC category
          let selectedItemCode = null;
          let selectedItemData = null;
          
          if (sliderValue === 1) {
            // Repair - fixed cost
            selectedItemCode = 'hvac_repair';
            selectedItemData = categoryData[selectedItemCode];
          } else if (sliderValue === 2) {
            // Replace Condenser/Furnace - fixed cost
            selectedItemCode = 'hvac_replace_unit';
            selectedItemData = categoryData[selectedItemCode];
          } else if (sliderValue === 3) {
            // Full System - size-based cost
            const sizeBasedCode = sizeBracket === 'Small' ? 'hvac_full_small' :
                                 sizeBracket === 'Medium' ? 'hvac_full_medium' : 'hvac_full_large';
            selectedItemCode = sizeBasedCode;
            selectedItemData = categoryData[selectedItemCode];
          }
          
          if (selectedItemCode && selectedItemData) {
            // HVAC items use tier 1 (no tier differentiation)
            // For repair and replace unit, always use "Small" since they're fixed costs
            // For full system, use the appropriate size bracket
            const lookupSize = (sliderValue === 1 || sliderValue === 2) ? 'Small' : sizeBracket;
            const costLookup = selectedItemData.costs[1]?.[lookupSize];
            
            if (costLookup !== undefined) {
              // HVAC is always fixed cost
              const itemCost = costLookup;
              
              categoryBreakdown[categoryName] = {
                cost: itemCost,
                details: `${selectedItemData.name} - ${selectedItemData.scope}`,
                pricingBasis: selectedItemData.pricingBasis
              };
              
              subtotal += itemCost;
            }
          }
        } else if (categoryName === 'flooring') {
          // Special handling for flooring category - tier-based material selection
          if (sliderValue > 0) {
            let totalCost = 0;
            const details = [];
            
            // Determine appropriate materials based on ARV tier
            const carpetItemCode = tier === 1 ? 'flooring_carpet_basic' : 'flooring_carpet_upgraded';
            const lvpItemCode = tier === 1 ? 'flooring_lvp_basic' : 
                               tier === 2 ? 'flooring_lvp_mid' : 'flooring_lvp_premium';
            
            // Room allocation percentages
            const bedroomPercentage = 0.4; // 40% of total sqft
            const livingPercentage = 0.6;  // 60% of total sqft
            
            if (sliderValue === 1) {
              // Bedrooms Only: 40% carpet
              const carpetData = categoryData[carpetItemCode];
              if (carpetData) {
                const costLookup = carpetData.costs[tier === 1 ? 1 : 2]?.[sizeBracket];
                if (costLookup !== undefined) {
                  const carpetCost = costLookup * request.squareFootage * bedroomPercentage;
                  totalCost += carpetCost;
                  details.push(`${carpetData.name} (Bedrooms: ${Math.round(request.squareFootage * bedroomPercentage)} sqft)`);
                }
              }
            } else if (sliderValue === 2) {
              // Living Areas Only: 60% LVP
              const lvpData = categoryData[lvpItemCode];
              if (lvpData) {
                const costLookup = lvpData.costs[tier]?.[sizeBracket];
                if (costLookup !== undefined) {
                  const lvpCost = costLookup * request.squareFootage * livingPercentage;
                  totalCost += lvpCost;
                  details.push(`${lvpData.name} (Living Areas: ${Math.round(request.squareFootage * livingPercentage)} sqft)`);
                }
              }
            } else if (sliderValue === 3) {
              // Full: 40% carpet + 60% LVP
              const carpetData = categoryData[carpetItemCode];
              const lvpData = categoryData[lvpItemCode];
              
              if (carpetData) {
                const carpetCostLookup = carpetData.costs[tier === 1 ? 1 : 2]?.[sizeBracket];
                if (carpetCostLookup !== undefined) {
                  const carpetCost = carpetCostLookup * request.squareFootage * bedroomPercentage;
                  totalCost += carpetCost;
                  details.push(`${carpetData.name} (Bedrooms: ${Math.round(request.squareFootage * bedroomPercentage)} sqft)`);
                }
              }
              
              if (lvpData) {
                const lvpCostLookup = lvpData.costs[tier]?.[sizeBracket];
                if (lvpCostLookup !== undefined) {
                  const lvpCost = lvpCostLookup * request.squareFootage * livingPercentage;
                  totalCost += lvpCost;
                  details.push(`${lvpData.name} (Living Areas: ${Math.round(request.squareFootage * livingPercentage)} sqft)`);
                }
              }
            }
            
            if (totalCost > 0) {
              categoryBreakdown[categoryName] = {
                cost: totalCost,
                details: details.join(' + '),
                pricingBasis: 'sqft_floor'
              };
              
              subtotal += totalCost;
            }
          }
        } else if (categoryName === 'water_heater') {
          // Special handling for water heater category based on property size
          let selectedItemCode = null;
          let selectedItemData = null;
          
          if (sliderValue === 1) {
            // 40-Gal Tank - for Small/Medium properties (<2,000 sqft)
            selectedItemCode = 'water_heater_40gal';
            selectedItemData = categoryData[selectedItemCode];
          } else if (sliderValue === 2) {
            // 50-Gal Tank - for Medium/Large properties (>2,000 sqft)
            selectedItemCode = 'water_heater_50gal';
            selectedItemData = categoryData[selectedItemCode];
          }
          
          if (selectedItemCode && selectedItemData) {
            // Water heater items use tier 1 (no tier differentiation)
            // Use the appropriate property size for cost lookup with fallback logic
            let costLookup = selectedItemData.costs[1]?.[sizeBracket];
            let actualSizeBracket: 'Small' | 'Medium' | 'Large' = sizeBracket;
            
            // If the exact size bracket doesn't exist, find the closest available size
            if (costLookup === undefined && selectedItemData.costs[1]) {
              const availableSizes = Object.keys(selectedItemData.costs[1]);
              // console.log(`Water heater ${selectedItemCode} doesn't have data for ${sizeBracket}, available sizes:`, availableSizes);
              
              // For 50-gal water heater on Small properties, fallback to Medium
              if (selectedItemCode === 'water_heater_50gal' && sizeBracket === 'Small' && availableSizes.includes('Medium')) {
                costLookup = selectedItemData.costs[1]['Medium'];
                actualSizeBracket = 'Medium';
                // console.log(`Using Medium size fallback for 50-gal water heater on Small property: $${costLookup}`);
              }
              // For 40-gal water heater on Large properties, fallback to Medium
              else if (selectedItemCode === 'water_heater_40gal' && sizeBracket === 'Large' && availableSizes.includes('Medium')) {
                costLookup = selectedItemData.costs[1]['Medium'];
                actualSizeBracket = 'Medium';
                // console.log(`Using Medium size fallback for 40-gal water heater on Large property: $${costLookup}`);
              }
              // General fallback: use first available size (with type safety)
              else if (availableSizes.length > 0) {
                const fallbackSize = availableSizes[0] as 'Small' | 'Medium' | 'Large';
                if (['Small', 'Medium', 'Large'].includes(fallbackSize)) {
                  costLookup = selectedItemData.costs[1][fallbackSize];
                  actualSizeBracket = fallbackSize;
                  // console.log(`Using ${fallbackSize} size fallback for ${selectedItemCode}: $${costLookup}`);
                }
              }
            }
            
            if (costLookup !== undefined) {
              // Water heater is always fixed cost
              const itemCost = costLookup;
              
              // Add size bracket info to details if fallback was used
              const sizeInfo = actualSizeBracket !== sizeBracket ? ` (using ${actualSizeBracket} pricing)` : '';
              
              categoryBreakdown[categoryName] = {
                cost: itemCost,
                details: `${selectedItemData.name} - ${selectedItemData.scope}${sizeInfo}`,
                pricingBasis: selectedItemData.pricingBasis
              };
              
              subtotal += itemCost;
            }
          }
        } else if (categoryName === 'windows') {
          // Special handling for windows category
          if (sliderValue > 0) {
            // Find windows item (should be tier-based)
            let selectedItemCode = null;
            let selectedItemData = null;
            
            // Look for tier-appropriate windows item
            const windowsTier1Code = 'windows_tier1';
            const windowsTier23Code = 'windows_tier23';
            
            if (tier === 1 && categoryData[windowsTier1Code]) {
              selectedItemCode = windowsTier1Code;
              selectedItemData = categoryData[windowsTier1Code];
            } else if ((tier === 2 || tier === 3) && categoryData[windowsTier23Code]) {
              selectedItemCode = windowsTier23Code;
              selectedItemData = categoryData[windowsTier23Code];
            }
            
            if (selectedItemCode && selectedItemData) {
              // Windows use tier-specific lookup
              const lookupTier = tier === 1 ? 1 : 2; // Tier 2/3 both use tier 2 data
              const costLookup = selectedItemData.costs[lookupTier]?.[sizeBracket];
              
              if (costLookup !== undefined) {
                // Per window: cost per window * number of windows
                const windowCount = Math.min(Math.max(sliderValue, 0), 20); // Clamp between 0-20
                const itemCost = costLookup * windowCount;
                
                categoryBreakdown[categoryName] = {
                  cost: itemCost,
                  details: `${selectedItemData.name} - ${windowCount} window${windowCount !== 1 ? 's' : ''}`,
                  pricingBasis: selectedItemData.pricingBasis
                };
                
                subtotal += itemCost;
              }
            }
          }
        }
      }
    });
    
    // Calculate contingency and total
    const contingencyAmount = subtotal * (request.contingency / 100);
    const total = subtotal + contingencyAmount;
    const perSquareFoot = request.squareFootage > 0 ? total / request.squareFootage : 0;
    
    return {
      categoryBreakdown,
      subtotal,
      contingencyAmount,
      total,
      perSquareFoot,
      tier,
      sizeBracket,
      afterRepairValue: request.afterRepairValue,
      squareFootage: request.squareFootage,
      contingencyPercentage: request.contingency
    };
  }
  
  /**
   * Get calculation parameters (tier and size bracket)
   */
  async getCalculationParameters(
    afterRepairValue: number,
    squareFootage: number
  ): Promise<{ tier: number; sizeBracket: 'Small' | 'Medium' | 'Large' } | null> {
    try {
      const cacheBuster = `_=${new Date().getTime()}`;
      
      const response = await fetch(`${config.apiUrl}/api/rehab/calculate-parameters?${cacheBuster}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          afterRepairValue,
          squareFootage
        })
      });
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          tier: result.data.tier,
          sizeBracket: result.data.sizeBracket
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    rehabDataCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: rehabDataCache.size,
      keys: Array.from(rehabDataCache.keys())
    };
  }
}

export default new RehabCalculatorService(); 