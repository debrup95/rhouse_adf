// Shared Estimates Types and Interfaces
// These define the data structures for the shared estimates feature

export interface SharedEstimateData {
    id: string; // UUID from database
    shareToken: string;
    isActive: boolean;
    expiresAt: string; // ISO date string
    viewCount: number;
    interactionCount: number;
    lastAccessed?: string; // ISO date string
    createdAt: string; // ISO date string
    propertyAddress: string;
    
    // Sanitized estimate data (sensitive info removed)
    estimateData: PublicEstimateData;
    
    // Analytics summary
    analytics?: SharedEstimateAnalytics;
  }
  
  export interface PublicEstimateData {
    // Core property information (safe to share)
    property: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      bedrooms?: number;
      bathrooms?: number;
      squareFootage?: number;
      yearBuilt?: number;
      propertyType?: string;
      latitude?: number;
      longitude?: number;
    };
  
    // Main estimate result (what user wants to share)
    buyerEstimatedPrice: number;
    
    // Interactive slider values (user can modify these)
    underwriteValues: {
      rent: PublicUnderwriteSlider;
      expense: PublicUnderwriteSlider;
      capRate: PublicUnderwriteSlider;
      rehabCosts: PublicUnderwriteSlider;
      sellingCosts?: PublicUnderwriteSlider;
      holdingCosts?: PublicUnderwriteSlider;
      margin?: PublicUnderwriteSlider;
    };
  
    // Comparable properties (filtered and sanitized)
    comparableProperties: PublicComparable[];
    
    // Neighborhood data
    neighborhoodStats: {
      averagePricePerSqft: number;
      medianPricePerSqft: number;
      totalComparables: number;
      priceRange: {
        min: number;
        max: number;
      };
    };
  
    // Investment strategy
    activeInvestmentStrategy: 'rent' | 'flip';
    
    // Timestamp of original calculation
    calculatedAt: string;
  
    // HIDDEN FIELDS (not exposed to public):
    // - maxAllowableOffer
    // - targetProfit  
    // - internal calculation formulas
    // - business rules
    // - user-specific data
  }
  
  export interface PublicUnderwriteSlider {
    value: number;
    min: number;
    max: number;
    step: number;
    label: string;
    description?: string;
  }
  
  export interface PublicComparable {
    id: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    price: number;
    pricePerSqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    yearBuilt?: number;
    distanceFromTarget: number; // in miles
    eventType: 'SALE' | 'RENTAL';
    eventDate: string;
    daysOnMarket?: number;
    propertyType?: string;
    // Note: No internal IDs or sensitive business data exposed
  }
  
  export interface SharedEstimateAnalytics {
    totalViews: number;
    uniqueSessions: number;
    totalInteractions: number;
    averageTimeOnPage?: number;
    deviceBreakdown: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
    geographicBreakdown: Record<string, number>; // country code -> count
    mostAdjustedSliders: string[];
    recentActivity: AnalyticsEvent[];
  }
  
  export interface AnalyticsEvent {
    eventType: AnalyticsEventType;
    timestamp: string;
    eventData?: Record<string, any>;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    location?: {
      country?: string;
      city?: string;
    };
  }
  
  export type AnalyticsEventType = 
    | 'view'
    | 'slider_change'
    | 'comp_filter'
    | 'calculation_update'
    | 'property_details_view'
    | 'comparable_click'
    | 'neighborhood_explore'
    | 'print_estimate'
    | 'save_attempt'
    | 'share_attempt'
    | 'exit_intent'
    | 'session_start'
    | 'session_end';
  
  // Filter options for comparables
  export interface ComparableFilters {
    propertyType?: string[];
    bedrooms?: {
      min?: number;
      max?: number;
    };
    bathrooms?: {
      min?: number;
      max?: number;
    };
    squareFootage?: {
      min?: number;
      max?: number;
    };
    priceRange?: {
      min?: number;
      max?: number;
    };
    distance?: {
      max: number; // in miles
    };
    saleDate?: {
      months: number; // last N months
    };
    eventType?: ('SALE' | 'RENTAL')[];
  }
  
  // API request/response types
  export interface CreateSharedEstimateRequest {
    savedEstimateId: number;
    expiresInHours?: number; // defaults to 48
  }
  
  export interface CreateSharedEstimateResponse {
    shareToken: string;
    shareUrl: string;
    expiresAt: string;
    estimateData: SharedEstimateData;
  }
  
  export interface GetSharedEstimateResponse {
    success: boolean;
    data?: SharedEstimateData;
    error?: string;
  }
  
  export interface UpdateSharedCalculationRequest {
    underwriteValues: Record<string, number>;
    filters?: ComparableFilters;
  }
  
  export interface UpdateSharedCalculationResponse {
    success: boolean;
    data?: {
      buyerEstimatedPrice: number;
      updatedCalculations: any;
      filteredComparables: PublicComparable[];
    };
    error?: string;
  }
  
  export interface TrackAnalyticsRequest {
    eventType: AnalyticsEventType;
    eventData?: Record<string, any>;
    sessionId?: string;
    deviceInfo?: {
      userAgent?: string;
      deviceType?: 'desktop' | 'mobile' | 'tablet';
      browserName?: string;
      osName?: string;
    };
    location?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
  }
  
  // User's shared estimates management
  export interface UserSharedEstimate {
    id: string;
    shareToken: string;
    propertyAddress: string;
    isActive: boolean;
    expiresAt: string;
    createdAt: string;
    viewCount: number;
    interactionCount: number;
    lastAccessed?: string;
  }
  
  export interface SharedEstimateStats {
    totalSharedEstimates: number;
    activeSharedEstimates: number;
    expiredSharedEstimates: number;
    totalViews: number;
    totalInteractions: number;
    mostViewedEstimate?: {
      id: string;
      propertyAddress: string;
      views: number;
    };
  }
  
  // Component prop types
  export interface SharedEstimatePageProps {
    shareToken: string;
  }
  
  export interface SharedEstimateDisplayProps {
    estimateData: PublicEstimateData;
    onSliderChange: (field: string, value: number) => void;
    onFilterChange: (filters: ComparableFilters) => void;
    isLoading?: boolean;
  }
  
  export interface SharedComparablesProps {
    comparables: PublicComparable[];
    filters: ComparableFilters;
    onFilterChange: (filters: ComparableFilters) => void;
    onComparableClick: (comparable: PublicComparable) => void;
    isLoading?: boolean;
  }
  
  export interface SharedUnderwriteSlidersProps {
    values: Record<string, PublicUnderwriteSlider>;
    onChange: (field: string, value: number) => void;
    activeStrategy: 'rent' | 'flip';
    isLoading?: boolean;
  }
  
  // Error types
  export interface SharedEstimateError {
    code: 'NOT_FOUND' | 'EXPIRED' | 'INACTIVE' | 'INVALID_TOKEN' | 'SERVER_ERROR';
    message: string;
    details?: any;
  }