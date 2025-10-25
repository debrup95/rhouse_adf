// Skip Trace Provider Interfaces and Types
// This file defines the abstraction layer for different skip tracing providers

export interface SkipTraceAddress {
  street: string;
  city?: string;
  state?: string;
  zipCode?: string;
  apn?: string; // Assessor's Parcel Number
}

export interface SkipTraceRequest {
  addresses: SkipTraceAddress[];
  buyerName?: string;
  options?: {
    includeBusinesses?: boolean;
    includeDNC?: boolean;
    includeLitigators?: boolean;
    maxResults?: number;
  };
}

export interface StandardizedPhoneNumber {
  number: string;
  type?: string;
  carrier?: string;
  lastSeen?: string;
  isDNC?: boolean;
  isLitigator?: boolean;
}

export interface StandardizedEmail {
  email: string;
  type?: string;
}

export interface StandardizedAddress {
  address: string;
  type?: string;
}

export interface StandardizedOwner {
  id: string;
  name: string;
  type: 'person' | 'business';
  age?: number;
  deceased?: boolean;
  relationshipType?: string;
  matchConfidence: number;
  matchType: 'exact' | 'fuzzy_name' | 'company_name' | 'fallback';
  phoneNumbers: StandardizedPhoneNumber[];
  emails: StandardizedEmail[];
  addresses: StandardizedAddress[];
}

export interface StandardizedPropertyResult {
  propertyAddress: string;
  apn?: string;
  owners: StandardizedOwner[];
  statusCode: number;
  success: boolean;
  errors?: string[];
  sourceProvider: string;
}

export interface SkipTraceResponse {
  results: StandardizedPropertyResult[];
  totalResults: number;
  successful: number;
  failed: number;
  provider: string;
  requestId?: string;
  isAsync?: boolean;
  jobId?: string; // For async providers like BatchData
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  retries?: number;
  isAsync?: boolean;
  supportsBatch?: boolean;
  maxBatchSize?: number;
  rateLimitPerSecond?: number;
}

// Abstract base class for skip trace providers
export abstract class SkipTraceProvider {
  protected config: ProviderConfig;
  
  constructor(config: ProviderConfig) {
    this.config = config;
  }

  // Core method that all providers must implement
  abstract performSkipTrace(request: SkipTraceRequest): Promise<SkipTraceResponse>;
  
  // Optional methods for async providers
  async checkJobStatus?(jobId: string): Promise<{ status: string; result?: SkipTraceResponse }> {
    throw new Error('Async operations not supported by this provider');
  }
  
  // Method to validate provider configuration
  abstract validateConfig(): boolean;
  
  // Method to test connectivity
  abstract testConnection(): Promise<boolean>;
  
  // Method to get provider capabilities
  getCapabilities(): {
    isAsync: boolean;
    supportsBatch: boolean;
    maxBatchSize: number;
    supportsDNC: boolean;
    supportsLitigators: boolean;
  } {
    return {
      isAsync: this.config.isAsync || false,
      supportsBatch: this.config.supportsBatch || false,
      maxBatchSize: this.config.maxBatchSize || 1,
      supportsDNC: true,
      supportsLitigators: true,
    };
  }
  
  // Normalize address for consistency across providers
  protected normalizeAddress(address: SkipTraceAddress): SkipTraceAddress {
    return {
      street: address.street?.trim() || '',
      city: address.city?.trim() || undefined,
      state: address.state?.trim()?.toUpperCase() || undefined,
      zipCode: address.zipCode?.trim() || undefined,
      apn: address.apn?.trim() || undefined,
    };
  }
}

// Provider factory interface
export interface SkipTraceProviderFactory {
  createProvider(providerName: string, config: ProviderConfig): SkipTraceProvider;
  getAvailableProviders(): string[];
}

// Enum for supported providers
export enum ProviderType {
  LEAD_SHERPA = 'leadsherpa',
  BATCH_DATA = 'batchdata',
  // Add more providers as needed
}

// Provider configuration mapping
export interface ProviderConfigMap {
  [ProviderType.LEAD_SHERPA]: {
    apiKey: string;
    baseUrl?: string;
  };
  [ProviderType.BATCH_DATA]: {
    apiKey: string;
    baseUrl?: string;
    apiSecret?: string;
  };
} 