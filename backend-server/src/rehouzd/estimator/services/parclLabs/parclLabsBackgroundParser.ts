import logger from '../../utils/logger';
import { query } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';

export interface RawResponseRecord {
  id: number;
  request_hash: string;
  api_endpoint: string;
  request_params: any;
  raw_response: any;
  response_status: number;
  search_session_id: string;
  user_id?: number;
  target_property_id?: string;
}

export interface ParclProperty {
  parcl_property_id: string;
  raw_response_id: number;
  search_session_id: string;
  address: string;
  city: string;
  state_abbreviation: string;
  county?: string;
  zip_code: string;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  year_built: number;
  property_type: string;
  latitude: number;
  longitude: number;
  // Additional Parcl Labs metadata
  unit?: string;
  cbsa?: string;
  event_count?: number;
  current_on_market_flag?: boolean;
  event_history_sale_flag?: boolean;
  event_history_rental_flag?: boolean;
  event_history_listing_flag?: boolean;
  current_investor_owned_flag?: boolean;
  current_owner_occupied_flag?: boolean;
  current_new_construction_flag?: boolean;
  current_on_market_rental_flag?: boolean;
}

export interface PropertyEvent {
  parcl_property_id: string;
  raw_response_id: number;
  search_session_id: string;
  event_type: string;
  event_name: string;
  event_date: string;
  price?: number;
  entity_owner_name?: string;
  true_sale_index?: boolean;
  investor_flag?: boolean;
  owner_occupied_flag?: boolean;
  // Additional Parcl Labs event metadata
  transfer_index?: number;
  current_owner_flag?: boolean;
  new_construction_flag?: boolean;
  record_updated_date?: string;
}

/**
 * Background parser service for Parcl Labs API responses
 * Processes raw responses asynchronously without blocking main API calls
 */
class ParclLabsBackgroundParser {

  /**
   * Main entry point for background processing
   */
  async parseAndStore(rawResponseId: number, sessionId: string): Promise<void> {
    try {
      logger.info('Starting background parsing for Parcl Labs response', { rawResponseId, sessionId });

      // Mark as processing
      await this.updateProcessingStatus(rawResponseId, 'processing');

      // Get raw response
      const rawResponse = await this.getRawResponse(rawResponseId);
      if (!rawResponse) {
        throw new Error(`Raw response ${rawResponseId} not found`);
      }

      // Parse based on endpoint type
      switch (rawResponse.api_endpoint) {
        case 'search_address':
          await this.parseAddressResponse(rawResponse);
          break;
        case 'search_properties_with_events':
          await this.parsePropertiesWithEvents(rawResponse);
          break;
        case 'search_property_events':
          await this.parsePropertyEvents(rawResponse);
          break;
        default:
          logger.warn('Unknown API endpoint for parsing', { endpoint: rawResponse.api_endpoint });
      }

      // Mark as completed
      await this.updateProcessingStatus(rawResponseId, 'completed');
      logger.info('Completed background parsing', { rawResponseId, sessionId });

    } catch (error: any) {
      logger.error('Failed to parse Parcl Labs response', {
        rawResponseId,
        sessionId,
        error: error.message
      });

      // Mark as failed
      await this.updateProcessingStatus(rawResponseId, 'failed');

      // Don't throw - this is background processing
    }
  }

  /**
   * Parse address search response
   */
  private async parseAddressResponse(rawResponse: RawResponseRecord): Promise<void> {
    const { data } = rawResponse.raw_response;

    if (!data?.items?.length) {
      logger.debug('No properties found in address response', { rawResponseId: rawResponse.id });
      return;
    }

    for (const propertyData of data.items) {
      const property: ParclProperty = {
        parcl_property_id: propertyData.parcl_property_id,
        raw_response_id: rawResponse.id,
        search_session_id: rawResponse.search_session_id,
        address: propertyData.address || '',
        city: propertyData.city || '',
        state_abbreviation: propertyData.state_abbreviation || '',
        county: propertyData.county || '',
        zip_code: propertyData.zip_code || '',
        bedrooms: parseFloat(propertyData.bedrooms) || 0,
        bathrooms: parseFloat(propertyData.bathrooms) || 0,
        square_footage: parseFloat(propertyData.square_footage) || 0,
        year_built: parseInt(propertyData.year_built) || 0,
        property_type: propertyData.property_type || 'UNKNOWN',
        latitude: parseFloat(propertyData.latitude) || 0,
        longitude: parseFloat(propertyData.longitude) || 0,
        unit: propertyData.unit,
        cbsa: propertyData.cbsa,
        event_count: propertyData.event_count,
        current_on_market_flag: this.convertToBoolean(propertyData.current_on_market_flag),
        event_history_sale_flag: this.convertToBoolean(propertyData.event_history_sale_flag),
        event_history_rental_flag: this.convertToBoolean(propertyData.event_history_rental_flag),
        event_history_listing_flag: this.convertToBoolean(propertyData.event_history_listing_flag),
        current_investor_owned_flag: this.convertToBoolean(propertyData.current_investor_owned_flag),
        current_owner_occupied_flag: this.convertToBoolean(propertyData.current_owner_occupied_flag),
        current_new_construction_flag: this.convertToBoolean(propertyData.current_new_construction_flag),
        current_on_market_rental_flag: this.convertToBoolean(propertyData.current_on_market_rental_flag)
      };

      await this.saveProperty(property);
    }
  }

  /**
   * Parse properties with events response (v2 API)
   */
  private async parsePropertiesWithEvents(rawResponse: RawResponseRecord): Promise<void> {
    const { data } = rawResponse.raw_response;

    if (!data?.length) {
      logger.debug('No properties found in v2 response', { rawResponseId: rawResponse.id });
      return;
    }

    for (const item of data) {
      // Save property
      const property: ParclProperty = {
        parcl_property_id: item.parcl_property_id,
        raw_response_id: rawResponse.id,
        search_session_id: rawResponse.search_session_id,
        address: item.property_metadata?.address1 || '',
        city: item.property_metadata?.city || '',
        state_abbreviation: item.property_metadata?.state || '',
        county: item.property_metadata?.county || '',
        zip_code: item.property_metadata?.zip5 || '',
        bedrooms: parseFloat(item.property_metadata?.bedrooms) || 0,
        bathrooms: parseFloat(item.property_metadata?.bathrooms) || 0,
        square_footage: parseFloat(item.property_metadata?.sq_ft) || 0,
        year_built: parseInt(item.property_metadata?.year_built) || 0,
        property_type: item.property_metadata?.property_type || 'UNKNOWN',
        latitude: parseFloat(item.property_metadata?.latitude) || 0,
        longitude: parseFloat(item.property_metadata?.longitude) || 0,
        // V2 API doesn't have these additional fields, so they'll be undefined
        unit: undefined,
        cbsa: undefined,
        event_count: undefined,
        current_on_market_flag: undefined,
        event_history_sale_flag: undefined,
        event_history_rental_flag: undefined,
        event_history_listing_flag: undefined,
        current_investor_owned_flag: undefined,
        current_owner_occupied_flag: undefined,
        current_new_construction_flag: undefined,
        current_on_market_rental_flag: undefined
      };

      await this.saveProperty(property);

      // Save events
      if (item.events?.length) {
        for (const event of item.events) {
          const propertyEvent: PropertyEvent = {
            parcl_property_id: item.parcl_property_id,
            raw_response_id: rawResponse.id,
            search_session_id: rawResponse.search_session_id,
            event_type: event.event_type,
            event_name: event.event_name,
            event_date: event.event_date,
            price: event.price ? parseFloat(event.price) : undefined,
            entity_owner_name: event.entity_owner_name,
            true_sale_index: this.convertToBoolean(event.true_sale_index),
            investor_flag: this.convertToBoolean(event.investor_flag),
            owner_occupied_flag: this.convertToBoolean(event.owner_occupied_flag),
            // Additional fields from the API response
            transfer_index: event.transfer_index,
            current_owner_flag: this.convertToBoolean(event.current_owner_flag),
            new_construction_flag: this.convertToBoolean(event.new_construction_flag),
            record_updated_date: event.record_updated_date
          };

          await this.savePropertyEvent(propertyEvent);
        }
      }
    }
  }

  /**
   * Parse property events response
   */
  private async parsePropertyEvents(rawResponse: RawResponseRecord): Promise<void> {
    const { data } = rawResponse.raw_response;

    if (!data?.items?.length) {
      logger.debug('No events found in property events response', { rawResponseId: rawResponse.id });
      return;
    }

    for (const item of data.items) {
      const propertyEvent: PropertyEvent = {
        parcl_property_id: item.parcl_property_id,
        raw_response_id: rawResponse.id,
        search_session_id: rawResponse.search_session_id,
        event_type: item.event_type,
        event_name: item.event_name,
        event_date: item.event_date,
        price: item.price ? parseFloat(item.price) : undefined,
        entity_owner_name: item.entity_owner_name,
        true_sale_index: item.true_sale_index,
        investor_flag: item.investor_flag,
        owner_occupied_flag: item.owner_occupied_flag,
        // Additional fields from the API response
        transfer_index: item.transfer_index,
        current_owner_flag: item.current_owner_flag,
        new_construction_flag: item.new_construction_flag,
        record_updated_date: item.record_updated_date
      };

      await this.savePropertyEvent(propertyEvent);
    }
  }

  /**
   * Save property to database
   */
  private async saveProperty(property: ParclProperty): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO public.parcl_labs_properties (
          parcl_property_id, raw_response_id, search_session_id,
          address, city, state_abbreviation, county, zip_code,
          bedrooms, bathrooms, square_footage, year_built,
          property_type, latitude, longitude,
          unit, cbsa, event_count,
          current_on_market_flag, event_history_sale_flag, event_history_rental_flag,
          event_history_listing_flag, current_investor_owned_flag, current_owner_occupied_flag,
          current_new_construction_flag, current_on_market_rental_flag
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        ON CONFLICT (parcl_property_id)
        DO UPDATE SET
          last_updated_at = NOW(),
          search_session_id = EXCLUDED.search_session_id
      `;

      const values = [
        property.parcl_property_id,
        property.raw_response_id,
        property.search_session_id,
        property.address,
        property.city,
        property.state_abbreviation,
        property.county,
        property.zip_code,
        property.bedrooms,
        property.bathrooms,
        property.square_footage,
        property.year_built,
        property.property_type,
        property.latitude,
        property.longitude,
        property.unit,
        property.cbsa,
        property.event_count,
        property.current_on_market_flag,
        property.event_history_sale_flag,
        property.event_history_rental_flag,
        property.event_history_listing_flag,
        property.current_investor_owned_flag,
        property.current_owner_occupied_flag,
        property.current_new_construction_flag,
        property.current_on_market_rental_flag
      ];

      await query(insertQuery, values);

    } catch (error: any) {
      logger.error('Failed to save property', {
        parclPropertyId: property.parcl_property_id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Save property event to database
   */
  private async savePropertyEvent(event: PropertyEvent): Promise<void> {
    try {
      const insertQuery = `
        INSERT INTO public.parcl_labs_property_events (
          parcl_property_id, raw_response_id, search_session_id,
          event_type, event_name, event_date, price,
          entity_owner_name, true_sale_index, investor_flag, owner_occupied_flag,
          transfer_index, current_owner_flag, new_construction_flag, record_updated_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
      `;

      const values = [
        event.parcl_property_id,
        event.raw_response_id,
        event.search_session_id,
        event.event_type,
        event.event_name,
        event.event_date,
        event.price,
        event.entity_owner_name,
        event.true_sale_index,
        event.investor_flag,
        event.owner_occupied_flag,
        event.transfer_index,
        event.current_owner_flag,
        event.new_construction_flag,
        event.record_updated_date
      ];

      await query(insertQuery, values);

    } catch (error: any) {
      // Handle duplicate events gracefully (same property, same event date/type)
      if (error.code === '23505') { // unique constraint violation
        logger.debug('Duplicate event detected, skipping', {
          parclPropertyId: event.parcl_property_id,
          eventDate: event.event_date,
          eventType: event.event_type
        });
      } else {
        logger.error('Failed to save property event', {
          parclPropertyId: event.parcl_property_id,
          error: error.message
        });
        throw error;
      }
    }
  }

  /**
   * Get raw response by ID
   */
  private async getRawResponse(id: number): Promise<RawResponseRecord | null> {
    try {
      const queryText = `
        SELECT id, request_hash, api_endpoint, request_params,
               raw_response, response_status, search_session_id,
               user_id, target_property_id
        FROM public.parcl_labs_raw_responses
        WHERE id = $1
      `;

      const result = await query(queryText, [id]);
      return result.rows[0] || null;

    } catch (error: any) {
      logger.error('Failed to get raw response', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Convert various value types to boolean
   * Handles numeric (0,1,2), string ("0","1","2"), and boolean values
   */
  private convertToBoolean(value: any): boolean | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    // Handle boolean values directly
    if (typeof value === 'boolean') {
      return value;
    }

    // Handle numeric values (0 = false, anything else = true)
    if (typeof value === 'number') {
      return value !== 0;
    }

    // Handle string values
    if (typeof value === 'string') {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        return numValue !== 0;
      }
      // Handle string booleans
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true') return true;
      if (lowerValue === 'false') return false;
    }

    // Default to false for unknown values
    return false;
  }

  /**
   * Update processing status
   */
  private async updateProcessingStatus(rawResponseId: number, status: string): Promise<void> {
    try {
      const updateQuery = `
        UPDATE public.parcl_labs_raw_responses
        SET processing_status = $1::VARCHAR(20),
            processed_at = CASE WHEN $1::VARCHAR(20) = 'completed' THEN NOW() ELSE processed_at END
        WHERE id = $2
      `;

      await query(updateQuery, [status, rawResponseId]);

    } catch (error: any) {
      logger.error('Failed to update processing status', {
        rawResponseId,
        status,
        error: error.message
      });
      throw error;
    }
  }
}

export default new ParclLabsBackgroundParser();
