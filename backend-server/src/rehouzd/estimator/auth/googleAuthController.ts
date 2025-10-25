import { Request, Response, NextFunction, RequestHandler } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import pool from '../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile: Profile, done) => {
        try {
            const email = profile.emails?.[0].value;
            if (!email) {
                return done(new Error('No email found'), false);
            }
            // Check if user exists
            const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            let user;
            if (userQuery.rows.length > 0) {
                user = userQuery.rows[0];
            } else {
                // Create a new user with a random password
                const randomPassword = Math.random().toString(36).slice(-8);
                const hashedPassword = await bcrypt.hash(randomPassword, 10);
                const result = await pool.query(
                    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
                    [email, hashedPassword]
                );
                user = result.rows[0];
            }
            return done(null, user);
        } catch (error) {
            return done(error, false);
        }
    }
));

passport.serializeUser((user: any, done) => {
    done(null, user.user_id);
});

passport.deserializeUser(async (id: number, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
        done(null, result.rows[0]);
    } catch (error) {
        done(error, null);
    }
});

// Initiate Google OAuth
export const googleAuthInitiate: RequestHandler = passport.authenticate('google', { scope: ['profile', 'email'] });

// Google OAuth callback
export const googleAuthCallback: RequestHandler = (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err || !user) {
            return res.redirect('/login?error=google');
        }
        // Generate a JWT token
        const token = jwt.sign({ id: user.user_id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        // Redirect to the desired page with token as query parameter (or set a cookie)
        return res.redirect(`/search?token=${token}`);
    })(req, res, next);
};
