import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

/**
 * Check if SMTP is properly configured
 */
const isSMTPConfigured = (): boolean => {
  return !!(process.env.SMTP_HOST && 
           process.env.SMTP_HOST !== 'localhost' && 
           process.env.SMTP_USER && 
           process.env.SMTP_PASS);
};

/**
 * Simulate email for development when SMTP is not configured
 */
const simulateEmail = (to: string, subject: string, text: string): void => {
  console.log('\n=== EMAIL SIMULATION (Development Mode) ===');
  console.log(`Email To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${text}`);
  console.log('============================================\n');
  
  setTimeout(() => {
    console.log(`Email simulated successfully for ${to}`);
  }, 100);
};

/**
 * Send an email notification
 * @param to - Recipient's email address
 * @param subject - Email subject
 * @param text - Email body content
 */
export const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
  try {
    // Check if we're in development and SMTP is not configured
    if (process.env.NODE_ENV === 'development' && !isSMTPConfigured()) {
      simulateEmail(to, subject, text);
      console.log(`Email simulated successfully for ${to}`);
      return;
    }

    // Create transporter for actual email sending
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Add some additional options for better compatibility
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates in development
      }
    });

    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_FROM || 'noreply@rehouzd.com',
      to,
      subject,
      text,
      html: text.replace(/\n/g, '<br>') // Simple text to HTML conversion
    };

    // Verify transporter configuration
    await transporter.verify();
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}, Message ID: ${info.messageId}`);

  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    
    // In development, fall back to simulation if email fails
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to email simulation...');
      simulateEmail(to, subject, text);
      console.log(`Email simulated as fallback for ${to}`);
    } else {
      // In production, throw the error
      throw error;
    }
  }
};

/**
 * Send a callback confirmation email
 * @param email - User's email address
 * @param userName - User's name
 * @param phoneNumber - Phone number for callback
 */
export const sendCallbackConfirmationEmail = async (
  email: string,
  userName: string,
  phoneNumber: string
): Promise<void> => {
  const subject = 'Rehouzd Callback Request Confirmed';
  
  const textContent = `
Hello ${userName},

Your callback request has been successfully received!

Thank you for requesting a specialist callback from Rehouzd. We've received your request and our team will contact you shortly.

Callback Details:
Phone Number: ${phoneNumber}
Requested: ${new Date().toLocaleString()}

What happens next?
- Our specialist will review your request
- You'll receive a call within the next business day
- We'll discuss your property needs and answer any questions
- Get personalized recommendations for your situation

If you have any immediate questions, please don't hesitate to contact us.

Best regards,
The Rehouzd Team

This is an automated message. Please do not reply to this email.
  `;

  await sendEmail(email, subject, textContent);
};

/**
 * Send a callback admin notification email
 * @param adminEmail - Admin email address
 * @param userName - User's name
 * @param userEmail - User's email
 * @param phoneNumber - Phone number for callback
 * @param propertyAddress - Property address for context
 * @param userId - User ID (optional)
 */
export const sendCallbackAdminNotification = async (
  adminEmail: string,
  userName: string,
  userEmail: string,
  phoneNumber: string,
  userId?: number
): Promise<void> => {
  const subject = `New Callback Request from ${userName}`;
  const content = `New Callback Request - Action Required

A new callback request has been submitted and requires attention from the specialist team.

Request Details:
User Name: ${userName}
Email: ${userEmail}
Phone Number: ${phoneNumber}
User ID: ${userId || 'Anonymous'}
Request Time: ${new Date().toLocaleString()}

Next Steps:
- Review the user's profile and property interests
- Schedule a callback within the next business day
- Follow up with the user to discuss their needs

Please ensure this request is addressed promptly to maintain customer satisfaction.`;

  await sendEmail(adminEmail, subject, content);
};
