import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

// Lead Sherpa API interfaces
export interface PropertyLookupRequest {
  property_address_lookup: {
    apn?: string | null;
    street?: string | null;
    street2?: string | null;
    city?: string | null;
    state?: string | null;
    zipcode?: string | null;
  };
  owner_entity_lookup?: any | null;
}

export interface LeadSherpaRequest {
  property_lookups: PropertyLookupRequest[];
}

export interface PersonName {
  title: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
}

export interface PhoneNumber {
  e164_format: string;
  local_format: string;
  country_code: string;
  country_calling_code: number;
  type: string;
  carrier: string;
  last_seen: string;
  dnc_statuses: Array<{
    is_dnc: boolean;
    is_litigator: boolean;
    date_status: string;
    is_registered: boolean;
    iso3166_geocode: string;
  }>;
}

export interface EmailAddress {
  email_address: string;
}

export interface PropertyOwner {
  object_id: string;
  person_name: PersonName;
  age: number;
  deceased: boolean;
  date_of_birth_month_year: string;
  relation_type: string | null;
  name: string;
  addresses: any[];
  emails: EmailAddress[];
  phone_numbers: PhoneNumber[];
}

export interface PropertyResult {
  status_code: number;
  issues: any[];
  property: {
    object_id: string;
    apn: string;
    address: {
      delivery_line1: string;
      delivery_line2: string | null;
      last_line: string;
      us_address: {
        street: string;
        city: string;
        state: string;
        zipcode: string;
      };
    };
    owners: Array<{
      person?: PropertyOwner;  // Individual person owner
      business?: {             // Business entity owner
        name: string;
        addresses: any[];
        emails: EmailAddress[];
        phone_numbers: PhoneNumber[];
        associated_persons?: Array<{
          role: string;
          person: PropertyOwner;
        }>;
      };
    }>;
  };
  source: number;
  lookup: PropertyLookupRequest;
}

export interface LeadSherpaResponse {
  property_results: PropertyResult[];
}

class LeadSherpaClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.LEAD_SHERPA_API_KEY || '';
    this.baseUrl = 'https://skipsherpa.com';

    // Debug: Log API key status (partially masked for security)
    const apiKeyMask = this.apiKey ? `${this.apiKey.slice(0, 6)}...${this.apiKey.slice(-4)}` : 'NOT_SET';
    logger.info('Lead Sherpa Client initialized', {
      baseUrl: this.baseUrl,
      apiKeyStatus: this.apiKey ? 'SET' : 'NOT_SET',
      apiKeyMask: apiKeyMask,
      apiKeyLength: this.apiKey.length
    });

    if (!this.apiKey) {
      logger.error('Lead Sherpa API key is not set');
      throw new AppError('Skip tracing API configuration error', 500);
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'API-Key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Lead Sherpa API request successful', {
          url: response.config.url,
          method: response.config.method?.toUpperCase(),
          status: response.status,
        });
        return response;
      },
      (error) => {
        logger.error('Lead Sherpa API request failed', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          responseData: error.response?.data,
          requestData: error.config?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Lookup property owners using Lead Sherpa API
   * 
   * @param properties Array of property addresses to lookup
   * @returns API response with property owner information
   */
  async lookupPropertyOwners(properties: PropertyLookupRequest[]): Promise<AxiosResponse<LeadSherpaResponse>> {
    try {
      const request: LeadSherpaRequest = {
        property_lookups: properties
      };

      logger.info('Looking up property owners via Lead Sherpa', { 
        propertyCount: properties.length,
        properties: properties.map(p => p.property_address_lookup.street)
      });

      // Debug: Log the full request
      logger.debug('Lead Sherpa API Request Details', {
        method: 'PUT',
        url: '/api/beta6/properties',
        baseUrl: this.baseUrl,
        fullUrl: `${this.baseUrl}/api/beta6/properties`,
        headers: {
          'API-Key': this.apiKey ? `${this.apiKey.slice(0, 6)}...${this.apiKey.slice(-4)}` : 'NOT_SET',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        requestBody: JSON.stringify(request, null, 2)
      });

      const response = await this.client.put('/api/beta6/properties', request);

      // Debug: Log the response
      logger.debug('Lead Sherpa API Response Details', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        responseBody: JSON.stringify(response.data, null, 2)
      });

      return response;
    } catch (error: any) {
      // Handle 400 as validation error
      if (error.response && error.response.status === 400) {
        logger.error('Lead Sherpa returned 400 - validation error', { 
          properties,
          responseData: error.response.data 
        });
        throw new AppError(
          `Invalid property lookup parameters: ${error.response.data?.message || error.message}`, 
          400
        );
      }
      
      // Handle 401/403 as authentication error
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        logger.error('Lead Sherpa authentication failed', { 
          status: error.response.status,
          responseData: error.response.data 
        });
        throw new AppError('Skip tracing service authentication failed', 401);
      }

      // Handle 429 as rate limit error
      if (error.response && error.response.status === 429) {
        logger.error('Lead Sherpa rate limit exceeded', { 
          responseData: error.response.data 
        });
        throw new AppError('Skip tracing service rate limit exceeded', 429);
      }
      
      logger.error('Error looking up property owners', { 
        error: error.message, 
        status: error.response?.status,
        properties 
      });
      throw new AppError(`Failed to lookup property owners: ${error.message}`, 502);
    }
  }

  /**
   * Parse property address into Lead Sherpa format
   * Returns null if address is incomplete (missing required city/state or zipcode)
   */
  parseAddress(address: string): PropertyLookupRequest | null {
    if (!address || address.trim().length === 0) {
      return null;
    }

    // Enhanced address parsing to handle different formats
    const parts = address.split(',').map(p => p.trim());
    
    let street = '';
    let city = '';
    let state = '';
    let zipcode = '';

    if (parts.length >= 1) {
      street = parts[0];
    }
    if (parts.length >= 2) {
      city = parts[1];
    }
    if (parts.length >= 3) {
      const stateZip = parts[2].split(' ').filter(p => p.length > 0);
      if (stateZip.length >= 1) {
        state = stateZip[0];
      }
      if (stateZip.length >= 2) {
        zipcode = stateZip[1];
      }
    }

    // Try to extract state and zip from the end of the address if no commas
    if (parts.length === 1 && street) {
      // Look for pattern like "123 Main St Memphis TN 38111" or "123 Main St 38111"
      const addressParts = street.split(' ');
      const possibleZip = addressParts[addressParts.length - 1];
      const possibleState = addressParts[addressParts.length - 2];
      
      // Check if last part looks like a zip code (5 digits)
      if (/^\d{5}(-\d{4})?$/.test(possibleZip)) {
        zipcode = possibleZip;
        street = addressParts.slice(0, -1).join(' ');
        
        // Check if second to last looks like a state (2 letters)
        if (possibleState && /^[A-Z]{2}$/i.test(possibleState)) {
          state = possibleState.toUpperCase();
          street = addressParts.slice(0, -2).join(' ');
          
          // Remaining parts might be city
          const remainingParts = addressParts.slice(0, -2);
          if (remainingParts.length > 2) {
            // Take parts that aren't clearly street number/name as city
            const streetPattern = /^\d+[A-Z]?\s/i;
            if (streetPattern.test(street)) {
              const streetWords = street.split(' ');
              if (streetWords.length > 2) {
                street = streetWords.slice(0, 2).join(' ');
                city = streetWords.slice(2).join(' ');
              }
            }
          }
        }
      }
    }

    // Lead Sherpa validation: Either (city AND state) OR zipcode must be provided
    const hasLocationInfo = (city && state) || zipcode;
    
    if (!hasLocationInfo) {
      logger.debug('Skipping incomplete address - missing city/state or zipcode', {
        originalAddress: address,
        parsedStreet: street,
        parsedCity: city,
        parsedState: state,
        parsedZipcode: zipcode
      });
      return null;
    }

    logger.debug('Successfully parsed address', {
      originalAddress: address,
      parsedStreet: street,
      parsedCity: city,
      parsedState: state,
      parsedZipcode: zipcode
    });

    return {
      property_address_lookup: {
        apn: null,
        street: street || null,
        street2: null,
        city: city || null,
        state: state || null,
        zipcode: zipcode || null,
      },
      owner_entity_lookup: null
    };
  }
}

export default new LeadSherpaClient(); 