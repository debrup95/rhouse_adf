import { Request, Response, NextFunction, RequestHandler } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const loginHandler: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  try {
    // Find user by email
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    const user = userQuery.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    // Generate a JWT token
    const token = jwt.sign(
        { user_id: user.user_id, email: user.email,
          },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );

    res.json({ message: 'Login successful.', token, user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        fname: user.first_name,
        lname: user.last_name,
        mobile: user.mobile_number} });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

export default loginHandler;
