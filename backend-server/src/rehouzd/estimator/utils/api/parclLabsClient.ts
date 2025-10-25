import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

export interface AddressSearchParams {
  address: string;
  city: string;
  state_abbreviation: string;
  zip_code: string;
}

export interface V2PropertySearchParams {
  geo_coordinates: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  property_filters: {
    property_types: string[];
    min_beds: number;
    max_beds: number;
    min_baths: number;
    max_baths: number;
    min_sqft: number;
    max_sqft: number;
    min_year_built?: number;
    max_year_built?: number;
  };
  event_filters: {
    event_names: string[];
    min_event_date: string;
    max_event_date: string;
  };
}

export interface V2PropertySearchByParclIdsParams {
  parcl_ids: number[];
  property_filters: {
    property_types: string[];
  };
  event_filters: {
    event_names: string[];
    min_event_date: string;
    max_event_date: string;
  };
}

class ParclLabsClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.PARCL_LABS_API_KEY || '';
    this.baseUrl = 'https://api.parcllabs.com';

    if (!this.apiKey) {
      logger.error('Parcl Labs API key is not set');
      throw new AppError('API configuration error', 500);
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Parcl Labs API request successful', {
          url: response.config.url,
          method: response.config.method?.toUpperCase(),
          status: response.status,
        });
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 404) {
          logger.warn('Parcl Labs API returned 404, treating as empty response', {
            url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
          });
          
          return {
            data: { items: [] },
            status: 200,
            statusText: 'OK',
            headers: error.response.headers,
            config: error.config,
          };
        }
        
        logger.error('Parcl Labs API request failed', {
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
   * Search for a property by address
   * 
   * @param addresses Array of address objects to search for
   * @returns API response with property information
   */
  async searchAddress(addresses: AddressSearchParams[]): Promise<AxiosResponse> {
    try {
      return await this.client.post('/v1/property/search_address', addresses);
    } catch (error: any) {
      // Handle 404 as empty result
      if (error.response && error.response.status === 404) {
        logger.warn('Address search returned 404, treating as empty data', { addresses });
        return {
          data: { items: [] },
          status: 200,
          statusText: 'OK',
          headers: error.response.headers,
          config: error.config,
        } as AxiosResponse;
      }
      
      // Handle 422 as validation error
      if (error.response && error.response.status === 422) {
        logger.error('Address search returned 422 - validation error', { 
          addresses,
          responseData: error.response.data 
        });
        throw new AppError(
          `Invalid address parameters: ${error.response.data?.message || error.message}`, 
          422
        );
      }
      
      logger.error('Error searching address', { 
        error: error.message, 
        status: error.response?.status,
        addresses 
      });
      throw new AppError(`Failed to search address: ${error.message}`, 502);
    }
  }

  /**
   * Search properties with their event history using v2 API
   * 
   * @param params Search parameters including geo coordinates, property filters, and event filters
   * @returns API response with properties and their event history
   */
  async searchPropertiesWithEvents(params: V2PropertySearchParams): Promise<AxiosResponse> {
    try {
      logger.debug('Searching properties with events using v2 API', { 
        radius: params.geo_coordinates.radius,
        lat: params.geo_coordinates.latitude,
        lon: params.geo_coordinates.longitude
      });

      return await this.client.post('/v2/property_search?limit=50000', params);
    } catch (error: any) {
      // Handle 404 as empty result
      if (error.response && error.response.status === 404) {
        logger.warn('V2 property search returned 404, treating as empty data', { 
          lat: params.geo_coordinates.latitude,
          lon: params.geo_coordinates.longitude
        });
        return {
          data: { data: [] },
          status: 200,
          statusText: 'OK',
          headers: error.response.headers,
          config: error.config,
        } as AxiosResponse;
      }
      
      // Handle 422 as validation error
      if (error.response && error.response.status === 422) {
        logger.error('V2 property search returned 422 - validation error', { 
          params,
          responseData: error.response.data 
        });
        throw new AppError(
          `Invalid search parameters: ${error.response.data?.message || error.message}`, 
          422
        );
      }
      
      logger.error('Error in v2 property search', { 
        error: error.message,
        status: error.response?.status,
        params
      });
      throw new AppError(`Failed to search properties with events: ${error.message}`, 502);
    }
  }

  /**
   * Search properties with their event history using v2 API by parcl_ids (zip codes)
   *
   * @param params Search parameters including parcl_ids and event filters
   * @returns API response with properties and their event history
   */
  async searchPropertiesWithEventsByParclIds(params: V2PropertySearchByParclIdsParams): Promise<AxiosResponse> {
    try {
      logger.debug('Searching properties with events using v2 API by parcl_ids', {
        parclIdsCount: params.parcl_ids.length,
        parclIds: params.parcl_ids,
        propertyTypes: ["SINGLE_FAMILY", "OTHER"],
        minEventDate: params.event_filters.min_event_date,
        maxEventDate: params.event_filters.max_event_date
      });

      const requestBody = {
        parcl_ids: params.parcl_ids,
        property_filters: {
          include_property_details: 1,
          property_types: ["SINGLE_FAMILY", "OTHER"]
        },
        event_filters: {
          event_names: params.event_filters.event_names,
          min_event_date: params.event_filters.min_event_date,
          max_event_date: params.event_filters.max_event_date
        },
      };

      const response = await this.client.post('/v2/property_search?limit=50000', requestBody);

      // Log pagination info for debugging
      logger.info('API Response pagination info', {
        totalAvailable: response.data?.metadata?.results?.total_available,
        returnedCount: response.data?.metadata?.results?.returned_count,
        hasNextPage: response.data?.metadata?.results?.cursor ? true : false,
        cursor: response.data?.metadata?.results?.cursor
      });

      return response;
    } catch (error: any) {
      // Handle 404 as empty result
      if (error.response && error.response.status === 404) {
        logger.warn('V2 property search by parcl_ids returned 404, treating as empty data', {
          parclIdsCount: params.parcl_ids.length,
          parclIds: params.parcl_ids.slice(0, 5)
        });
        return {
          data: { data: [] },
          status: 200,
          statusText: 'OK',
          headers: error.response.headers,
          config: error.config,
        } as AxiosResponse;
      }

      // Handle 422 as validation error
      if (error.response && error.response.status === 422) {
        logger.error('V2 property search by parcl_ids returned 422 - validation error', {
          params,
          responseData: error.response.data
        });
        throw new AppError(
          `Invalid search parameters: ${error.response.data?.message || error.message}`,
          422
        );
      }

      logger.error('Error in v2 property search by parcl_ids', {
        error: error.message,
        status: error.response?.status,
        parclIdsCount: params.parcl_ids.length,
        params
      });
      throw new AppError(`Failed to search properties with events by parcl_ids: ${error.message}`, 502);
    }
  }

  /**
   * Search property event history for multiple properties
   *
   * @param parclPropertyIds Array of parcl property IDs to search for
   * @returns API response with property event history
   */
  async searchPropertyEvents(parclPropertyIds: string[]): Promise<AxiosResponse> {
    try {
      logger.debug('Searching property events for multiple properties', {
        propertyCount: parclPropertyIds.length,
        propertyIds: parclPropertyIds
      });

      return await this.client.post(`/v1/property/event_history`, {
        parcl_property_id: parclPropertyIds
      });
    } catch (error: any) {
      // Handle 404 as empty result
      if (error.response && error.response.status === 404) {
        logger.warn('Property events search returned 404, treating as empty data', {
          propertyIds: parclPropertyIds
        });
        return {
          data: { items: [] },
          status: 200,
          statusText: 'OK',
          headers: error.response.headers,
          config: error.config,
        } as AxiosResponse;
      }

      // Handle 422 as validation error
      if (error.response && error.response.status === 422) {
        logger.error('Property events search returned 422 - validation error', {
          propertyIds: parclPropertyIds,
          responseData: error.response.data
        });
        throw new AppError(
          `Invalid property IDs: ${error.response.data?.message || error.message}`,
          422
        );
      }

      logger.error('Error searching property events', {
        error: error.message,
        status: error.response?.status,
        propertyIds: parclPropertyIds
      });
      throw new AppError(`Failed to search property events: ${error.message}`, 502);
    }
  }

  /**
   * Search for markets (zip codes, cities, etc.) by location type and state
   *
   * @param locationType Type of location to search for (ZIP5, CITY, etc.)
   * @param stateAbbreviation State abbreviation (TN, CA, etc.)
   * @param limit Maximum number of results to return
   * @returns API response with market information
   */
  async searchMarkets(
    locationType: string = 'ZIP5',
    stateAbbreviation: string,
    limit: number = 1000
  ): Promise<AxiosResponse> {
    try {
      logger.debug('Searching markets by location type and state', {
        locationType,
        stateAbbreviation,
        limit
      });

      const params = {
        location_type: locationType,
        state_abbreviation: stateAbbreviation,
        limit
      };

      return await this.client.get('/v1/search/markets', { params });
    } catch (error: any) {
      // Handle 404 as empty result
      if (error.response && error.response.status === 404) {
        logger.warn('Market search returned 404, treating as empty data', {
          locationType,
          stateAbbreviation,
          limit
        });
        return {
          data: { items: [] },
          status: 200,
          statusText: 'OK',
          headers: error.response.headers,
          config: error.config,
        } as AxiosResponse;
      }

      // Handle 422 as validation error
      if (error.response && error.response.status === 422) {
        logger.error('Market search returned 422 - validation error', {
          locationType,
          stateAbbreviation,
          limit,
          responseData: error.response.data
        });
        throw new AppError(
          `Invalid search parameters: ${error.response.data?.message || error.message}`,
          422
        );
      }

      logger.error('Error searching markets', {
        error: error.message,
        status: error.response?.status,
        locationType,
        stateAbbreviation,
        limit
      });
      throw new AppError(`Failed to search markets: ${error.message}`, 502);
    }
  }
}

export default new ParclLabsClient(); 