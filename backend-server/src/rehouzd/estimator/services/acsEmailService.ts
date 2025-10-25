import { EmailClient, EmailMessage, EmailSendResult } from '@azure/communication-email';
import logger from '../utils/logger';

// Initialize ACS Email Client
let emailClient: EmailClient | null = null;

const initializeEmailClient = (): EmailClient => {
  if (!emailClient) {
    // Access environment variables directly instead of config object
    // This ensures we get the values set by loadConfiguration() during startup
    const connectionString = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;
    const senderEmail = process.env.ACS_SENDER_EMAIL;
    
    if (!connectionString || !senderEmail) {
      const missingVars = [];
      if (!connectionString) missingVars.push('AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING');
      if (!senderEmail) missingVars.push('ACS_SENDER_EMAIL');
      
      logger.error(`[ACS Email Service] Missing required environment variables: ${missingVars.join(', ')}`);
      logger.error('[ACS Email Service] Please configure Azure Communication Services credentials in your .env file');
      logger.error('[ACS Email Service] See env.example for required variables');
      
      // For development, provide a more helpful error
      if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
        logger.info('[ACS Email Service] To enable real email sending:');
        logger.info('[ACS Email Service] 1. Create an Azure Communication Services resource');
        logger.info('[ACS Email Service] 2. Set up a verified email domain');
        logger.info('[ACS Email Service] 3. Add the connection string and sender email to your .env file');
        
        // In development, we can simulate emails with console output
        logger.warn('[ACS Email Service] Falling back to console simulation for development');
        return createSimulationClient();
      }
      
      throw new Error(`Azure Communication Services not configured. Missing: ${missingVars.join(', ')}`);
    }

    try {
      emailClient = new EmailClient(connectionString);
      logger.info('[ACS Email Service] Email client initialized successfully with Azure Communication Services');
    } catch (error) {
      logger.error('[ACS Email Service] Failed to initialize Azure Email Client:', error);
      
      if (process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development') {
        logger.warn('[ACS Email Service] Falling back to console simulation for development');
        return createSimulationClient();
      }
      
      throw error;
    }
  }
  
  return emailClient;
};

// Create simulation client for development when Azure is not configured
const createSimulationClient = (): any => {
  return {
    beginSend: async (emailMessage: EmailMessage) => {
      // Simulate sending email with console output
      const toEmail = emailMessage.recipients?.to?.[0]?.address || 'unknown@email.com';
      
      logger.info('[ACS Email Service] SIMULATION MODE - Email would be sent:', {
        to: toEmail,
        subject: emailMessage.content.subject,
        from: emailMessage.senderAddress
      });
      
      console.log('\n============================================');
      console.log('AZURE COMMUNICATION SERVICES EMAIL SIMULATION');
      console.log('============================================');
      console.log(`From: ${emailMessage.senderAddress}`);
      console.log(`To: ${toEmail}`);
      console.log(`Subject: ${emailMessage.content.subject}`);
      console.log('============================================');
      console.log('Text Content:');
      console.log(emailMessage.content.plainText);
      console.log('============================================\n');

      return {
        pollUntilDone: async (): Promise<EmailSendResult> => {
          return {
            status: 'Succeeded',
            id: 'sim-' + Date.now()
          } as EmailSendResult;
        }
      };
    }
  };
};

export interface EmailOptions {
  to: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
}

/**
 * Send an email using Azure Communication Services
 * @param options - Email options including recipient, subject, and content
 */
export const sendACSEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const client = initializeEmailClient();
    const senderEmail = process.env.ACS_SENDER_EMAIL || 'noreply@rehouzd.com';

    const emailMessage: EmailMessage = {
      senderAddress: senderEmail,
      content: {
        subject: options.subject,
        html: options.htmlContent || '',
        plainText: options.textContent || '',
      },
      recipients: {
        to: [{ address: options.to }],
      },
    };

    logger.info(`[ACS Email Service] Sending email to ${options.to} with subject: ${options.subject}`);
    
    const poller = await client.beginSend(emailMessage);
    const result: EmailSendResult = await poller.pollUntilDone();

    if (result.status === 'Succeeded') {
      logger.info(`[ACS Email Service] Email sent successfully to ${options.to}, Message ID: ${result.id}`);
    } else {
      logger.error(`[ACS Email Service] Email failed to send. Status: ${result.status}`, result);
      throw new Error(`Email sending failed with status: ${result.status}`);
    }

  } catch (error) {
    logger.error('[ACS Email Service] Error sending email:', error);
    throw error;
  }
};

/**
 * Send an email in simulation mode (for testing purposes)
 * @param options - Email options including recipient, subject, and content
 */
export const sendACSEmailSimulation = async (options: EmailOptions): Promise<void> => {
  const simulationClient = createSimulationClient();
  const senderEmail = process.env.ACS_SENDER_EMAIL || 'noreply@rehouzd.com';

  const emailMessage: EmailMessage = {
    senderAddress: senderEmail,
    content: {
      subject: options.subject,
      html: options.htmlContent || '',
      plainText: options.textContent || '',
    },
    recipients: {
      to: [{ address: options.to }],
    },
  };

  logger.info(`[ACS Email Service] SIMULATION: Sending email to ${options.to} with subject: ${options.subject}`);
  
  const poller = await simulationClient.beginSend(emailMessage);
  await poller.pollUntilDone();
  
  logger.info(`[ACS Email Service] SIMULATION: Email simulation completed for ${options.to}`);
};

/**
 * Send password reset OTP email
 * @param email - Recipient email address
 * @param otp - One-time password
 * @param userName - User's name for personalization
 */
export const sendPasswordResetOTP = async (
  email: string, 
  otp: string, 
  userName?: string
): Promise<void> => {
  const displayName = userName || 'User';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
            }
            .content {
                padding: 30px;
            }
            .otp-container {
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white;
                font-size: 32px;
                font-weight: bold;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                margin: 30px 0;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                color: #856404;
                padding: 15px;
                margin: 20px 0;
            }
            .info-box {
                background-color: #e3f2fd;
                border: 1px solid #bbdefb;
                border-radius: 5px;
                color: #0d47a1;
                padding: 15px;
                margin: 20px 0;
            }
            .footer {
                background-color: #f8f9fa;
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-size: 14px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Rehouzd</div>
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hello <strong>${displayName}</strong>,</p>
                
                <p>We received a request to reset your password for your Rehouzd account. Please use the following One-Time Password (OTP) to complete your password reset:</p>
                
                <div class="otp-container">${otp}</div>
                
                <div class="info-box">
                    <strong>Important:</strong> This OTP is valid for <strong>10 minutes only</strong>.
                </div>
                
                <div class="warning">
                    <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure and no changes have been made.
                </div>
                
                <p>For security reasons, please do not share this OTP with anyone. Our team will never ask for your OTP over the phone or email.</p>
                
                <p>If you continue to have trouble accessing your account, please contact our support team.</p>
                
                <p>Best regards,<br>
                <strong>The Rehouzd Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2025 Rehouzd. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
    Password Reset Request - Rehouzd
    
    Hello ${displayName},
    
    We received a request to reset your password for your Rehouzd account.
    
    Your One-Time Password (OTP) is: ${otp}
    
    This OTP is valid for 10 minutes only.
    
    Security Notice: If you didn't request this password reset, please ignore this email. Your account remains secure.
    
    For security reasons, please do not share this OTP with anyone.
    
    Best regards,
    The Rehouzd Team
    
    This is an automated message. Please do not reply to this email.
  `;

  await sendACSEmail({
    to: email,
    subject: 'Reset Your Rehouzd Password - OTP Verification',
    htmlContent,
    textContent,
  });
};

/**
 * Send callback confirmation email using ACS
 * @param email - User's email address
 * @param userName - User's name
 * @param phoneNumber - Phone number for callback
 */
export const sendCallbackConfirmationEmail = async (
  email: string,
  userName: string,
  phoneNumber: string
): Promise<void> => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
            }
            .content {
                padding: 30px;
            }
            .confirmation-box {
                background: linear-gradient(135deg, #d4edda, #c3e6cb);
                border: 2px solid #28a745;
                color: #155724;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: center;
                font-size: 18px;
                font-weight: bold;
            }
            .info-box {
                background-color: #e3f2fd;
                border: 1px solid #bbdefb;
                color: #0d47a1;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .steps {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                background-color: #f8f9fa;
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-size: 14px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: white;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Rehouzd</div>
                <h1>Callback Request Confirmed</h1>
            </div>
            <div class="content">
                <p>Hello <strong>${userName}</strong>,</p>
                
                <div class="confirmation-box">
                    Your callback request has been successfully received!
                </div>
                
                <p>Thank you for requesting a specialist callback from Rehouzd. We've received your request and our team will contact you shortly.</p>
                
                <div class="info-box">
                    <strong>Callback Details:</strong><br>
                    Phone Number: <strong>${phoneNumber}</strong><br>
                    Requested: <strong>${new Date().toLocaleString('en-US', { 
                      timeZone: 'America/Chicago',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })} CST</strong>
                </div>
                
                <div class="steps">
                    <p><strong>What happens next?</strong></p>
                    <ul>
                        <li>Our specialist will review your request</li>
                        <li>You'll receive a call within the next business day</li>
                        <li>We'll discuss your property needs and answer any questions</li>
                        <li>Get personalized recommendations for your situation</li>
                    </ul>
                </div>
                
                <p>If you have any immediate questions, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>
                <strong>The Rehouzd Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2025 Rehouzd. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
    Callback Request Confirmed - Rehouzd
    
    Hello ${userName},
    
    Your callback request has been successfully received!
    
    Thank you for requesting a specialist callback from Rehouzd. We've received your request and our team will contact you shortly.
    
    Callback Details:
    Phone Number: ${phoneNumber}
    Requested: ${new Date().toLocaleString('en-US', { 
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })} CST
    
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

  await sendACSEmail({
    to: email,
    subject: 'Rehouzd Callback Request Confirmed',
    htmlContent,
    textContent,
  });
};

/**
 * Send callback admin notification using ACS
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
  propertyAddress: string = '',
  userId?: number
): Promise<void> => {
  const subject = `New Callback Request from ${userName}${propertyAddress ? ` - ${propertyAddress}` : ''}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #ddd; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
            .detail-box { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Callback Request</h1>
                <p>Requires Admin Review</p>
            </div>
            
            <div class="content">
                <div class="urgent">
                    <strong>Priority Request:</strong> New specialist callback request submitted
                </div>
                
                <div class="detail-box">
                    <h3>Request Information:</h3>
                    <p><strong>Service Type:</strong> Specialist Callback</p>
                    ${propertyAddress ? `<p><strong>Property Address:</strong> ${propertyAddress}</p>` : ''}
                    <p><strong>Phone Number:</strong> ${phoneNumber}</p>
                    <p><strong>Request Time:</strong> ${new Date().toLocaleString('en-US', { 
                      timeZone: 'America/Chicago',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })} CST</p>
                </div>
                
                <div class="detail-box">
                    <h3>Customer Information:</h3>
                    <p><strong>Name:</strong> ${userName}</p>
                    <p><strong>Email:</strong> ${userEmail}</p>
                    <p><strong>User ID:</strong> ${userId || 'Anonymous'}</p>
                </div>
                
                <div class="urgent">
                    <h3>Action Required:</h3>
                    <ul>
                        <li>Review the customer's profile and requirements</li>
                        ${propertyAddress ? '<li>Research the specific property mentioned</li>' : ''}
                        <li>Schedule a callback within the next business day</li>
                        <li>Follow up with personalized recommendations</li>
                        <li>Respond to customer within 24-48 hours</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>Rehouzd Admin Panel - Callback Request</p>
                <p>© ${new Date().getFullYear()} Rehouzd. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const textContent = `
    NEW CALLBACK REQUEST - REQUIRES ADMIN REVIEW
    
    Priority Request: New specialist callback request submitted and requires review.
    
    REQUEST INFORMATION:
    - Service Type: Specialist Callback
    ${propertyAddress ? `- Property Address: ${propertyAddress}` : ''}
    - Phone Number: ${phoneNumber}
    - Request Time: ${new Date().toLocaleString('en-US', { 
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })} CST
    
    CUSTOMER INFORMATION:
    - Name: ${userName}
    - Email: ${userEmail}
    - User ID: ${userId || 'Anonymous'}
    
            ACTION REQUIRED:
    - Review the customer's profile and requirements
    ${propertyAddress ? '- Research the specific property mentioned' : ''}
    - Schedule a callback within the next business day
    - Follow up with personalized recommendations
    - Respond to customer within 24-48 hours
    
    Rehouzd Admin Panel - Callback Request
    © ${new Date().getFullYear()} Rehouzd. All rights reserved.
  `;

  await sendACSEmail({
    to: adminEmail,
    subject,
    htmlContent,
    textContent,
  });
}; 
