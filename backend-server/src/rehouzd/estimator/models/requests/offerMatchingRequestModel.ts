import pool from '../../config/db';

export interface OfferMatchingRequest {
    request_id?: number;
    user_id: number;
    phone_number?: string; 
    property_address?: string;
    status?: string;
    notes?: string;
    admin_notes?: string;
    processed_by?: number;
    processed_at?: Date;
    created_at?: Date;
    updated_at?: Date;
    // Joined user details
    user_email?: string;
    user_first_name?: string;
    user_last_name?: string;
    user_mobile_number?: string;
    processed_by_name?: string;
}

export interface CreateOfferMatchingRequestData {
    user_id: number;
    phone_number?: string; 
    property_address?: string;
    notes?: string;
}

export class OfferMatchingRequestModel {
    /**
     * Create a new offer matching request
     */
    static async create(data: CreateOfferMatchingRequestData): Promise<OfferMatchingRequest> {
        const query = `
            INSERT INTO offer_matching_requests (
                user_id, phone_number, property_address, notes
            ) VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const values = [
            data.user_id,
            data.phone_number,
            data.property_address,
            data.notes
        ];
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Get all offer matching requests with user details
     */
    static async getAll(): Promise<OfferMatchingRequest[]> {
        const query = `
            SELECT omr.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number,
                   admin.first_name as processed_by_name
            FROM offer_matching_requests omr
            INNER JOIN users u ON omr.user_id = u.user_id
            LEFT JOIN users admin ON omr.processed_by = admin.user_id
            ORDER BY omr.created_at DESC
        `;
        
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Get offer matching requests by user ID with user details
     */
    static async getByUserId(userId: number): Promise<OfferMatchingRequest[]> {
        const query = `
            SELECT omr.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number
            FROM offer_matching_requests omr
            INNER JOIN users u ON omr.user_id = u.user_id
            WHERE omr.user_id = $1 
            ORDER BY omr.created_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * Get offer matching request by ID with user details
     */
    static async getById(requestId: number): Promise<OfferMatchingRequest | null> {
        const query = `
            SELECT omr.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number,
                   admin.first_name as processed_by_name
            FROM offer_matching_requests omr
            INNER JOIN users u ON omr.user_id = u.user_id
            LEFT JOIN users admin ON omr.processed_by = admin.user_id
            WHERE omr.request_id = $1
        `;
        
        const result = await pool.query(query, [requestId]);
        return result.rows[0] || null;
    }

    /**
     * Update offer matching request status
     */
    static async updateStatus(
        requestId: number, 
        status: string, 
        processedBy?: number, 
        adminNotes?: string
    ): Promise<OfferMatchingRequest | null> {
        const query = `
            UPDATE offer_matching_requests 
            SET status = $1, 
                processed_by = $2, 
                processed_at = $3,
                admin_notes = $4,
                updated_at = NOW()
            WHERE request_id = $5
            RETURNING *
        `;
        
        const values = [
            status,
            processedBy,
            processedBy ? new Date() : null,
            adminNotes,
            requestId
        ];
        
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    /**
     * Delete offer matching request
     */
    static async delete(requestId: number): Promise<boolean> {
        const query = 'DELETE FROM offer_matching_requests WHERE request_id = $1';
        const result = await pool.query(query, [requestId]);
        return (result.rowCount ?? 0) > 0;
    }
} 