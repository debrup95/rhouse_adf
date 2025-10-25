import pool from '../../config/db';

export interface UnderwriteRequest {
    request_id?: number;
    user_id?: number; // Made optional to handle FK constraint issues
    property_address: string;
    estimated_price: string;
    notes: string;
    property_beds?: string;
    property_baths?: string;
    property_sqft?: string;
    property_year?: string;
    photo_url?: string;
    images_data?: any; // JSON data
    status?: string;
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

export interface CreateUnderwriteRequestData {
    user_id?: number; // Made optional to handle FK constraint issues
    property_address: string;
    estimated_price: string;
    notes: string;
    property_beds?: string;
    property_baths?: string;
    property_sqft?: string;
    property_year?: string;
    photo_url?: string;
    images_data?: any; // JSON data
    email?: string; // Optional email from frontend
}

export class UnderwriteRequestModel {
    /**
     * Create a new underwrite request
     */
    static async create(data: CreateUnderwriteRequestData): Promise<UnderwriteRequest> {
        const query = `
            INSERT INTO underwrite_requests (
                user_id, property_address, estimated_price, notes,
                property_beds, property_baths, property_sqft, property_year, photo_url, images_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const values = [
            data.user_id || null, // Allow NULL user_id to bypass FK constraint issues
            data.property_address,
            data.estimated_price,
            data.notes,
            data.property_beds,
            data.property_baths,
            data.property_sqft,
            data.property_year,
            data.photo_url,
            JSON.stringify(data.images_data)
        ];
        
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Get all underwrite requests with user details
     */
    static async getAll(): Promise<UnderwriteRequest[]> {
        const query = `
            SELECT ur.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number,
                   admin.first_name as processed_by_name
            FROM underwrite_requests ur
            INNER JOIN users u ON ur.user_id = u.user_id
            LEFT JOIN users admin ON ur.processed_by = admin.user_id
            ORDER BY ur.created_at DESC
        `;
        
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Get underwrite requests by user ID with user details
     */
    static async getByUserId(userId: number): Promise<UnderwriteRequest[]> {
        const query = `
            SELECT ur.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number
            FROM underwrite_requests ur
            INNER JOIN users u ON ur.user_id = u.user_id
            WHERE ur.user_id = $1 
            ORDER BY ur.created_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * Get underwrite request by ID with user details
     */
    static async getById(requestId: number): Promise<UnderwriteRequest | null> {
        const query = `
            SELECT ur.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number,
                   admin.first_name as processed_by_name
            FROM underwrite_requests ur
            INNER JOIN users u ON ur.user_id = u.user_id
            LEFT JOIN users admin ON ur.processed_by = admin.user_id
            WHERE ur.request_id = $1
        `;
        
        const result = await pool.query(query, [requestId]);
        return result.rows[0] || null;
    }

    /**
     * Update images_data for an underwrite request
     * Used after blob move operations to update URLs
     */
    static async updateImagesData(requestId: number, imagesData: any[]): Promise<void> {
        const query = `
            UPDATE underwrite_requests 
            SET images_data = $1, updated_at = NOW()
            WHERE request_id = $2
        `;
        
        await pool.query(query, [JSON.stringify(imagesData), requestId]);
    }

    /**
     * Update underwrite request status
     */
    static async updateStatus(
        requestId: number, 
        status: string, 
        processedBy?: number, 
        adminNotes?: string
    ): Promise<UnderwriteRequest | null> {
        const query = `
            UPDATE underwrite_requests 
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
     * Delete underwrite request
     */
    static async delete(requestId: number): Promise<boolean> {
        const query = 'DELETE FROM underwrite_requests WHERE request_id = $1';
        const result = await pool.query(query, [requestId]);
        return (result.rowCount ?? 0) > 0;
    }
} 