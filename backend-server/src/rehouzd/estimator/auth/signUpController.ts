import { Request, Response, NextFunction, RequestHandler } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';

const signupHandler: RequestHandler = async (
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
    // Check if user already exists
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      res.status(400).json({ message: 'User already exists.' });
      return;
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING user_id, email',
      [email, hashedPassword]
    );

    res.status(201).json({ message: 'User created successfully.', user: newUser.rows[0] });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

export default signupHandler;
