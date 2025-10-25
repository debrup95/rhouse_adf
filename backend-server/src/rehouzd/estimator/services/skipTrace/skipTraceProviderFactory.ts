import logger from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import {
  SkipTraceProvider,
  SkipTraceProviderFactory,
  ProviderConfig,
  ProviderType,
} from '../../interfaces/skipTraceProviders';
import { LeadSherpaProvider } from './providers/leadSherpaProvider';
import { BatchDataProvider } from './providers/batchDataProvider';

// Provider configuration interface
export interface ProviderConfigurations {
  [ProviderType.LEAD_SHERPA]: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    enabled?: boolean;
  };
  [ProviderType.BATCH_DATA]: {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    enabled?: boolean;
  };
}

// Main configuration for skip tracing
export interface SkipTraceConfig {
  primaryProvider: ProviderType;
  fallbackProvider?: ProviderType;
  enableFallback: boolean;
  providers: ProviderConfigurations;
  globalOptions: {
    maxRetries: number;
    retryDelayMs: number;
    defaultTimeout: number;
    enableCaching: boolean;
    cacheExpiryDays: number;
  };
}

export class SkipTraceProviderFactoryImpl implements SkipTraceProviderFactory {
  private config: SkipTraceConfig;
  private providerInstances: Map<string, SkipTraceProvider> = new Map();

  constructor(config: SkipTraceConfig) {
    this.config = config;
    this.validateConfiguration();
  }

  createProvider(providerName: string, customConfig?: ProviderConfig): SkipTraceProvider {
    const providerType = providerName as ProviderType;

    // Check if provider instance already exists (singleton pattern)
    if (this.providerInstances.has(providerName) && !customConfig) {
      return this.providerInstances.get(providerName)!;
    }

    let provider: SkipTraceProvider;

    try {
      switch (providerType) {
        case ProviderType.LEAD_SHERPA:
          provider = this.createLeadSherpaProvider(customConfig);
          break;
        case ProviderType.BATCH_DATA:
          provider = this.createBatchDataProvider(customConfig);
          break;
        default:
          throw new Error(`Unsupported provider: ${providerName}`);
      }

      // Test provider configuration
      if (!provider.validateConfig()) {
        throw new Error(`Invalid configuration for provider: ${providerName}`);
      }

      // Store in cache for reuse
      if (!customConfig) {
        this.providerInstances.set(providerName, provider);
      }

      logger.info('Skip trace provider created successfully', {
        provider: providerName,
        capabilities: provider.getCapabilities(),
      });

      return provider;

    } catch (error: any) {
      logger.error('Failed to create skip trace provider', {
        provider: providerName,
        error: error.message,
      });
      throw new AppError(`Failed to create provider ${providerName}: ${error.message}`, 500);
    }
  }

  getPrimaryProvider(): SkipTraceProvider {
    return this.createProvider(this.config.primaryProvider);
  }

  getFallbackProvider(): SkipTraceProvider | null {
    if (!this.config.enableFallback || !this.config.fallbackProvider) {
      return null;
    }
    return this.createProvider(this.config.fallbackProvider);
  }

  getAvailableProviders(): string[] {
    return Object.keys(this.config.providers).filter(provider => 
      this.config.providers[provider as ProviderType]?.enabled !== false
    );
  }

  async testAllProviders(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const providerName of this.getAvailableProviders()) {
      try {
        const provider = this.createProvider(providerName);
        results[providerName] = await provider.testConnection();
      } catch (error) {
        logger.error('Provider test failed', { provider: providerName, error });
        results[providerName] = false;
      }
    }

    return results;
  }

  updateConfiguration(newConfig: Partial<SkipTraceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Clear cached instances when configuration changes
    this.providerInstances.clear();
    
    // Validate new configuration
    this.validateConfiguration();
    
    logger.info('Skip trace configuration updated', {
      primaryProvider: this.config.primaryProvider,
      fallbackProvider: this.config.fallbackProvider,
      enableFallback: this.config.enableFallback,
    });
  }

  getConfiguration(): SkipTraceConfig {
    return { ...this.config };
  }

  private createLeadSherpaProvider(customConfig?: ProviderConfig): LeadSherpaProvider {
    const config = customConfig || this.buildProviderConfig(ProviderType.LEAD_SHERPA);
    return new LeadSherpaProvider(config);
  }

  private createBatchDataProvider(customConfig?: ProviderConfig): BatchDataProvider {
    const config = customConfig || this.buildProviderConfig(ProviderType.BATCH_DATA);
    const batchDataConfig = this.config.providers[ProviderType.BATCH_DATA];
    
    return new BatchDataProvider({
      ...config,
    });
  }

  private buildProviderConfig(providerType: ProviderType): ProviderConfig {
    const providerConfig = this.config.providers[providerType];
    
    if (!providerConfig) {
      throw new Error(`No configuration found for provider: ${providerType}`);
    }

    if (!providerConfig.apiKey) {
      throw new Error(`API key missing for provider: ${providerType}`);
    }

    let baseUrl: string;
    let defaultTimeout: number;
    let isAsync = false;
    let supportsBatch = false;
    let maxBatchSize = 1;

    switch (providerType) {
      case ProviderType.LEAD_SHERPA:
        baseUrl = providerConfig.baseUrl || 'https://skipsherpa.com';
        defaultTimeout = 30000;
        isAsync = false;
        supportsBatch = true;
        maxBatchSize = 100;
        break;
      case ProviderType.BATCH_DATA:
        baseUrl = providerConfig.baseUrl || 'https://api.batchdata.com';
        defaultTimeout = 60000; // Longer for async operations
        isAsync = true;
        supportsBatch = true;
        maxBatchSize = 1000;
        break;
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }

    return {
      name: providerType,
      apiKey: providerConfig.apiKey,
      baseUrl,
      timeout: providerConfig.timeout || defaultTimeout,
      retries: this.config.globalOptions.maxRetries,
      isAsync,
      supportsBatch,
      maxBatchSize,
    };
  }

  private validateConfiguration(): void {
    if (!this.config.primaryProvider) {
      throw new Error('Primary provider must be specified');
    }

    if (!this.config.providers[this.config.primaryProvider]) {
      throw new Error(`Configuration missing for primary provider: ${this.config.primaryProvider}`);
    }

    if (this.config.enableFallback && this.config.fallbackProvider) {
      if (!this.config.providers[this.config.fallbackProvider]) {
        throw new Error(`Configuration missing for fallback provider: ${this.config.fallbackProvider}`);
      }
      
      if (this.config.primaryProvider === this.config.fallbackProvider) {
        throw new Error('Primary and fallback providers cannot be the same');
      }
    }

    // Validate each provider configuration
    for (const [providerType, providerConfig] of Object.entries(this.config.providers)) {
      if (providerConfig.enabled !== false) {
        if (!providerConfig.apiKey) {
          throw new Error(`API key missing for provider: ${providerType}`);
        }
      }
    }

    logger.info('Skip trace configuration validated successfully', {
      primaryProvider: this.config.primaryProvider,
      fallbackProvider: this.config.fallbackProvider,
      availableProviders: this.getAvailableProviders(),
    });
  }
}

// Factory function to create configuration from environment variables
export function createSkipTraceConfigFromEnv(): SkipTraceConfig {
  const primaryProvider = (process.env.SKIP_TRACE_PRIMARY_PROVIDER || 'batchdata') as ProviderType;
  const fallbackProvider = process.env.SKIP_TRACE_FALLBACK_PROVIDER as ProviderType;
  const enableFallback = process.env.SKIP_TRACE_ENABLE_FALLBACK === 'true';

  return {
    primaryProvider,
    fallbackProvider,
    enableFallback,
    providers: {
      [ProviderType.LEAD_SHERPA]: {
        apiKey: process.env.LEAD_SHERPA_API_KEY || '',
        baseUrl: process.env.LEAD_SHERPA_BASE_URL,
        timeout: parseInt(process.env.LEAD_SHERPA_TIMEOUT || '30000'),
        enabled: process.env.LEAD_SHERPA_ENABLED !== 'false',
      },
          [ProviderType.BATCH_DATA]: {
      apiKey: process.env.BATCH_DATA_API_KEY || '',
      baseUrl: process.env.BATCH_DATA_BASE_URL || 'https://api.batchdata.com',
      timeout: parseInt(process.env.BATCH_DATA_TIMEOUT || '60000'),
      enabled: process.env.BATCH_DATA_ENABLED !== 'false',
    },
    },
    globalOptions: {
      maxRetries: parseInt(process.env.SKIP_TRACE_MAX_RETRIES || '3'),
      retryDelayMs: parseInt(process.env.SKIP_TRACE_RETRY_DELAY || '1000'),
      defaultTimeout: parseInt(process.env.SKIP_TRACE_DEFAULT_TIMEOUT || '30000'),
      enableCaching: process.env.SKIP_TRACE_ENABLE_CACHING !== 'false',
      cacheExpiryDays: parseInt(process.env.SKIP_TRACE_CACHE_EXPIRY_DAYS || '90'),
    },
  };
}

// Singleton factory instance
let factoryInstance: SkipTraceProviderFactoryImpl | null = null;

export function getSkipTraceProviderFactory(): SkipTraceProviderFactoryImpl {
  if (!factoryInstance) {
    const config = createSkipTraceConfigFromEnv();
    factoryInstance = new SkipTraceProviderFactoryImpl(config);
  }
  return factoryInstance;
}

// Reset factory (useful for testing)
export function resetSkipTraceProviderFactory(): void {
  factoryInstance = null;
} 