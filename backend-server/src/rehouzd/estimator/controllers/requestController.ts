import { Request, Response } from 'express';
import { OfferMatchingRequestModel, CreateOfferMatchingRequestData } from '../models/requests/offerMatchingRequestModel';
import { UnderwriteRequestModel, CreateUnderwriteRequestData } from '../models/requests/underwriteRequestModel';
import { OfferRequestModel, CreateOfferRequestData } from '../models/requests/offerRequestModel';
import { sendACSEmail } from '../services/acsEmailService';
import { consumeCredits, canPerformAction } from '../services/credit/creditService';
import logger from '../utils/logger';
import { getUserById } from '../models/auth/authModel';
import azureBlobService from '../utils/storage/azureBlobService';
import { v4 as uuidv4 } from 'uuid';

export class RequestController {
    /**
     * Create a new offer matching request
     */
    async createOfferMatchingRequest(req: Request, res: Response): Promise<void> {
        try {
            const { user_id, first_name, last_name, phone_number, property_address }: {
                user_id?: number;
                first_name: string;
                last_name: string;
                phone_number: string;
                property_address?: string;
            } = req.body;

            // Validate required fields
            if (!first_name || !last_name || !phone_number) {
                res.status(400).json({
                    success: false,
                    message: 'First name, last name, and phone number are required'
                });
                return;
            }

            // If no user_id provided, we need to handle guest users differently
            if (!user_id) {
                res.status(400).json({
                    success: false,
                    message: 'User must be logged in to request offer matching services'
                });
                return;
            }

            const requestData: CreateOfferMatchingRequestData = {
                user_id,
                phone_number,
                property_address,
                notes: `Request from ${first_name} ${last_name}`
            };

            // Save to database
            const newRequest = await OfferMatchingRequestModel.create(requestData);

            logger.info(`[Request Controller] Offer matching request created: ${newRequest.request_id}`);

            // Send immediate response to user
            res.status(201).json({
                success: true,
                message: 'Offer matching request submitted successfully',
                data: newRequest
            });

            // Send admin notification email in the background (non-blocking)
            setImmediate(async () => {
                try {
                    // Get full request data with user details for email
                    const fullRequest = await OfferMatchingRequestModel.getById(newRequest.request_id!);

                    if (fullRequest) {
                        await this.sendOfferMatchingAdminNotification(fullRequest);
                        logger.info(`[Request Controller] Background email sent for offer matching request: ${newRequest.request_id}`);
                    }
                } catch (emailError) {
                    logger.error(`[Request Controller] Failed to send background email for offer matching request ${newRequest.request_id}:`, emailError);
                }
            });

        } catch (error) {
            logger.error('[Request Controller] Error creating offer matching request:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to submit offer matching request'
            });
        }
    }

    /**
     * Create a new underwrite request
     */
    async createUnderwriteRequest(req: Request, res: Response): Promise<void> {
        const {
            user_id,
            property_address,
            estimated_price,
            notes,
            property_beds,
            property_baths,
            property_sqft,
            property_year,
            photo_url,
            images_data,
            email
        }: CreateUnderwriteRequestData = req.body;

        // Validate required fields - removed all user and credit validation constraints
        if (!property_address || !estimated_price || !notes) {
            res.status(400).json({
                success: false,
                message: 'Property address, estimated price, and notes are required'
            });
            return;
        }

        // Validate email format if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ success: false, message: 'Invalid email format' });
            return;
        }

        // Capture user data for email (before DB operations)
        let user: any = null;
        if (user_id) {
            try {
                user = await getUserById(user_id);
            } catch (error) {
                logger.warn(`[Request Controller] User ${user_id} not found for underwrite request, continuing without user data`);
            }
        }

        // Prepare email data from in-memory request data
        const emailData = {
            request_id: null as any,
            user_id,
            property_address,
            estimated_price,
            notes,
            property_beds,
            property_baths,
            property_sqft,
            property_year,
            photo_url,
            images_data,
            created_at: new Date(),
            user_email: email || user?.email || 'unknown@rehouzd.com',
            user_first_name: user?.first_name || 'Unknown',
            user_last_name: user?.last_name || 'User'
        };

        let dbSuccess = false;
        let newRequest: any = null;

        try {
            // Credit check disabled - removed all credit constraints
            // const creditCheck = await canPerformAction(user_id, 'UNDERWRITE_REQUEST');
            // if (!creditCheck.canPerform) {
            //     res.status(402).json({
            //         success: false,
            //         message: 'Insufficient credits for underwrite request',
            //         data: {
            //             requiredCredits: creditCheck.requiredCredits,
            //             availableCredits: creditCheck.availableCredits,
            //             creditMessage: creditCheck.message
            //         }
            //     });
            //     return;
            // }

            const requestData: CreateUnderwriteRequestData = {
                user_id,
                property_address,
                estimated_price,
                notes,
                property_beds,
                property_baths,
                property_sqft,
                property_year,
                photo_url,
                images_data
            };

            // Save to database
            newRequest = await UnderwriteRequestModel.create(requestData);
            emailData.request_id = newRequest.request_id;
            dbSuccess = true;

            // Move blobs from multiple temp subfolders to final subfolder if images exist
            let updatedImagesData = images_data;
            if (images_data && images_data.length > 0) {
                try {
                    // Generate final subfolder name using the same method as upload
                    let finalSubfolder;

                    if (user) {
                        // Use username and request ID for final subfolder naming
                        const username = user.email.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                        finalSubfolder = `underwrite/${username}-request-${newRequest.request_id}`;
                    } else {
                        // Fallback to simple naming with request ID
                        finalSubfolder = `underwrite/user-${user_id || 'anonymous'}-request-${newRequest.request_id}`;
                    }

                    logger.info(`Moving underwrite blobs from multiple temp subfolders to final subfolder "${finalSubfolder}"`);

                    // Move the blobs from all temp subfolders
                    const moveResult = await azureBlobService.moveBlobsFromMultipleTempToFinal(
                        'rehouzd-media',
                        finalSubfolder,
                        images_data
                    );

                    if (moveResult.success) {
                        updatedImagesData = moveResult.updatedImagesData;
                        logger.info(`Successfully moved underwrite blobs and updated ${updatedImagesData.length} image URLs`);

                        // Update the database record with new image URLs
                        await UnderwriteRequestModel.updateImagesData(newRequest.request_id!, updatedImagesData);
                    } else {
                        logger.error(`Failed to move underwrite blobs: ${moveResult.error}`);
                        // Continue with the request even if blob move fails
                    }
                } catch (moveError) {
                    logger.error('Error during underwrite blob move operation:', moveError);
                    // Continue with the request even if blob move fails
                }
            }

            // Credit consumption disabled - removed all credit constraints
            // const creditResult = await consumeCredits(
            //     user_id,
            //     'UNDERWRITE_REQUEST',
            //     newRequest.request_id,
            //     'underwrite_requests',
            //     {
            //         property_address,
            //         estimated_price,
            //         request_type: 'underwrite'
            //     }
            // );

            // if (!creditResult.success) {
            //     logger.error(`[Request Controller] Failed to consume credits for underwrite request ${newRequest.request_id}: ${creditResult.message}`);
            //     // Note: We don't fail the request here since it's already created
            //     // But we should handle this in production (e.g., refund, alert admin)
            // } else {
            //     logger.info(`[Request Controller] Credits consumed for underwrite request ${newRequest.request_id}. New balance: ${creditResult.newBalance}`);
            // }

            // Mock credit result for response compatibility
            const creditResult = { success: true, newBalance: 0, transactionId: null };

            logger.info(`[Request Controller] Underwrite request created: ${newRequest.request_id}`);

            // Send immediate response to user
            res.status(201).json({
                success: true,
                message: 'Underwrite request submitted successfully',
                data: {
                    ...newRequest,
                    creditInfo: {
                        consumed: creditResult.success,
                        newBalance: creditResult.newBalance,
                        transactionId: creditResult.transactionId
                    }
                }
            });

        } catch (error) {
            logger.error('[Request Controller] Error creating underwrite request:', error);

            // Generate temporary ID if DB insert failed
            if (!emailData.request_id) {
                emailData.request_id = `temp-${uuidv4()}`;
            }

            res.status(500).json({
                success: false,
                message: 'Failed to submit underwrite request'
            });
        } finally {
            // Send admin notification email in the background (non-blocking) - ALWAYS runs
            setImmediate(async () => {
                try {
                    // Send admin notification first
                    await this.sendUnderwriteAdminNotification(emailData);
                    logger.info(`[Request Controller] Admin email sent for underwrite request: ${emailData.request_id} (DB ${dbSuccess ? 'success' : 'failed'})`);

                    // Then send user confirmation email
                    await this.sendUnderwriteUserConfirmation(emailData);
                    logger.info(`[Request Controller] User confirmation email sent for underwrite request: ${emailData.request_id} (DB ${dbSuccess ? 'success' : 'failed'})`);
                } catch (emailError) {
                    logger.error(`[Request Controller] Failed to send background email for underwrite request ${emailData.request_id}:`, emailError);
                }
            });
        }
    }

    /**
     * Create a new offer request using property_images table
     */
    async createOfferRequest(req: Request, res: Response): Promise<void> {
        const {
            user_id,
            property_address,
            targetPrice,
            notes,
            property_beds,
            property_baths,
            property_sqft,
            property_year,
            photoURL,
            photos,
            email
        }: {
            user_id?: number;
            property_address: string;
            targetPrice: string;
            notes: string;
            property_beds?: string;
            property_baths?: string;
            property_sqft?: string;
            property_year?: string;
            photoURL?: string;
            photos?: any[];
            email?: string;
        } = req.body;

        // Validate required fields - removed all user validation and constraints
        if (!property_address || !targetPrice || !notes) {
            res.status(400).json({
                success: false,
                message: 'Property address, target price, and notes are required'
            });
            return;
        }

        // Validate email format if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ success: false, message: 'Invalid email format' });
            return;
        }

        // Capture user data and request metadata for email (before DB operations)
        let user: any = null;
        if (user_id) {
            try {
                user = await getUserById(user_id);
            } catch (error) {
                logger.warn(`[Request Controller] User ${user_id} not found, continuing without user data`);
            }
        }

        // Prepare email data from in-memory request data
        const emailData = {
            id: null as any,
            user_id,
            property_address,
            target_price: targetPrice,
            notes,
            property_beds,
            property_baths,
            property_sqft,
            property_year,
            photo_url: photoURL,
            images_data: photos,
            created_at: new Date(),
            user_email: email || user?.email || 'unknown@rehouzd.com',
            user_first_name: user?.first_name || 'Unknown',
            user_last_name: user?.last_name || 'User'
        };

        let dbSuccess = false;
        let newRequest: any = null;

        try {
            // Credit check disabled - New UI doesn't use credit system
            // const creditCheck = await canPerformAction(user_id, 'OFFER_REQUEST');
            // if (!creditCheck.canPerform) {
            //     res.status(402).json({
            //         success: false,
            //         message: 'Insufficient credits for offer request',
            //         data: {
            //             requiredCredits: creditCheck.requiredCredits,
            //             availableCredits: creditCheck.availableCredits,
            //             creditMessage: creditCheck.message
            //         }
            //     });
            //     return;
            // }

            // Calculate image count and prepare container name
            const imageCount = photos ? photos.length : 0;
            const hasPhotoURL = photoURL && photoURL.trim() ? 1 : 0;
            const totalImageCount = imageCount + hasPhotoURL;

            // Generate final subfolder name for get offer images (same as what will be used after blob move)
            let finalSubfolder;

            if (user) {
                // Use username for final subfolder naming (request ID will be added after database creation)
                const username = user.email.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                finalSubfolder = `getoffer/${username}-request`;
            } else {
                // Fallback to simple naming
                finalSubfolder = `getoffer/user-${user_id || 'anonymous'}-request`;
            }

            // Use the final subfolder pattern as container name for consistency
            const containerName = finalSubfolder;

            const requestData: CreateOfferRequestData = {
                user_id,
                property_address,
                target_price: targetPrice,
                notes,
                property_beds,
                property_baths,
                property_sqft,
                property_year,
                photo_url: photoURL,
                images_data: photos,
                container_name: containerName,
                image_count: totalImageCount
            };

            // Save to database using property_images table
            newRequest = await OfferRequestModel.create(requestData);
            emailData.id = newRequest.id;
            dbSuccess = true;

            // Move blobs from multiple temp subfolders to final subfolder if images exist
            let updatedImagesData = photos;
            if (photos && photos.length > 0) {
                try {
                    // Generate final subfolder name with request ID
                    let finalSubfolder;

                    if (user) {
                        // Use username and request ID for final subfolder naming
                        const username = user.email.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                        finalSubfolder = `getoffer/${username}-request-${newRequest.id}`;
                    } else {
                        // Fallback to simple naming with request ID
                        finalSubfolder = `getoffer/user-${user_id || 'anonymous'}-request-${newRequest.id}`;
                    }

                    logger.info(`Moving get offer blobs from multiple temp subfolders to final subfolder "${finalSubfolder}"`);

                    // Move the blobs from all temp subfolders
                    const moveResult = await azureBlobService.moveBlobsFromMultipleTempToFinal(
                        'rehouzd-media',
                        finalSubfolder,
                        photos
                    );

                    if (moveResult.success) {
                        updatedImagesData = moveResult.updatedImagesData;
                        logger.info(`Successfully moved get offer blobs and updated ${updatedImagesData.length} image URLs`);

                        // Update the database record with new image URLs and final container name
                        await OfferRequestModel.updateImagesData(newRequest.id!, updatedImagesData);
                        await OfferRequestModel.updateContainerName(newRequest.id!, finalSubfolder);
                    } else {
                        logger.error(`Failed to move get offer blobs: ${moveResult.error}`);
                        // Continue with the request even if blob move fails
                    }
                } catch (moveError) {
                    logger.error('Error during get offer blob move operation:', moveError);
                    // Continue with the request even if blob move fails
                }
            }

            // Credit consumption disabled - New UI doesn't use credit system
            // const creditResult = await consumeCredits(
            //     user_id,
            //     'OFFER_REQUEST',
            //     newRequest.id,
            //     'property_images',
            //     {
            //         property_address,
            //         target_price: targetPrice,
            //         request_type: 'getoffer'
            //     }
            // );

            // if (!creditResult.success) {
            //     logger.error(`[Request Controller] Failed to consume credits for offer request ${newRequest.id}: ${creditResult.message}`);
            // } else {
            //     logger.info(`[Request Controller] Credits consumed for offer request ${newRequest.id}. New balance: ${creditResult.newBalance}`);
            // }

            // Mock credit result for response compatibility
            const creditResult = { success: true, newBalance: 0, transactionId: null };

            logger.info(`[Request Controller] Offer request created using property_images table: ${newRequest.id}`);

            // Send immediate response to user
            res.status(201).json({
                success: true,
                message: 'Offer request submitted successfully',
                data: {
                    ...newRequest,
                    creditInfo: {
                        consumed: creditResult.success,
                        newBalance: creditResult.newBalance,
                        transactionId: creditResult.transactionId
                    }
                }
            });

        } catch (error) {
            logger.error('[Request Controller] Error creating offer request:', error);

            // Generate temporary ID if DB insert failed
            if (!emailData.id) {
                emailData.id = `temp-${uuidv4()}`;
            }

            res.status(500).json({
                success: false,
                message: 'Failed to submit offer request'
            });
        } finally {
            // Send admin notification email in the background (non-blocking) - ALWAYS runs
            setImmediate(async () => {
                try {
                    // Send admin notification first
                    await this.sendOfferAdminNotification(emailData);
                    logger.info(`[Request Controller] Admin email sent for offer request: ${emailData.id} (DB ${dbSuccess ? 'success' : 'failed'})`);

                    // Then send user confirmation email
                    await this.sendOfferUserConfirmation(emailData);
                    logger.info(`[Request Controller] User confirmation email sent for offer request: ${emailData.id} (DB ${dbSuccess ? 'success' : 'failed'})`);
                } catch (emailError) {
                    logger.error(`[Request Controller] Failed to send background email for offer request ${emailData.id}:`, emailError);
                }
            });
        }
    }

    /**
     * Get all offer matching requests (admin)
     */
    async getAllOfferMatchingRequests(req: Request, res: Response): Promise<void> {
        try {
            const requests = await OfferMatchingRequestModel.getAll();
            
            res.status(200).json({
                success: true,
                data: requests
            });

        } catch (error) {
            logger.error('[Request Controller] Error fetching offer matching requests:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch offer matching requests'
            });
        }
    }

    /**
     * Get all offer requests (admin) using property_images table
     */
    async getAllOfferRequests(req: Request, res: Response): Promise<void> {
        try {
            const requests = await OfferRequestModel.getAll();
            
            res.status(200).json({
                success: true,
                data: requests
            });

        } catch (error) {
            logger.error('[Request Controller] Error fetching offer requests:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch offer requests'
            });
        }
    }

    /**
     * Get all underwrite requests (admin)
     */
    async getAllUnderwriteRequests(req: Request, res: Response): Promise<void> {
        try {
            const requests = await UnderwriteRequestModel.getAll();
            
            res.status(200).json({
                success: true,
                data: requests
            });

        } catch (error) {
            logger.error('[Request Controller] Error fetching underwrite requests:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch underwrite requests'
            });
        }
    }

    /**
     * Get offer sourcing request status for a specific user
     */
    async getOfferSourcingStatus(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            
            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
                return;
            }

            const userIdNumber = parseInt(userId);
            if (isNaN(userIdNumber)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
                return;
            }

            // Get all offer matching requests for this user
            const requests = await OfferMatchingRequestModel.getByUserId(userIdNumber);
            
            // Check if user has any pending or approved requests
            const activeRequest = requests.find(request => 
                request.status === 'pending' || 
                request.status === 'approved' || 
                request.status === 'in_progress'
            );

            if (activeRequest) {
                res.status(200).json({
                    success: true,
                    data: {
                        hasActiveRequest: true,
                        status: activeRequest.status,
                        submitted_at: activeRequest.created_at,
                        request_id: activeRequest.request_id
                    }
                });
            } else {
                res.status(200).json({
                    success: true,
                    data: null // No active request found
                });
            }

        } catch (error) {
            logger.error('[Request Controller] Error fetching offer sourcing status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch offer sourcing status'
            });
        }
    }

    /**
     * Send admin notification for offer matching request
     */
    private async sendOfferMatchingAdminNotification(request: any): Promise<void> {
        try {
            const subject = `New Offer Matching Request - ${request.property_address || 'Property Address Not Provided'}`;
            
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
                            <h1>New Offer Matching Request</h1>
                            <p>Requires Admin Review</p>
                        </div>
                        
                        <div class="content">
                            <div class="urgent">
                                <strong>Priority Request:</strong> New offer matching request submitted
                            </div>
                            
                            <div class="detail-box">
                                <h3>Request Information:</h3>
                                <p><strong>Request ID:</strong> ${request.request_id}</p>
                                <p><strong>Property Address:</strong> ${request.property_address || 'Not provided'}</p>
                                <p><strong>Submission Time:</strong> ${new Date(request.created_at).toLocaleString()}</p>
                                <p><strong>Status:</strong> ${request.status || 'Pending'}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Customer Information:</h3>
                                <p><strong>Name:</strong> ${request.user_first_name} ${request.user_last_name}</p>
                                <p><strong>Email:</strong> ${request.user_email}</p>
                                <p><strong>Phone:</strong> ${request.phone_number || request.user_mobile_number || 'Not provided'}</p>
                                <p><strong>User ID:</strong> ${request.user_id}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Notes:</h3>
                                <p>${request.notes || 'No additional notes provided'}</p>
                            </div>
                            
                            <div class="urgent">
                                <h3>Action Required:</h3>
                                <ul>
                                    <li>Review the offer matching request</li>
                                    <li>Contact the customer to discuss their requirements</li>
                                    <li>Source qualified offers for the property</li>
                                    <li>Respond to customer within 24-48 hours</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>Rehouzd Admin Panel - Offer Matching Request</p>
                            <p>© ${new Date().getFullYear()} Rehouzd. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const textContent = `
                NEW OFFER MATCHING REQUEST - REQUIRES ADMIN REVIEW
                
                Priority Request: New offer matching request submitted and requires review.
                
                REQUEST INFORMATION:
                - Request ID: ${request.request_id}
                - Property Address: ${request.property_address || 'Not provided'}
                - Submission Time: ${new Date(request.created_at).toLocaleString()}
                - Status: ${request.status || 'Pending'}
                
                CUSTOMER INFORMATION:
                - Name: ${request.user_first_name} ${request.user_last_name}
                - Email: ${request.user_email}
                - Phone: ${request.phone_number || request.user_mobile_number || 'Not provided'}
                - User ID: ${request.user_id}
                
                NOTES:
                ${request.notes || 'No additional notes provided'}
                
                ACTION REQUIRED:
                - Review the offer matching request
                - Contact the customer to discuss their requirements
                - Source qualified offers for the property
                - Respond to customer within 24-48 hours
                
                Rehouzd Admin Panel - Offer Matching Request
                © ${new Date().getFullYear()} Rehouzd. All rights reserved.
            `;

            await sendACSEmail({
                to: process.env.ADMIN_EMAIL || 'admin@rehouzd.com',
                subject,
                htmlContent,
                textContent
            });

            logger.info(`[Request Controller] Admin notification sent for offer matching request: ${request.request_id}`);

        } catch (error) {
            logger.error('[Request Controller] Error sending offer matching admin notification:', error);
        }
    }

    /**
     * Send user confirmation email for underwrite request
     */
    private async sendUnderwriteUserConfirmation(request: any): Promise<void> {
        try {
            const subject = `Underwrite Request Received - ${request.property_address}`;
            
            // Format submission time
            const submissionTime = new Date(request.created_at).toLocaleString('en-US', {
                timeZone: 'America/Chicago',
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            // Format target price if available
            const targetPriceSection = request.estimated_price ? `
                <tr>
                    <td colspan="2" style="padding:0 0 12px;font-size:14px;">
                        <strong style="color:#555;">Target Offer Price:</strong> ${request.estimated_price}
                    </td>
                </tr>
            ` : '';
            
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>Underwrite Request Received</title>
                </head>
                <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:0 0 40px;">
                        <tr>
                            <td align="center">
                                <!-- Card -->
                                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
                                    <!-- Brand bar -->
                                    <tr>
                                        <td style="background:#15945f;height:6px;font-size:0;line-height:0;"></td>
                                    </tr>

                                    <!-- Header -->
                                    <tr>
                                        <td style="padding:32px 40px 24px;">
                                            <h1 style="margin:0;font-size:24px;font-weight:600;color:#15945f;text-align:center;">
                                                Your underwrite request is in!
                                            </h1>
                                            <p style="margin:16px 0 0;text-align:center;font-size:16px;line-height:24px;">
                                                <strong>Rehouzd</strong><br> will run the numbers so you can run to the <strong>bank</strong>.<br>
                                                Our analysts are already on it and will send your full valuation soon.
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Divider -->
                                    <tr>
                                        <td style="padding:0 40px;">
                                            <hr style="border:none;border-top:1px solid #e0e4e7;margin:0;">
                                        </td>
                                    </tr>

                                    <!-- Request details -->
                                    <tr>
                                        <td style="padding:24px 40px;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Request ID:</strong> ${request.request_id}
                                                    </td>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Submitted:</strong> ${submissionTime}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colspan="2" style="padding:0 0 12px;font-size:14px;">
                                                        <strong style="color:#555;">Property Address:</strong><br>
                                                        ${request.property_address}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Bed:</strong> ${request.property_beds || 'N/A'}
                                                    </td>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Sqft:</strong> ${request.property_sqft ? parseInt(request.property_sqft).toLocaleString() : 'N/A'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Bath:</strong> ${request.property_baths || 'N/A'}
                                                    </td>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Year:</strong> ${request.property_year || 'N/A'}
                                                    </td>
                                                </tr>
                                                ${targetPriceSection}
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- What happens next -->
                                    <tr>
                                        <td style="padding:0 40px 24px;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="background:#f1f9f6;border-left:4px solid #15945f;border-radius:4px;padding:20px;">
                                                        <h2 style="margin:0 0 12px;font-size:16px;color:#15945f;">What happens next?</h2>
                                                        <ul style="margin:0;padding-left:20px;font-size:14px;line-height:22px;">
                                                            <li>Our underwriting team reviews property details &amp; photos.</li>
                                                            <li>You'll receive a full report <strong>within 24 – 48 hrs</strong>.</li>
                                                            <li>Once complete, you can download the PDF and share it with buyers.</li>
                                                        </ul>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="background:#f7f9fa;padding:24px 40px;font-size:12px;text-align:center;color:#6b6e76;">
                                            Questions? Email Deal@rehouzd.com or call us at (310) 689‑8695.<br><br>
                                            © 2025 Rehouzd. All rights reserved.
                                        </td>
                                    </tr>
                                </table>
                                <!-- /Card -->
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

            const textContent = `
                Underwrite Request Received - Rehouzd
                
                Your underwrite request is in!
                
                Rehouzd will run the numbers so you can run to the bank.
                Our analysts are already on it and will send your full valuation soon.
                
                Request Details:
                - Request ID: ${request.request_id}
                - Submitted: ${submissionTime}
                - Property Address: ${request.property_address}
                - Bed: ${request.property_beds || 'N/A'}                    
                - Sqft: ${request.property_sqft ? parseInt(request.property_sqft).toLocaleString() : 'N/A'}
                - Bath: ${request.property_baths || 'N/A'}                    
                - Year: ${request.property_year || 'N/A'}
                ${request.estimated_price ? `- Target Offer Price: $${request.estimated_price}` : ''}
                
                What happens next?
                - Our underwriting team reviews property details & photos
                - You'll receive a full report within 24 – 48 hrs
                - Once complete, you can download the PDF and share it with buyers
                
                Questions? Email Deal@rehouzd.com or call us at (310) 689‑8695
                
                © 2025 Rehouzd. All rights reserved.
            `;

            await sendACSEmail({
                to: request.user_email,
                subject,
                htmlContent,
                textContent
            });

            logger.info(`[Request Controller] User confirmation email sent for underwrite request: ${request.request_id}`);

        } catch (error) {
            logger.error('[Request Controller] Error sending underwrite user confirmation:', error);
        }
    }

    /**
     * Send admin notification for underwrite request
     */
    private async sendUnderwriteAdminNotification(request: any): Promise<void> {
        try {
            const subject = `New Underwrite Request - ${request.property_address}`;
            
            // Safely parse images data
            let imagesInfo = 'No images uploaded';
            let detailedImagesHtml = '<p>No images uploaded</p>';
            let detailedImagesText = 'No images uploaded';
            
            if (request.images_data) {
                try {
                    // Handle both string and object formats
                    const parsedImages = typeof request.images_data === 'string' 
                        ? JSON.parse(request.images_data)
                        : request.images_data;

                    if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                        imagesInfo = `${parsedImages.length} image(s) uploaded`;
                        
                        // Create detailed HTML list of images
                        detailedImagesHtml = parsedImages.map((img: any, index: number) => `
                            <div style="margin-bottom: 10px; padding: 8px; background: #f9f9f9; border-radius: 4px;">
                                <strong>${index + 1}. ${img.name || 'Unnamed image'}</strong><br>
                                <small>Type: ${img.type || 'unknown'}</small><br>
                                <a href="${img.url}" target="_blank" style="color: #007bff; text-decoration: none;">
                                    ${img.url}
                                </a>
                            </div>
                        `).join('');
                        
                        // Create detailed text list of images
                        detailedImagesText = parsedImages.map((img: any, index: number) => 
                            `${index + 1}. ${img.name || 'Unnamed image'} (${img.type || 'unknown'}): ${img.url}`
                        ).join('\n        ');
                    }
                } catch (parseError) {
                    console.warn('[Request Controller] Failed to parse images_data:', parseError);
                    imagesInfo = 'Images data available (parsing failed)';
                    detailedImagesHtml = '<p>Images data available but could not be parsed. Please check the database directly.</p>';
                    detailedImagesText = 'Images data available but could not be parsed. Please check the database directly.';
                }
            }
            
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
                        .price-highlight { font-size: 20px; font-weight: bold; color: #dc3545; }
                        .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>New Underwrite Request</h1>
                            <p>Requires Admin Review</p>
                        </div>
                        
                        <div class="content">
                            <div class="urgent">
                                <strong>Priority Request:</strong> New underwrite request submitted
                            </div>
                            
                            <div class="detail-box">
                                <h3>Request Information:</h3>
                                <p><strong>Request ID:</strong> ${request.request_id}</p>
                                <p><strong>Property Address:</strong> ${request.property_address}</p>
                                <p><strong>Estimated Price:</strong> <span class="price-highlight">${request.estimated_price}</span></p>
                                <p><strong>Submission Time:</strong> ${new Date(request.created_at).toLocaleString()}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Customer Information:</h3>
                                <p><strong>Name:</strong> ${request.user_first_name} ${request.user_last_name}</p>
                                <p><strong>Email:</strong> ${request.user_email}</p>
                                <p><strong>User ID:</strong> ${request.user_id}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Property Details:</h3>
                                <p><strong>Beds:</strong> ${request.property_beds || 'N/A'}</p>
                                <p><strong>Baths:</strong> ${request.property_baths || 'N/A'}</p>
                                <p><strong>Sqft:</strong> ${request.property_sqft || 'N/A'}</p>
                                <p><strong>Year:</strong> ${request.property_year || 'N/A'}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Customer Notes:</h3>
                                <p>${request.notes}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Images (${imagesInfo}):</h3>
                                ${detailedImagesHtml}
                            </div>
                            
                            <div class="urgent">
                                <h3>Action Required:</h3>
                                <ul>
                                    <li>Review the property details and uploaded images</li>
                                    <li>Process the underwrite request</li>
                                    <li>Respond to customer within 24-48 hours</li>
                                    <li>Contact customer if additional information is needed</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>Rehouzd Admin Panel - Underwrite Request</p>
                            <p>© ${new Date().getFullYear()} Rehouzd. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const textContent = `
                NEW UNDERWRITE REQUEST - REQUIRES ADMIN REVIEW
                
                Priority Request: New underwrite request submitted and requires review.
                
                REQUEST INFORMATION:
                - Request ID: ${request.request_id}
                - Property Address: ${request.property_address}
                - Estimated Price: ${request.estimated_price}
                - Submission Time: ${new Date(request.created_at).toLocaleString()}
                
                CUSTOMER INFORMATION:
                - Name: ${request.user_first_name} ${request.user_last_name}
                - Email: ${request.user_email}
                - User ID: ${request.user_id}
                
                PROPERTY DETAILS:
                - Beds: ${request.property_beds || 'N/A'}
                - Baths: ${request.property_baths || 'N/A'}
                - Sqft: ${request.property_sqft || 'N/A'}
                - Year: ${request.property_year || 'N/A'}
                
                CUSTOMER NOTES:
                ${request.notes}
                
                IMAGES (${imagesInfo}):
                ${detailedImagesText}
                
                ACTION REQUIRED:
                - Review the property details and uploaded images
                - Process the underwrite request
                - Respond to customer within 24-48 hours
                - Contact customer if additional information is needed
                
                Rehouzd Admin Panel - Underwrite Request
                © ${new Date().getFullYear()} Rehouzd. All rights reserved.
            `;

            await sendACSEmail({
                to: process.env.ADMIN_EMAIL || 'admin@rehouzd.com',
                subject,
                htmlContent,
                textContent
            });

            logger.info(`[Request Controller] Admin notification sent for underwrite request: ${request.request_id}`);

        } catch (error) {
            logger.error('[Request Controller] Error sending underwrite admin notification:', error);
        }
    }

    /**
     * Send user confirmation email for offer request
     */
    private async sendOfferUserConfirmation(request: any): Promise<void> {
        try {
            const subject = `Your Offers Are on the Way! - ${request.property_address}`;
            
            // Format submission time
            const submissionTime = new Date(request.created_at).toLocaleString('en-US', {
                timeZone: 'America/Chicago',
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            // Format target price if available
            const targetPriceSection = request.target_price ? `
                <tr>
                    <td colspan="2" style="padding:0 0 12px;font-size:14px;">
                        <strong style="color:#555;">Target Offer Price:</strong> ${request.target_price}
                    </td>
                </tr>
            ` : '';
            
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>Your Offers Are on the Way!</title>
                </head>
                <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:0 0 40px;">
                        <tr>
                            <td align="center">
                                <!-- Card -->
                                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
                                    <!-- Brand bar -->
                                    <tr>
                                        <td style="background:#15945f;height:6px;font-size:0;line-height:0;"></td>
                                    </tr>

                                    <!-- Header -->
                                    <tr>
                                        <td style="padding:32px 40px 24px;">
                                            <h1 style="margin:0;font-size:24px;font-weight:600;color:#15945f;text-align:center;">
                                                We're chasing down your offers!
                                            </h1>
                                            <p style="margin:16px 0 0;text-align:center;font-size:16px;line-height:24px;">
                                                Your property is already in front of our network of <strong>verified cash buyers</strong>.<br>
                                                Sit tight while we collect their best numbers.
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Divider -->
                                    <tr>
                                        <td style="padding:0 40px;">
                                            <hr style="border:none;border-top:1px solid #e0e4e7;margin:0;">
                                        </td>
                                    </tr>

                                    <!-- Request details -->
                                    <tr>
                                        <td style="padding:24px 40px;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Request ID:</strong> ${request.id}
                                                    </td>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Submitted:</strong> ${submissionTime}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colspan="2" style="padding:0 0 12px;font-size:14px;">
                                                        <strong style="color:#555;">Property Address:</strong><br>
                                                        ${request.property_address}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Bed:</strong> ${request.property_beds || 'N/A'}
                                                    </td>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Sqft:</strong> ${request.property_sqft ? parseInt(request.property_sqft).toLocaleString() : 'N/A'}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Bath:</strong> ${request.property_baths || 'N/A'}
                                                    </td>
                                                    <td style="padding:0 0 12px;font-size:14px;width:50%;">
                                                        <strong style="color:#555;">Year:</strong> ${request.property_year || 'N/A'}
                                                    </td>
                                                </tr>
                                                ${targetPriceSection}
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- What happens next -->
                                    <tr>
                                        <td style="padding:0 40px 24px;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="background:#f1f9f6;border-left:4px solid #15945f;border-radius:4px;padding:20px;">
                                                        <h2 style="margin:0 0 12px;font-size:16px;color:#15945f;">What happens next?</h2>
                                                        <ul style="margin:0;padding-left:20px;font-size:14px;line-height:22px;">
                                                            <li>We share your deal with buyers whose buy‑boxes match.</li>
                                                            <li>Buyers submit offers—usually within <strong>24‑48 hrs</strong>.</li>
                                                            <li>We verify funds &amp; filter out low‑ball bids.</li>
                                                            <li>You'll receive a clear offer summary to compare &amp; choose.</li>
                                                        </ul>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="background:#f7f9fa;padding:24px 40px;font-size:12px;text-align:center;color:#6b6e76;">
                                            Questions? Email Deal@rehouzd.com or call us at (310) 689‑8695.<br><br>
                                            © 2025 Rehouzd. All rights reserved.
                                        </td>
                                    </tr>
                                </table>
                                <!-- /Card -->
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

            const textContent = `
                Your Offers Are on the Way! - Rehouzd
                
                We're chasing down your offers!
                
                Your property is already in front of our network of verified cash buyers.
                Sit tight while we collect their best numbers.
                
                Request Details:
                - Request ID: ${request.id}
                - Submitted: ${submissionTime}
                - Property Address: ${request.property_address}
                - Bed: ${request.property_beds || 'N/A'}                    
                - Sqft: ${request.property_sqft ? parseInt(request.property_sqft).toLocaleString() : 'N/A'}
                - Bath: ${request.property_baths || 'N/A'}                    
                - Year: ${request.property_year || 'N/A'}
                ${request.target_price ? `- Target Offer Price: $${request.target_price}` : ''}
                
                What happens next?
                - We share your deal with buyers whose buy‑boxes match
                - Buyers submit offers—usually within 24‑48 hrs
                - We verify funds & filter out low‑ball bids
                - You'll receive a clear offer summary to compare & choose
                
                Questions? Email Deal@rehouzd.com or call us at (310) 689‑8695
                
                © 2025 Rehouzd. All rights reserved.
            `;

            await sendACSEmail({
                to: request.user_email,
                subject,
                htmlContent,
                textContent
            });

            logger.info(`[Request Controller] User confirmation email sent for offer request: ${request.id}`);

        } catch (error) {
            logger.error('[Request Controller] Error sending offer user confirmation:', error);
        }
    }

    /**
     * Send admin notification for offer request using property_images table
     */
    private async sendOfferAdminNotification(request: any): Promise<void> {
        try {
            const subject = `New Offer Request - ${request.property_address}`;
            
            // Safely parse images data
            let imagesInfo = 'No images uploaded';
            let detailedImagesHtml = '<p>No images uploaded</p>';
            let detailedImagesText = 'No images uploaded';
            
            if (request.images_data) {
                try {
                    // Handle both string and object formats
                    const parsedImages = typeof request.images_data === 'string' 
                        ? JSON.parse(request.images_data)
                        : request.images_data;
                    
                    if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                        imagesInfo = `${parsedImages.length} image(s) uploaded`;
                        
                        // Create detailed HTML list of images
                        detailedImagesHtml = parsedImages.map((img: any) => `
                            <div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                                <strong>${img.name || 'Unnamed image'}</strong> (${img.type || 'unknown'})<br>
                                <a href="${img.url}" target="_blank" style="color: #007bff; text-decoration: none;">
                                    ${img.url}
                                </a>
                            </div>
                        `).join('');
                        
                        // Create detailed text list of images
                        detailedImagesText = parsedImages.map((img: any, index: number) => 
                            `${index + 1}. ${img.name || 'Unnamed image'} (${img.type || 'unknown'}): ${img.url}`
                        ).join('\n        ');
                    }
                } catch (parseError) {
                    console.warn('[Request Controller] Failed to parse images_data:', parseError);
                    imagesInfo = 'Images data available (parsing failed)';
                    detailedImagesHtml = '<p>Images data available but could not be parsed. Please check the database directly.</p>';
                    detailedImagesText = 'Images data available but could not be parsed. Please check the database directly.';
                }
            }
            
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: white; padding: 30px; border: 1px solid #ddd; }
                        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                        .detail-box { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
                        .price-highlight { font-size: 20px; font-weight: bold; color: #28a745; }
                        .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>New Offer Request</h1>
                            <p>Requires Admin Review</p>
                        </div>
                        
                        <div class="content">
                            <div class="urgent">
                                <strong>Priority Request:</strong> New offer request submitted
                            </div>
                            
                            <div class="detail-box">
                                <h3>Request Information:</h3>
                                <p><strong>Request ID:</strong> ${request.id}</p>
                                <p><strong>Property Address:</strong> ${request.property_address}</p>
                                <p><strong>Target Price:</strong> <span class="price-highlight">${request.target_price}</span></p>
                                <p><strong>Submission Time:</strong> ${new Date(request.created_at).toLocaleString()}</p>
                                <p><strong>Container Name:</strong> ${request.container_name || 'N/A'}</p>
                                <p><strong>Image Count:</strong> ${request.image_count || 0}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Customer Information:</h3>
                                <p><strong>Name:</strong> ${request.user_first_name} ${request.user_last_name}</p>
                                <p><strong>Email:</strong> ${request.user_email}</p>
                                <p><strong>User ID:</strong> ${request.user_id}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Property Details:</h3>
                                <p><strong>Beds:</strong> ${request.property_beds || 'N/A'}</p>
                                <p><strong>Baths:</strong> ${request.property_baths || 'N/A'}</p>
                                <p><strong>Sqft:</strong> ${request.property_sqft || 'N/A'}</p>
                                <p><strong>Year:</strong> ${request.property_year || 'N/A'}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Customer Notes:</h3>
                                <p>${request.notes}</p>
                            </div>
                            
                            <div class="detail-box">
                                <h3>Images (${imagesInfo}):</h3>
                                ${detailedImagesHtml}
                            </div>
                            
                            <div class="urgent">
                                <h3>Action Required:</h3>
                                <ul>
                                    <li>Review the property details and uploaded images</li>
                                    <li>Process the offer request</li>
                                    <li>Respond to customer within 24-48 hours</li>
                                    <li>Contact customer if additional information is needed</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>Rehouzd Admin Panel - Offer Request</p>
                            <p>© ${new Date().getFullYear()} Rehouzd. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const textContent = `
                NEW OFFER REQUEST - REQUIRES ADMIN REVIEW
                
                Priority Request: New offer request submitted and requires review.
                
                REQUEST INFORMATION:
                - Request ID: ${request.id}
                - Property Address: ${request.property_address}
                - Target Price: ${request.target_price}
                - Submission Time: ${new Date(request.created_at).toLocaleString()}
                - Container Name: ${request.container_name || 'N/A'}
                - Image Count: ${request.image_count || 0}
                
                CUSTOMER INFORMATION:
                - Name: ${request.user_first_name} ${request.user_last_name}
                - Email: ${request.user_email}
                - User ID: ${request.user_id}
                
                PROPERTY DETAILS:
                - Beds: ${request.property_beds || 'N/A'}
                - Baths: ${request.property_baths || 'N/A'}
                - Sqft: ${request.property_sqft || 'N/A'}
                - Year: ${request.property_year || 'N/A'}
                
                CUSTOMER NOTES:
                ${request.notes}
                
                IMAGES (${imagesInfo}):
                ${detailedImagesText}
                
                ACTION REQUIRED:
                - Review the property details and uploaded images
                - Process the offer request
                - Respond to customer within 24-48 hours
                - Contact customer if additional information is needed
                
                Rehouzd Admin Panel - Offer Request
                © ${new Date().getFullYear()} Rehouzd. All rights reserved.
            `;

            await sendACSEmail({
                to: process.env.ADMIN_EMAIL || 'admin@rehouzd.com',
                subject,
                htmlContent,
                textContent
            });
        } catch (error) {
            logger.error('[Request Controller] Error sending offer admin notification:', error);
        }
    }
}

export const requestController = new RequestController(); 