import pool from '../config/db';

export interface User {
  username: string;
  email: string;
  mobile_number: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  last_login?: string;
}


/**
 * Get all users from the database
 */
export const getAllUsers = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
          user_id,
          username,
          email,
          mobile_number,
          first_name,
          last_name,
          last_login,
          created_at
      FROM users
      ORDER BY created_at DESC;
    `;

    const result = await client.query(query);
    return result.rows;

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a User by user_id
 */
export const getUserById = async (email: string): Promise<User | null> => {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        user_id, 
        username, 
        email, 
        mobile_number, 
        password_hash, 
        first_name, 
        last_name, 
        created_at, 
        updated_at, 
        last_login
      FROM users
      WHERE email = $1;
    `;

    const result = await client.query(query, [email]);

    if (result.rows.length > 0) {
      console.log(`✅ User with email ${email} found.`);
      return result.rows[0];
    } else {
      console.log(`⚠️ No user found with email ${email}.`);
      return null;
    }

  } catch (error) {
    console.error(`❌ Error fetching user by ID: ${email}`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Insert or Update User
 */
export const saveUser = async (user: User): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO users (username, email, mobile_number, password_hash, first_name, last_name, last_login)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email)
      DO UPDATE SET
        username = EXCLUDED.username,
        mobile_number = EXCLUDED.mobile_number,
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        last_login = EXCLUDED.last_login;
    `;

    const values = [
      user.username,
      user.email,
      user.mobile_number,
      user.password_hash,
      user.first_name,
      user.last_name,
      user.last_login || new Date().toISOString(),
    ];

    await client.query(query, values);
    console.log('User saved or updated successfully');
  } catch (error) {
    console.error('Error saving/updating user:', error);
    throw error;
  } finally {
    client.release();
  }
};


export const checkAndUpdateMobileNumber = async (userId: number, mobileNumber?: number): Promise<void> => {
  const client = await pool.connect();

  try {
    // ✅ Check if the user exists and has a mobile number
    const userQuery = `SELECT mobile_number FROM users WHERE user_id = $1`;
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const existingMobileNumber = userResult.rows[0].mobile_number;

    // ✅ Update mobile number if missing
    if (!existingMobileNumber && mobileNumber) {
      const updateQuery = `
        UPDATE users
        SET mobile_number = $1
        WHERE user_id = $2
      `;
      await client.query(updateQuery, [mobileNumber, userId]);
      console.log(`✅ Mobile number updated for user_id: ${userId}`);
    }

  } catch (error) {
    console.error('❌ Error checking/updating mobile number:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get user email by ID
 * @param userId - The ID of the user
 * @returns email - The email of the user
 */
export const getUserEmailById = async (userId: number): Promise<string | null> => {
  const client = await pool.connect();

  try {
    const query = `SELECT email FROM users WHERE user_id = $1`;
    const result = await client.query(query, [userId]);

    if (result.rows.length > 0) {
      return result.rows[0].email;
    }

    return null;

  } catch (error) {
    console.error('❌ Error fetching user email:', error);
    throw error;
  } finally {
    client.release();
  }
};