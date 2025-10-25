import { query } from '../config/db';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface RawResponseData {
  request_hash: string;
  api_endpoint: string;
  request_params?: any;
  raw_response: any;
  response_status?: number;
  search_session_id?: string;
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
  // Investor Classification
  investor_category?: string;
  days_to_sale?: number;
  days_to_rental?: number;
  classification_date?: string;
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
  id?: number; // Auto-generated ID from database
}

export interface PropertyTransaction {
  parcl_property_id: string;
  transaction_sequence: number;
  purchase_event_id?: number;
  sale_event_id?: number;
  purchase_date: string;
  sale_date?: string;
  holding_period_days?: number;
  transaction_category: string;
  investor_type: string;
  purchase_price?: number;
  sale_price?: number;
  profit_loss?: number;
  rental_price?: number; // Latest rental price during ownership period
  has_rental_activity: boolean;
  rental_events_count: number;
  days_to_first_rental?: number;
}

/**
 * Repository for Parcl Labs data operations
 */
class ParclLabsRepository {

  /**
   * Save raw API response
   */
  async saveRawResponse(data: RawResponseData): Promise<number> {
    try {
      const insertQuery = `
        INSERT INTO public.parcl_labs_raw_responses (
          request_hash, api_endpoint, request_params, raw_response,
          response_status, search_session_id, user_id, target_property_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (request_hash)
        DO UPDATE SET
          raw_response = EXCLUDED.raw_response,
          response_status = EXCLUDED.response_status,
          search_session_id = EXCLUDED.search_session_id,
          user_id = EXCLUDED.user_id,
          target_property_id = EXCLUDED.target_property_id
        RETURNING id
      `;

      const values = [
        data.request_hash,
        data.api_endpoint,
        data.request_params || null,
        JSON.stringify(data.raw_response), // Ensure it's stored as JSONB
        data.response_status || null,
        data.search_session_id || null,
        data.user_id || null,
        data.target_property_id || null
      ];

      const result = await query(insertQuery, values);
      return result.rows[0].id;

    } catch (error: any) {
      logger.error('Failed to save raw response', {
        requestHash: data.request_hash,
        endpoint: data.api_endpoint,
        error: error.message
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Batch save raw responses for multiple properties
   */
  async batchSaveRawResponses(rawResponses: RawResponseData[]): Promise<Map<string, number>> {
    if (rawResponses.length === 0) return new Map();

    try {
      const values: any[] = [];
      const placeholders: string[] = [];

      rawResponses.forEach((data, index) => {
        const offset = index * 8;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
        values.push(
          data.request_hash,
          data.api_endpoint,
          data.request_params || null,
          JSON.stringify(data.raw_response),
          data.response_status || null,
          data.search_session_id || null,
          data.user_id || null,
          data.target_property_id || null
        );
      });

      const insertQuery = `
        INSERT INTO public.parcl_labs_raw_responses (
          request_hash, api_endpoint, request_params, raw_response,
          response_status, search_session_id, user_id, target_property_id
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (request_hash)
        DO UPDATE SET
          raw_response = EXCLUDED.raw_response,
          response_status = EXCLUDED.response_status,
          search_session_id = EXCLUDED.search_session_id,
          user_id = EXCLUDED.user_id,
          target_property_id = EXCLUDED.target_property_id
        RETURNING request_hash, id
      `;

      const result = await query(insertQuery, values);
      const hashToIdMap = new Map<string, number>();
      result.rows.forEach(row => {
        hashToIdMap.set(row.request_hash, row.id);
      });

      return hashToIdMap;

    } catch (error: any) {
      logger.error('Failed to batch save raw responses', {
        count: rawResponses.length,
        error: error.message
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Batch save properties (processes in chunks to avoid PostgreSQL parameter limits)
   */
  async batchSaveProperties(properties: ParclProperty[]): Promise<void> {
    if (properties.length === 0) return;

    const chunkSize = 100;
    const chunks = [];

    for (let i = 0; i < properties.length; i += chunkSize) {
      chunks.push(properties.slice(i, i + chunkSize));
    }

    try {
      for (const chunk of chunks) {
        await this.batchSavePropertiesChunk(chunk);
      }

      logger.info('Successfully batch saved properties', {
        totalCount: properties.length,
        chunksProcessed: chunks.length
      });

    } catch (error: any) {
      logger.error('Failed to batch save properties', {
        count: properties.length,
        chunksProcessed: chunks.length,
        error: error.message
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Save a chunk of properties (internal helper method)
   */
  private async batchSavePropertiesChunk(properties: ParclProperty[]): Promise<void> {
    const values: any[] = [];
    const placeholders: string[] = [];

    properties.forEach((property, index) => {
      const offset = index * 30;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29}, $${offset + 30})`);
      values.push(
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
        property.current_on_market_rental_flag,
        property.investor_category,
        property.days_to_sale,
        property.days_to_rental,
        property.classification_date || new Date().toISOString()
      );
    });

    const insertQuery = `
      INSERT INTO public.parcl_labs_properties (
        parcl_property_id, raw_response_id, search_session_id,
        address, city, state_abbreviation, county, zip_code,
        bedrooms, bathrooms, square_footage, year_built,
        property_type, latitude, longitude,
        unit, cbsa, event_count,
        current_on_market_flag, event_history_sale_flag, event_history_rental_flag,
        event_history_listing_flag, current_investor_owned_flag, current_owner_occupied_flag,
        current_new_construction_flag, current_on_market_rental_flag,
        investor_category, days_to_sale, days_to_rental, classification_date
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (parcl_property_id)
      DO UPDATE SET
        last_updated_at = NOW(),
        search_session_id = EXCLUDED.search_session_id,
        investor_category = EXCLUDED.investor_category,
        days_to_sale = EXCLUDED.days_to_sale,
        days_to_rental = EXCLUDED.days_to_rental,
        classification_date = EXCLUDED.classification_date
    `;

    await query(insertQuery, values);
  }

  /**
   * Batch save property transactions (transaction-level classifications)
   */
  async batchSavePropertyTransactions(transactions: PropertyTransaction[]): Promise<void> {
    if (transactions.length === 0) return;

    // Process in chunks of 100 transactions (100 * 15 parameters = 1500, well under PostgreSQL limits)
    const chunkSize = 100;
    const chunks = [];

    for (let i = 0; i < transactions.length; i += chunkSize) {
      chunks.push(transactions.slice(i, i + chunkSize));
    }

    try {
      for (const chunk of chunks) {
        await this.batchSavePropertyTransactionsChunk(chunk);
      }

      logger.info('Successfully batch saved property transactions', {
        totalCount: transactions.length,
        chunksProcessed: chunks.length
      });

    } catch (error: any) {
      logger.error('Failed to batch save property transactions', {
        count: transactions.length,
        chunksProcessed: chunks.length,
        error: error.message
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Save a chunk of property transactions (internal helper method)
   */
  private async batchSavePropertyTransactionsChunk(transactions: PropertyTransaction[]): Promise<void> {
    const values: any[] = [];
    const placeholders: string[] = [];

    transactions.forEach((transaction, index) => {
      const offset = index * 16;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16})`);
      values.push(
        transaction.parcl_property_id,
        transaction.transaction_sequence,
        transaction.purchase_event_id,
        transaction.sale_event_id,
        transaction.purchase_date,
        transaction.sale_date,
        transaction.holding_period_days,
        transaction.transaction_category,
        transaction.investor_type,
        transaction.purchase_price,
        transaction.sale_price,
        transaction.profit_loss,
        transaction.rental_price,
        transaction.has_rental_activity,
        transaction.rental_events_count,
        transaction.days_to_first_rental
      );
    });

    const insertQuery = `
      INSERT INTO public.parcl_labs_property_transactions (
        parcl_property_id, transaction_sequence, purchase_event_id, sale_event_id,
        purchase_date, sale_date, holding_period_days, transaction_category,
        investor_type, purchase_price, sale_price, profit_loss, rental_price,
        has_rental_activity, rental_events_count, days_to_first_rental
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (parcl_property_id, transaction_sequence)
      DO UPDATE SET
        sale_event_id = EXCLUDED.sale_event_id,
        sale_date = EXCLUDED.sale_date,
        holding_period_days = EXCLUDED.holding_period_days,
        transaction_category = EXCLUDED.transaction_category,
        investor_type = EXCLUDED.investor_type,
        sale_price = EXCLUDED.sale_price,
        profit_loss = EXCLUDED.profit_loss,
        rental_price = EXCLUDED.rental_price,
        has_rental_activity = EXCLUDED.has_rental_activity,
        rental_events_count = EXCLUDED.rental_events_count,
        days_to_first_rental = EXCLUDED.days_to_first_rental,
        updated_at = NOW()
    `;

    await query(insertQuery, values);
  }

  /**
   * Get all transactions for a property
   */
  async getPropertyTransactions(parclPropertyId: string): Promise<PropertyTransaction[]> {
    try {
      const queryText = `
        SELECT * FROM public.parcl_labs_property_transactions
        WHERE parcl_property_id = $1
        ORDER BY transaction_sequence
      `;

      const result = await query(queryText, [parclPropertyId]);
      return result.rows;

    } catch (error: any) {
      logger.error('Failed to get property transactions', { parclPropertyId, error: error.message });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Batch save property events (processes in chunks to avoid PostgreSQL parameter limits)
   */
  async batchSavePropertyEvents(events: PropertyEvent[]): Promise<void> {
    if (events.length === 0) return;

    // Process in chunks of 200 events (200 * 15 parameters = 3000, well under PostgreSQL limits)
    const chunkSize = 200;
    const chunks = [];

    for (let i = 0; i < events.length; i += chunkSize) {
      chunks.push(events.slice(i, i + chunkSize));
    }

    try {
      for (const chunk of chunks) {
        await this.batchSavePropertyEventsChunk(chunk);
      }

      logger.info('Successfully batch saved property events', {
        totalCount: events.length,
        chunksProcessed: chunks.length
      });

    } catch (error: any) {
      logger.error('Failed to batch save property events', {
        count: events.length,
        chunksProcessed: chunks.length,
        error: error.message
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Save a chunk of property events (internal helper method)
   */
  private async batchSavePropertyEventsChunk(events: PropertyEvent[]): Promise<void> {
    const values: any[] = [];
    const placeholders: string[] = [];

    events.forEach((event, index) => {
      const offset = index * 15;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`);
      values.push(
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
      );
    });

    const insertQuery = `
      INSERT INTO public.parcl_labs_property_events (
        parcl_property_id, raw_response_id, search_session_id,
        event_type, event_name, event_date, price,
        entity_owner_name, true_sale_index, investor_flag, owner_occupied_flag,
        transfer_index, current_owner_flag, new_construction_flag, record_updated_date
      ) VALUES ${placeholders.join(', ')}
    `;

    await query(insertQuery, values);
  }

  /**
   * Get raw response by ID
   */
  async getRawResponse(id: number): Promise<any> {
    try {
      const queryText = `
        SELECT * FROM public.parcl_labs_raw_responses WHERE id = $1
      `;

      const result = await query(queryText, [id]);
      return result.rows[0] || null;

    } catch (error: any) {
      logger.error('Failed to get raw response', { id, error: error.message });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Update processing status
   */
  async updateProcessingStatus(rawResponseId: number, status: string): Promise<void> {
    try {
      const updateQuery = `
        UPDATE public.parcl_labs_raw_responses
        SET processing_status = $1::VARCHAR(20),
            processed_at = CASE WHEN $1::VARCHAR(20) IN ('completed', 'failed') THEN NOW() ELSE processed_at END
        WHERE id = $2
      `;

      await query(updateQuery, [status, rawResponseId]);

    } catch (error: any) {
      logger.error('Failed to update processing status', {
        rawResponseId,
        status,
        error: error.message
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Save property (with upsert)
   */
  async saveProperty(property: ParclProperty): Promise<void> {
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
          current_new_construction_flag, current_on_market_rental_flag,
          investor_category, days_to_sale, days_to_rental, classification_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
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
        property.current_on_market_rental_flag,
        property.investor_category,
        property.days_to_sale,
        property.days_to_rental,
        property.classification_date || new Date().toISOString()
      ];

      await query(insertQuery, values);

    } catch (error: any) {
      logger.error('Failed to save property', {
        parclPropertyId: property.parcl_property_id,
        error: error.message
      });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Save property event
   */
  async savePropertyEvent(event: PropertyEvent): Promise<void> {
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
      // Handle duplicate events gracefully
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
        throw new AppError(`Database error: ${error.message}`, 500);
      }
    }
  }

  /**
   * Get property by Parcl ID
   */
  async getPropertyByParclId(parclId: string): Promise<any> {
    try {
      const queryText = `
        SELECT * FROM public.parcl_labs_properties WHERE parcl_property_id = $1
      `;

      const result = await query(queryText, [parclId]);
      return result.rows[0] || null;

    } catch (error: any) {
      logger.error('Failed to get property by Parcl ID', { parclId, error: error.message });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Get property events by Parcl ID
   */
  async getPropertyEvents(parclId: string): Promise<any[]> {
    try {
      const queryText = `
        SELECT * FROM public.parcl_labs_property_events
        WHERE parcl_property_id = $1
        ORDER BY event_date DESC
      `;

      const result = await query(queryText, [parclId]);
      return result.rows;

    } catch (error: any) {
      logger.error('Failed to get property events', { parclId, error: error.message });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Get properties by search session
   */
  async getPropertiesBySession(sessionId: string): Promise<any[]> {
    try {
      const queryText = `
        SELECT * FROM public.parcl_labs_properties WHERE search_session_id = $1
      `;

      const result = await query(queryText, [sessionId]);
      return result.rows;

    } catch (error: any) {
      logger.error('Failed to get properties by session', { sessionId, error: error.message });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }

  /**
   * Check if request hash exists (for caching)
   */
  async requestHashExists(hash: string): Promise<boolean> {
    try {
      const queryText = `SELECT 1 FROM public.parcl_labs_raw_responses WHERE request_hash = $1 LIMIT 1`;
      const result = await query(queryText, [hash]);
      return result.rows.length > 0;

    } catch (error: any) {
      logger.error('Failed to check request hash', { hash, error: error.message });
      return false;
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<any> {
    try {
      const queryText = `
        SELECT
          processing_status,
          COUNT(*) as count
        FROM public.parcl_labs_raw_responses
        GROUP BY processing_status
      `;

      const result = await query(queryText);
      return result.rows.reduce((acc: any, row: any) => {
        acc[row.processing_status] = parseInt(row.count);
        return acc;
      }, {});

    } catch (error: any) {
      logger.error('Failed to get processing stats', { error: error.message });
      throw new AppError(`Database error: ${error.message}`, 500);
    }
  }
}

export default new ParclLabsRepository();
