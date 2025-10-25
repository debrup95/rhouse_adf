import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Send an email notification
 * @param to - Recipient's email address
 * @param subject - Email subject
 * @param text - Email body content
 */
export const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false,  // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'yourpassword',
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER || 'user@example.com',
      to,
      subject,
      text
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);

  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};
