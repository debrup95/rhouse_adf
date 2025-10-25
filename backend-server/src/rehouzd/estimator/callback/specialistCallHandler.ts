import { Request, Response, NextFunction, RequestHandler } from 'express';
import pool from '../config/db';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const specialistCallHandler: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId, phoneNumber, requestedAt } = req.body;

  if (!userId || !phoneNumber || !requestedAt) {
    res.status(400).json({ message: 'Missing required fields.' });
    return;
  }

  try {
    // Insert the call request into the database
    const insertQuery = `
      INSERT INTO specialist_calls (user_id, mobile_number, requested_at)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const result = await pool.query(insertQuery, [userId, phoneNumber, requestedAt]);

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false, // true for 465, false for other ports
      // auth: {
      //     user: process.env.SMTP_USER || 'user@example.com',
      //     pass: process.env.SMTP_PASS || 'yourpassword',
      // },
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

    const mailOptions = {
      from: process.env.SMTP_USER || 'user@example.com',
      to: adminEmail,
      subject: 'New Specialist Call Request',
      text: `User ID: ${userId}\nPhone Number: ${phoneNumber}\nRequested At: ${requestedAt}`,
    };

    // Send an email to the admin
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Call request received', requestId: result.rows[0].id });
  } catch (err) {
    console.error('Error handling specialist call:', err);
    res.status(500).json({ message: 'Server error during specialist call request.' });
  }
};

export default specialistCallHandler;
