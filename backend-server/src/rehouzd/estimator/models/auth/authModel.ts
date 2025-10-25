import { query } from '../../config/db';

export interface UserCredentials {
  email: string;
  password_hash: string;
}

export interface UserProfile {
  user_id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  mobile_number?: string;
  last_login?: Date;
}

/**
 * Get user by email
 */
export const getUserByEmail = async (email: string): Promise<any | null> => {
  try {
    const queryText = 'SELECT * FROM users WHERE email = $1';
    const result = await query(queryText, [email]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

/**
 * Check if a user exists by email
 */
export const checkUserExists = async (email: string): Promise<boolean> => {
  try {
    const queryText = 'SELECT user_id FROM users WHERE email = $1';
    const result = await query(queryText, [email]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
};

/**
 * Create a new user
 */
export const createUser = async (user: UserProfile & UserCredentials): Promise<any> => {
  try {
    const queryText = `
      INSERT INTO users (username, email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, email
    `;
    const values = [
      user.email, // username defaults to email
      user.email,
      user.password_hash,
      user.first_name || '',
      user.last_name || ''
    ];
    const result = await query(queryText, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUser = async (
  userId: number,
  updates: Partial<UserProfile>
): Promise<any> => {
  try {
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Add each field that's being updated
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add user_id for WHERE clause
    values.push(userId);
    
    const queryText = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING user_id, username, email, first_name, last_name, mobile_number
    `;

    const result = await query(queryText, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Update user password
 */
export const updatePassword = async (email: string, passwordHash: string): Promise<void> => {
  try {
    const queryText = 'UPDATE users SET password_hash = $1 WHERE email = $2';
    await query(queryText, [passwordHash, email]);
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: number): Promise<any | null> => {
  try {
    const queryText = 'SELECT * FROM users WHERE user_id = $1';
    const result = await query(queryText, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}; 