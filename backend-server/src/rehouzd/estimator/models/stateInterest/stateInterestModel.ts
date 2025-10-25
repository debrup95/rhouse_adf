import db from '../../config/db';
import logger from '../../utils/logger';

export interface StateInterestRequest {
  request_id?: number;
  user_id?: number | null;
  email: string;
  states: string[]; // Array of state abbreviations
  source: string;
  ip_address?: string;
  user_agent?: string;
  status?: 'active' | 'notified' | 'unsubscribed';
  created_at?: Date;
  updated_at?: Date;
  notified_at?: Date | null;
}

export interface CreateStateInterestRequest {
  user_id?: number | null;
  email: string;
  states: string[];
  source: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export class StateInterestModel {
  /**
   * Create a new state interest request
   */
  static async create(data: CreateStateInterestRequest): Promise<StateInterestRequest> {
    try {
      logger.info('Creating state interest request', { 
        email: data.email, 
        states: data.states, 
        source: data.source,
        user_id: data.user_id
      });

      const query = `
        INSERT INTO state_interest_requests (
          user_id, email, states, source, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        data.user_id || null,
        data.email.toLowerCase().trim(),
        JSON.stringify(data.states), // PostgreSQL JSONB expects JSON string
        data.source,
        data.ip_address || null,
        data.user_agent || null
      ];

      const result = await db.query(query, values);
      
      logger.info('State interest request created successfully', { 
        request_id: result.rows[0].request_id,
        email: data.email 
      });

      return {
        ...result.rows[0],
        states: result.rows[0].states // Already parsed by PostgreSQL JSONB
      };
    } catch (error: any) {
      logger.error('Error creating state interest request', {
        error: error.message,
        email: data.email,
        states: data.states
      });
      throw error;
    }
  }

  /**
   * Get state interest requests by email
   */
  static async getByEmail(email: string): Promise<StateInterestRequest[]> {
    try {
      const query = `
        SELECT * FROM state_interest_requests 
        WHERE email = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [email.toLowerCase().trim()]);
      
      return result.rows.map(row => ({
        ...row,
        states: row.states // Already parsed by PostgreSQL JSONB
      }));
    } catch (error: any) {
      logger.error('Error fetching state interest requests by email', {
        error: error.message,
        email
      });
      throw error;
    }
  }

  /**
   * Get state interest requests by user ID
   */
  static async getByUserId(userId: number): Promise<StateInterestRequest[]> {
    try {
      const query = `
        SELECT * FROM state_interest_requests 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      return result.rows.map(row => ({
        ...row,
        states: row.states // Already parsed by PostgreSQL JSONB
      }));
    } catch (error: any) {
      logger.error('Error fetching state interest requests by user ID', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get all active requests for specific states
   */
  static async getActiveRequestsForStates(states: string[]): Promise<StateInterestRequest[]> {
    try {
      const query = `
        SELECT * FROM state_interest_requests 
        WHERE status = 'active' 
        AND states ?| $1
        ORDER BY created_at ASC
      `;
      
      const result = await db.query(query, [states]);
      
      return result.rows.map(row => ({
        ...row,
        states: row.states // Already parsed by PostgreSQL JSONB
      }));
    } catch (error: any) {
      logger.error('Error fetching active requests for states', {
        error: error.message,
        states
      });
      throw error;
    }
  }

  /**
   * Update request status
   */
  static async updateStatus(
    requestId: number, 
    status: 'active' | 'notified' | 'unsubscribed'
  ): Promise<StateInterestRequest | null> {
    try {
      const query = `
        UPDATE state_interest_requests 
        SET status = $1, updated_at = NOW()
        ${status === 'notified' ? ', notified_at = NOW()' : ''}
        WHERE request_id = $2
        RETURNING *
      `;
      
      const result = await db.query(query, [status, requestId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return {
        ...result.rows[0],
        states: result.rows[0].states // Already parsed by PostgreSQL JSONB
      };
    } catch (error: any) {
      logger.error('Error updating state interest request status', {
        error: error.message,
        requestId,
        status
      });
      throw error;
    }
  }

  /**
   * Check if email already has active request for same states
   */
  static async checkDuplicate(email: string, states: string[]): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM state_interest_requests 
        WHERE email = $1 AND states = $2 AND status = 'active'
      `;
      
      const result = await db.query(query, [
        email.toLowerCase().trim(), 
        JSON.stringify(states.sort()) // PostgreSQL JSONB expects JSON string
      ]);
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error: any) {
      logger.error('Error checking duplicate state interest request', {
        error: error.message,
        email,
        states
      });
      throw error;
    }
  }

  /**
   * Get statistics for admin dashboard
   */
  static async getStatistics(): Promise<{
    total_requests: number;
    unique_emails: number;
    requests_by_state: Record<string, number>;
    requests_by_source: Record<string, number>;
  }> {
    try {
      const queries = [
        // Total requests
        'SELECT COUNT(*) as total FROM state_interest_requests WHERE status = \'active\'',
        
        // Unique emails
        'SELECT COUNT(DISTINCT email) as unique FROM state_interest_requests WHERE status = \'active\'',
        
        // Requests by state
        `SELECT 
          jsonb_array_elements_text(states) as state,
          COUNT(*) as count
        FROM state_interest_requests 
        WHERE status = 'active'
        GROUP BY state
        ORDER BY count DESC`,
        
        // Requests by source
        `SELECT 
          source,
          COUNT(*) as count
        FROM state_interest_requests 
        WHERE status = 'active'
        GROUP BY source
        ORDER BY count DESC`
      ];

      const [totalResult, uniqueResult, stateResult, sourceResult] = await Promise.all(
        queries.map(query => db.query(query))
      );

      const requestsByState: Record<string, number> = {};
      stateResult.rows.forEach(row => {
        requestsByState[row.state] = parseInt(row.count);
      });

      const requestsBySource: Record<string, number> = {};
      sourceResult.rows.forEach(row => {
        requestsBySource[row.source] = parseInt(row.count);
      });

      return {
        total_requests: parseInt(totalResult.rows[0].total),
        unique_emails: parseInt(uniqueResult.rows[0].unique),
        requests_by_state: requestsByState,
        requests_by_source: requestsBySource
      };
    } catch (error: any) {
      logger.error('Error fetching state interest statistics', {
        error: error.message
      });
      throw error;
    }
  }
}
