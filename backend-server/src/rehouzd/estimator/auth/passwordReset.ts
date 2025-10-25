import { Request, Response, NextFunction, RequestHandler } from 'express';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// In production, store reset tokens in a database instead of memory.
const resetTokens: { [email: string]: { token: string; expires: number } } = {};

/**
 * Request a password reset by generating a token.
 * In a real-world scenario, email this token or a reset link to the user.
 */
export const requestPasswordReset: RequestHandler = async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ message: 'Email is required.' });
        return;
    }
    try {
        // Check if user exists
        const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userQuery.rows.length === 0) {
            res.status(400).json({ message: 'No user found with that email.' });
            return;
        }
        // Generate a reset token
        const token = crypto.randomBytes(32).toString('hex');
        // Token expires in 1 hour
        const expires = Date.now() + 3600000;
        resetTokens[email] = { token, expires };

        // In production, email the reset token or link to the user
        res.json({ message: 'Password reset token generated.', token });
    } catch (err) {
        console.error('Request password reset error:', err);
        res.status(500).json({ message: 'Server error during password reset request.' });
    }
};

/**
 * Reset the password using the provided token.
 */
export const resetPassword: RequestHandler = async (req, res, next) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
        res.status(400).json({ message: 'Email, token, and new password are required.' });
        return;
    }
    try {
        const record = resetTokens[email];
        if (!record || record.token !== token || record.expires < Date.now()) {
            res.status(400).json({ message: 'Invalid or expired token.' });
            return;
        }
        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        // Update the user's password in the database
        await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);
        // Invalidate the token
        delete resetTokens[email];
        res.json({ message: 'Password has been reset successfully.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};
