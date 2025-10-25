import { Request, Response, NextFunction, RequestHandler } from 'express';
import pool from '../config/db';

const updateUserProfile: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { user_id, email, first_name, last_name, mobile_number } = req.body;

    if (!user_id) {
        res.status(400).json({ message: 'User id is required.' });
        return;
    }

    try {
        // Check if the user exists
        const existingUser = await pool.query(
            'SELECT user_id FROM users WHERE user_id = $1',
            [user_id]
        );
        if (existingUser.rows.length === 0) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        // Build dynamic update query based on provided fields
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (email !== undefined) {
            fields.push(`email = $${paramIndex}`);
            values.push(email);
            paramIndex++;
        }

        if (first_name !== undefined) {
            fields.push(`first_name = $${paramIndex}`);
            values.push(first_name);
            paramIndex++;
        }

        if (last_name !== undefined) {
            fields.push(`last_name = $${paramIndex}`);
            values.push(last_name);
            paramIndex++;
        }

        if (mobile_number !== undefined) {
            fields.push(`mobile_number = $${paramIndex}`);
            values.push(mobile_number);
            paramIndex++;
        }

        if (fields.length === 0) {
            res.status(400).json({ message: 'No profile data provided to update.' });
            return;
        }

        // Add the id parameter for the WHERE clause
        values.push(user_id);
        const updateQuery = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING user_id AS user_id, email, first_name, last_name, mobile_number
    `;

        console.error(updateQuery);

        const updatedUser = await pool.query(updateQuery, values);
        res.status(200).json({
            message: 'Profile updated successfully.',
            user: updatedUser.rows[0],
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ message: 'Server error during profile update.' });
    }
};

export default updateUserProfile;
