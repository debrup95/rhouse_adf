import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RentValues {
  rent: number;
  expense: number;
  capRate: number;
  highRehab: number;
  afterRepairValue: number;
  // Add fields for default vs custom high rehab tracking
  defaultHighRehab: number; // Backend calculated value
  customHighRehab: number; // User's custom value from detailed calculator
  isUsingCustomHighRehab: boolean; // Whether user switched to custom
  // Store detailed category breakdown from detailed calculator
  detailedCategories?: Record<string, number>;
  detailedContingency?: number;
  detailedMiscAmount?: number;
}

interface FlipValues {
  sellingCosts: number;
  holdingCosts: number;
  margin: number;
  highRehab: number;
  afterRepairValue: number;
  estimatedOffer: number;
  // Add fields for default vs custom high rehab tracking
  defaultHighRehab: number; // Backend calculated value
  customHighRehab: number; // User's custom value from detailed calculator
  isUsingCustomHighRehab: boolean; // Whether user switched to custom
  // Store detailed category breakdown from detailed calculator
  detailedCategories?: Record<string, number>;
  detailedContingency?: number;
  detailedMiscAmount?: number;
}

interface OfferRange {
  low: number;
  high: number;
}

interface BuyerEstimatedPrice {
  buyerEstimatedOffer: number;
  targetProfit: number;
  maxAllowableOffer: number;
}

interface UnderwriteState {
  activeStrategy: 'rent' | 'flip';
  rent: RentValues;
  flip: FlipValues;
  offerRange: OfferRange; // Keep for backward compatibility
  buyerEstimatedPrice: BuyerEstimatedPrice;
  currentAddress: string | null;
}

const initialState: UnderwriteState = {
  activeStrategy: 'rent',
  rent: {
    rent: 0,
    expense: 0,
    capRate: 0,
    highRehab: 0,
    afterRepairValue: 0,
    defaultHighRehab: 0,
    customHighRehab: 0,
    isUsingCustomHighRehab: true,
    detailedCategories: {},
    detailedContingency: 10,
    detailedMiscAmount: 0
  },
  flip: {
    sellingCosts: 0,
    holdingCosts: 0,
    margin: 0,
    highRehab: 0,
    afterRepairValue: 0,
    estimatedOffer: 0,
    defaultHighRehab: 0,
    customHighRehab: 0,
    isUsingCustomHighRehab: true,
    detailedCategories: {},
    detailedContingency: 10,
    detailedMiscAmount: 0
  },
  offerRange: {
    low: 0,
    high: 0
  },
  buyerEstimatedPrice: {
    buyerEstimatedOffer: 0,
    targetProfit: 0,
    maxAllowableOffer: 0
  },
  currentAddress: null,
};

export const underwriteSlice = createSlice({
  name: 'underwrite',
  initialState,
  reducers: {
    setActiveStrategy: (state, action: PayloadAction<'rent' | 'flip'>) => {
      state.activeStrategy = action.payload;
    },
    updateRentValues: (state, action: PayloadAction<RentValues>) => {
      state.rent = {...state.rent, ...action.payload};
    },
    updateFlipValues: (state, action: PayloadAction<FlipValues>) => {
      state.flip = {...state.flip, ...action.payload};
    },
    updateRentARV: (state, action: PayloadAction<number>) => {
      state.rent.afterRepairValue = action.payload;
    },
    updateFlipARV: (state, action: PayloadAction<number>) => {
      state.flip.afterRepairValue = action.payload;
    },
    updateOfferRange: (state, action: PayloadAction<OfferRange>) => {
      state.offerRange = action.payload;
    },
    updateBuyerEstimatedPrice: (state, action: PayloadAction<BuyerEstimatedPrice>) => {
      state.buyerEstimatedPrice = action.payload;
    },
    updateTargetProfit: (state, action: PayloadAction<number>) => {
      state.buyerEstimatedPrice.targetProfit = action.payload;
      // Recalculate max allowable offer when target profit changes
      state.buyerEstimatedPrice.maxAllowableOffer = 
        state.buyerEstimatedPrice.buyerEstimatedOffer - action.payload;
    },
    setCurrentAddress: (state, action: PayloadAction<string | null>) => {
      state.currentAddress = action.payload;
    },
    resetUnderwriteValues: (state) => {
      return initialState;
    },
    // Add actions for high rehab toggle functionality
    toggleRentHighRehabMode: (state) => {
      if (state.rent.isUsingCustomHighRehab) {
        // Switch back to default - store current value as custom and restore default
        state.rent.customHighRehab = state.rent.highRehab;
        state.rent.highRehab = state.rent.defaultHighRehab;
        state.rent.isUsingCustomHighRehab = false;
      } else {
        // Switch to custom - restore the stored custom value if available
        // Use a more robust check: if customHighRehab has been set (not just > 0)
        if (state.rent.customHighRehab !== state.rent.defaultHighRehab && state.rent.customHighRehab >= 0) {
          state.rent.highRehab = state.rent.customHighRehab;
        }
        state.rent.isUsingCustomHighRehab = true;
      }
    },
    toggleFlipHighRehabMode: (state) => {
      if (state.flip.isUsingCustomHighRehab) {
        // Switch back to default - store current value as custom and restore default
        state.flip.customHighRehab = state.flip.highRehab;
        state.flip.highRehab = state.flip.defaultHighRehab;
        state.flip.isUsingCustomHighRehab = false;
      } else {
        // Switch to custom - restore the stored custom value if available
        // Use a more robust check: if customHighRehab has been set (not just > 0)
        if (state.flip.customHighRehab !== state.flip.defaultHighRehab && state.flip.customHighRehab >= 0) {
          state.flip.highRehab = state.flip.customHighRehab;
        }
        state.flip.isUsingCustomHighRehab = true;
      }
    },
    updateRentDefaultHighRehab: (state, action: PayloadAction<number>) => {
      // Update the default value when backend data loads
      state.rent.defaultHighRehab = action.payload;
      // If not using custom, also update the current value
      if (!state.rent.isUsingCustomHighRehab) {
        state.rent.highRehab = action.payload;
      }
    },
    updateFlipDefaultHighRehab: (state, action: PayloadAction<number>) => {
      // Update the default value when backend data loads
      state.flip.defaultHighRehab = action.payload;
      // If not using custom, also update the current value
      if (!state.flip.isUsingCustomHighRehab) {
        state.flip.highRehab = action.payload;
      }
    },
    // Actions to set custom high rehab values from detailed calculator
    setRentCustomHighRehab: (state, action: PayloadAction<number>) => {
      state.rent.highRehab = action.payload;
      state.rent.customHighRehab = action.payload; // Store the custom value
      state.rent.isUsingCustomHighRehab = true;
    },
    setFlipCustomHighRehab: (state, action: PayloadAction<number>) => {
      state.flip.highRehab = action.payload;
      state.flip.customHighRehab = action.payload; // Store the custom value
      state.flip.isUsingCustomHighRehab = true;
    },
    // Actions to update high rehab values without changing mode
    updateRentHighRehabValue: (state, action: PayloadAction<number>) => {
      state.rent.highRehab = action.payload;
      // Only update customHighRehab if we're in custom mode
      // Never update defaultHighRehab from user input - that's only for backend updates
      if (state.rent.isUsingCustomHighRehab) {
        state.rent.customHighRehab = action.payload;
      }
    },
    updateFlipHighRehabValue: (state, action: PayloadAction<number>) => {
      state.flip.highRehab = action.payload;
      // Only update customHighRehab if we're in custom mode
      // Never update defaultHighRehab from user input - that's only for backend updates
      if (state.flip.isUsingCustomHighRehab) {
        state.flip.customHighRehab = action.payload;
      }
    },
    // Actions to store detailed category breakdown from detailed calculator
    setRentDetailedCategories: (state, action: PayloadAction<{
      categories: Record<string, number>;
      contingency: number;
      miscAmount: number;
      highRehab: number;
    }>) => {
      state.rent.detailedCategories = action.payload.categories;
      state.rent.detailedContingency = action.payload.contingency;
      state.rent.detailedMiscAmount = action.payload.miscAmount;
      state.rent.highRehab = action.payload.highRehab;
      state.rent.customHighRehab = action.payload.highRehab;
      state.rent.isUsingCustomHighRehab = true;
    },
    setFlipDetailedCategories: (state, action: PayloadAction<{
      categories: Record<string, number>;
      contingency: number;
      miscAmount: number;
      highRehab: number;
    }>) => {
      state.flip.detailedCategories = action.payload.categories;
      state.flip.detailedContingency = action.payload.contingency;
      state.flip.detailedMiscAmount = action.payload.miscAmount;
      state.flip.highRehab = action.payload.highRehab;
      state.flip.customHighRehab = action.payload.highRehab;
      state.flip.isUsingCustomHighRehab = true;
    },
    // Actions to clear detailed rehab and custom values when property/condition changes
    clearDetailedRehabValues: (state) => {
      // Clear rent detailed values
      state.rent.detailedCategories = {};
      state.rent.detailedContingency = 10;
      state.rent.detailedMiscAmount = 0;
      state.rent.customHighRehab = 0;
      state.rent.isUsingCustomHighRehab = false;
      // Reset high rehab to default if available
      if (state.rent.defaultHighRehab > 0) {
        state.rent.highRehab = state.rent.defaultHighRehab;
      }
      
      // Clear flip detailed values
      state.flip.detailedCategories = {};
      state.flip.detailedContingency = 10;
      state.flip.detailedMiscAmount = 0;
      state.flip.customHighRehab = 0;
      state.flip.isUsingCustomHighRehab = false;
      // Reset high rehab to default if available
      if (state.flip.defaultHighRehab > 0) {
        state.flip.highRehab = state.flip.defaultHighRehab;
      }
    },
  },
});

export const { 
  setActiveStrategy, 
  updateRentValues, 
  updateFlipValues,
  updateRentARV,
  updateFlipARV,
  updateOfferRange,
  updateBuyerEstimatedPrice,
  updateTargetProfit,
  setCurrentAddress,
  resetUnderwriteValues,
  toggleRentHighRehabMode,
  toggleFlipHighRehabMode,
  updateRentDefaultHighRehab,
  updateFlipDefaultHighRehab,
  setRentCustomHighRehab,
  setFlipCustomHighRehab,
  updateRentHighRehabValue,
  updateFlipHighRehabValue,
  setRentDetailedCategories,
  setFlipDetailedCategories,
  clearDetailedRehabValues
} = underwriteSlice.actions;

export default underwriteSlice.reducer; 