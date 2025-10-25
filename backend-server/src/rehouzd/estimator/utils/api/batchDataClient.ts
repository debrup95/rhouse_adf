import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

// BatchData API Interfaces - Updated to match actual API
export interface BatchDataPropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface BatchDataPropertyRequest {
  propertyAddress: BatchDataPropertyAddress;
}

export interface BatchDataSkipTraceRequest {
  requests: BatchDataPropertyRequest[];
}

export interface BatchDataPersonName {
  first: string;
  last: string;
}

export interface BatchDataPhoneNumber {
  number: string;
  carrier?: string;
  type?: string;
  tested?: boolean;
  reachable?: boolean;
  score?: number;
}

export interface BatchDataEmail {
  email: string;
}

export interface BatchDataMailingAddress {
  houseNumber?: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  zipPlus4?: string;
  formattedStreet?: string;
  streetNoUnit?: string;
  hash?: string;
}

export interface BatchDataPropertyAddress {
  houseNumber?: string;
  street: string;
  city: string;
  county?: string;
  state: string;
  zip: string;
  zipPlus4?: string;
  formattedStreet?: string;
  streetNoUnit?: string;
  hash?: string;
  latitude?: number;
  longitude?: number;
  countyFipsCode?: string;
  geoStatus?: string;
  cityAliases?: string[];
}

export interface BatchDataProperty {
  address: BatchDataPropertyAddress;
  equity?: number;
  equityPercent?: number;
  absenteeOwner?: boolean;
  vacant?: boolean;
  uspsDeliverable?: boolean;
  owner?: {
    name: BatchDataPersonName;
    mailingAddress?: BatchDataMailingAddress;
  };
}

export interface BatchDataPerson {
  _id: string;
  bankruptcy?: any;
  dnc?: any;
  emails?: BatchDataEmail[];
  mailingAddress?: BatchDataMailingAddress;
  name: BatchDataPersonName;
  phoneNumbers?: BatchDataPhoneNumber[];
  litigator?: boolean;
  propertyAddress: BatchDataPropertyAddress;
  involuntaryLien?: any;
  property?: BatchDataProperty;
  meta: {
    matched: boolean;
    error: boolean;
  };
}

export interface BatchDataMeta {
  apiVersion: string;
  performance: {
    totalRequestTime: number;
    startTime: string;
    endTime: string;
  };
  results: {
    requestCount: number;
    matchCount: number;
    noMatchCount: number;
    errorCount: number;
  };
  requestId: string;
}

export interface BatchDataResponse {
  status: {
    code: number;
    text: string;
    message?: string;
    data?: any[];
  };
  results: {
    persons: BatchDataPerson[];
    meta: BatchDataMeta;
  };
}

export interface BatchDataJobResponse {
  job_id: string;
  status: string;
}

export interface BatchDataJobStatus {
  status: string;
  progress?: number;
  error?: string;
}

class BatchDataClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BATCH_DATA_API_KEY || '';
    this.baseUrl = process.env.BATCH_DATA_BASE_URL || 'https://api.batchdata.com';

    if (!this.apiKey) {
      logger.warn('BatchData API key not configured', { provider: 'batchdata' });
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('BatchData API request', {
          provider: 'batchdata',
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL
        });
        return config;
      },
      (error) => {
        logger.error('BatchData API request error', { 
          provider: 'batchdata',
          error: error.message 
        });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('BatchData API request successful', {
          provider: 'batchdata',
          url: response.config.url,
          method: response.config.method?.toUpperCase(),
          status: response.status
        });
        return response;
      },
      (error) => {
        this.handleApiError(error, 'API request');
        return Promise.reject(error);
      }
    );

    logger.info('BatchData Client initialized', {
      provider: 'batchdata',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey
    });
  }

  async skipTraceDirect(request: BatchDataSkipTraceRequest): Promise<AxiosResponse<BatchDataResponse>> {
    try {
      logger.info('Direct BatchData skip trace', {
        provider: 'batchdata',
        propertyCount: request.requests.length
      });

      logger.debug('BatchData Direct API Request Details', {
        method: 'POST',
        url: '/api/v1/property/skip-trace',
        baseUrl: this.baseUrl,
        requestBody: JSON.stringify(request, null, 2)
      });

      const response = await this.client.post('/api/v1/property/skip-trace', request);

      logger.debug('BatchData Direct API Response', {
        provider: 'batchdata',
        status: response.status,
        personsCount: response.data.results?.persons?.length || 0,
        requestId: response.data.results?.meta?.requestId
      });

      return response;
    } catch (error: any) {
      this.handleApiError(error, 'direct skip trace');
      throw error;
    }
  }

  async createSkipTraceJob(request: BatchDataSkipTraceRequest): Promise<AxiosResponse<BatchDataJobResponse>> {
    try {
      logger.info('Creating BatchData skip trace job', {
        provider: 'batchdata',
        propertyCount: request.requests.length
      });

      logger.debug('BatchData API Request Details', {
        method: 'POST',
        url: '/api/v1/skip-trace/async',
        baseUrl: this.baseUrl,
        fullUrl: `${this.baseUrl}/api/v1/skip-trace/async`,
        headers: {
          'Authorization': this.apiKey ? `Bearer ${this.apiKey.slice(0, 6)}...${this.apiKey.slice(-4)}` : 'NOT_SET',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        requestBody: JSON.stringify(request, null, 2)
      });

      const response = await this.client.post('/api/v1/skip-trace/async', request);

      logger.info('BatchData job created successfully', {
        provider: 'batchdata',
        jobId: response.data.job_id,
        status: response.data.status
      });

      return response;
    } catch (error: any) {
      this.handleApiError(error, 'create skip trace job');
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<AxiosResponse<BatchDataJobStatus>> {
    try {
      logger.debug('Checking BatchData job status', {
        provider: 'batchdata',
        jobId
      });

      const response = await this.client.get(`/api/v1/skip-trace/jobs/${jobId}`);

      logger.debug('BatchData job status retrieved', {
        provider: 'batchdata',
        jobId,
        status: response.data.status
      });

      return response;
    } catch (error: any) {
      this.handleApiError(error, 'get job status');
      throw error;
    }
  }

  async getJobResults(jobId: string): Promise<AxiosResponse<BatchDataResponse>> {
    try {
      logger.debug('Fetching BatchData job results', {
        provider: 'batchdata',
        jobId
      });

      const response = await this.client.get(`/api/v1/skip-trace/jobs/${jobId}/results`);

      logger.debug('BatchData job results retrieved', {
        provider: 'batchdata',
        jobId,
        personsCount: response.data.results?.persons?.length || 0
      });

      return response;
    } catch (error: any) {
      this.handleApiError(error, 'get job results');
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing BatchData connection', { provider: 'batchdata' });

      // Use a simple test request with minimal data
      const testRequest: BatchDataSkipTraceRequest = {
        requests: [{
          propertyAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'CA',
            zip: '90210'
          }
        }]
      };

      await this.client.post('/api/v1/property/skip-trace', testRequest);
      
      logger.info('BatchData connection test successful', { provider: 'batchdata' });
      return true;
    } catch (error: any) {
      logger.error('BatchData connection test failed', {
        provider: 'batchdata',
        error: error.message,
        status: error.response?.status
      });
      return false;
    }
  }

  parseAddress(fullAddress: string): BatchDataPropertyRequest | null {
    try {
      // Simple address parsing - can be enhanced later
      const parts = fullAddress.split(',').map(part => part.trim());
      
      if (parts.length < 3) {
        logger.warn('Address parsing failed - insufficient parts', {
          provider: 'batchdata',
          address: fullAddress,
          parts: parts.length
        });
        return null;
      }

      const street = parts[0];
      const city = parts[1];
      const stateZip = parts[2].split(' ');
      const state = stateZip[0];
      const zip = stateZip[1] || '';

      return {
        propertyAddress: {
          street,
          city,
          state,
          zip
        }
      };
    } catch (error: any) {
      logger.error('Error parsing address', {
        provider: 'batchdata',
        address: fullAddress,
        error: error.message
      });
      return null;
    }
  }

  private handleApiError(error: any, operation: string): void {
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const responseData = error.response?.data;

    if (status === 400) {
      logger.error(`BatchData returned 400 - validation error during ${operation}`, {
        responseData,
        provider: 'batchdata'
      });
      throw new AppError(`Invalid BatchData request parameters: ${error.message}`, 400);
    } else if (status === 401) {
      logger.error(`BatchData authentication failed during ${operation}`, {
        responseData,
        provider: 'batchdata'
      });
      throw new AppError('BatchData authentication failed - check API key', 401);
    } else if (status === 404) {
      logger.error(`BatchData endpoint not found during ${operation}`, {
        url: error.config?.url,
        responseData,
        provider: 'batchdata'
      });
      throw new AppError('BatchData API endpoint not found', 404);
    } else if (status === 429) {
      logger.error(`BatchData rate limit exceeded during ${operation}`, {
        responseData,
        provider: 'batchdata'
      });
      throw new AppError('BatchData rate limit exceeded', 429);
    } else if (status >= 500) {
      logger.error(`BatchData server error during ${operation}`, {
        status,
        statusText,
        responseData,
        provider: 'batchdata'
      });
      throw new AppError('BatchData server error', status || 500);
    } else {
      logger.error(`BatchData API request failed during ${operation}`, {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status,
        statusText,
        responseData,
        provider: 'batchdata'
      });
      throw new AppError(`BatchData API error: ${error.message}`, status || 500);
    }
  }
}

export default new BatchDataClient(); 