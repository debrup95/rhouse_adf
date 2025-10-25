import pool from '../../config/db';

export interface OfferRequest {
    id?: number; // Changed from request_id to id to match property_images table
    user_id?: number; // Made optional to handle FK constraint issues
    property_address: string;
    target_price: string;
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
    // New columns from property_images table
    container_name?: string; // New folder created for this request
    image_count?: number; // Count of images uploaded
    request_type?: string; // Type of request (getoffer, underwrite, etc.)
    // Joined user details
    user_email?: string;
    user_first_name?: string;
    user_last_name?: string;
    user_mobile_number?: string;
    processed_by_name?: string;
}

export interface CreateOfferRequestData {
    user_id?: number; // Made optional to handle FK constraint issues
    property_address: string;
    target_price: string;
    notes: string;
    property_beds?: string;
    property_baths?: string;
    property_sqft?: string;
    property_year?: string;
    photo_url?: string;
    images_data?: any; // JSON data
    container_name?: string; // New folder created for this request
    image_count?: number; // Count of images uploaded
    email?: string; // Optional email from frontend
}

export class OfferRequestModel {
    /**
     * Create a new offer request using property_images table
     */
    static async create(data: CreateOfferRequestData): Promise<OfferRequest> {
        const query = `
            INSERT INTO property_images (
                user_id, property_address, target_price, notes,
                property_beds, property_baths, property_sqft, property_year,
                photo_url, images_data, container_name, image_count, request_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const values = [
            data.user_id || null, // Allow NULL user_id to bypass FK constraint issues
            data.property_address,
            data.target_price,
            data.notes,
            data.property_beds,
            data.property_baths,
            data.property_sqft,
            data.property_year,
            data.photo_url,
            JSON.stringify(data.images_data),
            data.container_name || null,
            data.image_count || null,
            'getoffer' // Default request type
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Get all offer requests with user details using property_images table
     */
    static async getAll(): Promise<OfferRequest[]> {
        const query = `
            SELECT pi.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number,
                   admin.first_name as processed_by_name
            FROM property_images pi
            INNER JOIN users u ON pi.user_id = u.user_id
            LEFT JOIN users admin ON pi.processed_by = admin.user_id
            WHERE pi.request_type = 'getoffer'
            ORDER BY pi.created_at DESC
        `;
        
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Get offer requests by user ID with user details using property_images table
     */
    static async getByUserId(userId: number): Promise<OfferRequest[]> {
        const query = `
            SELECT pi.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number
            FROM property_images pi
            INNER JOIN users u ON pi.user_id = u.user_id
            WHERE pi.user_id = $1 AND pi.request_type = 'getoffer'
            ORDER BY pi.created_at DESC
        `;
        
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    /**
     * Get offer request by ID with user details using property_images table
     */
    static async getById(requestId: number): Promise<OfferRequest | null> {
        const query = `
            SELECT pi.*, 
                   u.email as user_email,
                   u.first_name as user_first_name,
                   u.last_name as user_last_name,
                   u.mobile_number as user_mobile_number,
                   admin.first_name as processed_by_name
            FROM property_images pi
            INNER JOIN users u ON pi.user_id = u.user_id
            LEFT JOIN users admin ON pi.processed_by = admin.user_id
            WHERE pi.id = $1 AND pi.request_type = 'getoffer'
        `;
        
        const result = await pool.query(query, [requestId]);
        return result.rows[0] || null;
    }

    /**
     * Update images_data for an offer request
     * Used after blob move operations to update URLs
     */
    static async updateImagesData(requestId: number, imagesData: any[]): Promise<void> {
        const query = `
            UPDATE property_images 
            SET images_data = $1, updated_at = NOW()
            WHERE id = $2 AND request_type = 'getoffer'
        `;
        
        await pool.query(query, [JSON.stringify(imagesData), requestId]);
    }

    /**
     * Update container_name for an offer request
     * Used after blob move operations to update the final container name
     */
    static async updateContainerName(requestId: number, containerName: string): Promise<void> {
        const query = `
            UPDATE property_images 
            SET container_name = $1, updated_at = NOW()
            WHERE id = $2 AND request_type = 'getoffer'
        `;
        
        await pool.query(query, [containerName, requestId]);
    }

    /**
     * Update offer request status using property_images table
     */
    static async updateStatus(requestId: number, status: string, adminNotes?: string, processedBy?: number): Promise<OfferRequest | null> {
        const query = `
            UPDATE property_images 
            SET status = $2, 
                admin_notes = $3, 
                processed_by = $4, 
                processed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1 AND request_type = 'getoffer'
            RETURNING *
        `;
        
        const values = [requestId, status, adminNotes, processedBy];
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }
} 