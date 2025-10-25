import * as specialistModel from '../../models/specialistCallback/specialistModel';
import * as userModel from '../../models/auth/userModel';
import { sendCallbackConfirmationEmail, sendCallbackAdminNotification } from '../acsEmailService';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface SpecialistResult {
  success: boolean;
  message: string;
  id?: number;
  code?: number;
}

/**
 * Get all specialist call requests with user details
 */
export const getAllSpecialistCalls = async (): Promise<any[]> => {
  try {
    return await specialistModel.getAllSpecialistCallsWithUser();
  } catch (error) {
    console.error('Error getting all specialist calls:', error);
    throw error;
  }
};

/**
 * Get latest specialist call requests (one per user)
 */
export const getLatestSpecialistCalls = async (): Promise<any[]> => {
  try {
    return await specialistModel.getDistinctSpecialistCalls();
  } catch (error) {
    console.error('Error getting latest specialist calls:', error);
    throw error;
  }
};

/**
 * Create a new specialist call request
 * @param userId - The user ID (can be null for anonymous requests)
 * @param mobileNumber - The mobile number to call back
 * @param propertyAddress - The property address for context
 * @param requestedAt - Optional timestamp for when the request was made
 */
export const createSpecialistCallRequest = async (
  userId: number | null,
  mobileNumber: number | string,
  propertyAddress: string = '',
  requestedAt?: string
): Promise<SpecialistResult> => {
  try {
    // For authenticated users, check and update mobile number if needed
    if (userId) {
      try {
        const mobileNumberAsNumber = typeof mobileNumber === 'string' 
          ? parseInt(mobileNumber as string) 
          : mobileNumber;
          
        await userModel.checkAndUpdateMobileNumber(userId, mobileNumberAsNumber);
      } catch (updateError) {
        console.error('Error updating user mobile number:', updateError);
        // Continue even if the update fails
      }
    }

    // Save specialist call
    const callId = await specialistModel.saveSpecialistCall({
      user_id: userId || 0, // Use 0 for anonymous users
      mobile_number: mobileNumber,
      requested_at: requestedAt
    });

    // Send emails in background
    setImmediate(async () => {
      // Get user details for email notifications (only for authenticated users)
      if (userId) {
        try {
          const email = await userModel.getUserEmailById(userId);
          const userDetails = await userModel.getUserById(userId);
          const userName = userDetails?.first_name || userDetails?.username || 'Valued Customer';
          
          // Send confirmation email to user if email exists
          if (email) {
            await sendCallbackConfirmationEmail(
              email,
              userName,
              mobileNumber.toString()
            );
            console.log(`Confirmation email sent to user: ${email}`);
          }

          // Send notification email to admin with property address
          const adminEmail = process.env.ADMIN_EMAIL || 'deal@rehouzd.com';
          await sendCallbackAdminNotification(
            adminEmail,
            userName,
            email || 'unknown@example.com',
            mobileNumber.toString(),
            propertyAddress,
            userId
          );
          console.log('Admin notification email sent');

        } catch (emailError) {
          console.error('Error sending emails:', emailError);
        }
      } else {
        // For anonymous users, still send admin notification
        try {
          const adminEmail = process.env.ADMIN_EMAIL || 'deal@rehouzd.com';
          await sendCallbackAdminNotification(
            adminEmail,
            'Anonymous User',
            'Not available',
            mobileNumber.toString(),
            propertyAddress
          );
          console.log('Admin notification email sent for anonymous user');
        } catch (emailError) {
          console.error('Error sending admin notification for anonymous user:', emailError);
        }
      }
    });

    return {
      success: true,
      message: 'Specialist call saved successfully',
      id: callId
    };
  } catch (error: any) {
    console.error('Error creating specialist call request:', error);
    return {
      success: false,
      message: `Failed to save specialist call: ${error.message}`,
      code: 500
    };
  }
};