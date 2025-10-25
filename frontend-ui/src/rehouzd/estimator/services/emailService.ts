import apiService from './apiService';

export interface FormSubmissionData {
    formType: 'underwrite' | 'get-offers';
    propertyAddress: string;
    estimatedPrice?: string;
    targetOfferPrice?: string;
    notes: string;
    images: Array<{
        id: string;
        url: string;
        name: string;
        type: 'file' | 'url' | 'google';
    }>;
    photoLinks?: string;
    propertyDetails?: {
        beds?: string | number;
        baths?: string | number;
        sqft?: string | number;
        year?: string | number;
    };
    userInfo: {
        email: string;
        name?: string;
        userId?: number;
    };
    submissionTimestamp: string;
}

export interface EmailNotificationResponse {
    success: boolean;
    message: string;
    confirmationEmailSent?: boolean;
    adminEmailSent?: boolean;
    errors?: string[];
}

/**
 * Send form submission notification emails
 * @param formData - Complete form submission data
 * @returns Promise with email sending results
 */
export const sendFormSubmissionEmails = async (
    formData: FormSubmissionData
): Promise<EmailNotificationResponse> => {
    try {
        const response = await apiService.post('/api/email/form-submission-notification', {
            formData
        });
        
        const data = await response.json();

        if (data.success) {
            return {
                success: true,
                message: 'Notification emails sent successfully',
                confirmationEmailSent: data.data?.confirmationEmailSent || false,
                adminEmailSent: data.data?.adminEmailSent || false
            };
        } else {
            throw new Error(data.message || 'Failed to send notification emails');
        }
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send emails',
            errors: [error instanceof Error ? error.message : 'Unknown error']
        };
    }
};

/**
 * Generate email content for user confirmation
 */
export const generateUserConfirmationContent = (formData: FormSubmissionData): {
    subject: string;
    htmlContent: string;
    textContent: string;
} => {
    const formTypeName = formData.formType === 'underwrite' ? 'Underwrite' : 'Get Offers';
    const priceField = formData.formType === 'underwrite' ? formData.estimatedPrice : formData.targetOfferPrice;
    
    const subject = `${formTypeName} Request Confirmation - ${formData.propertyAddress}`;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #ddd; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                .detail-box { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
                .price-highlight { font-size: 24px; font-weight: bold; color: #007bff; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Request Confirmation</h1>
                    <p>Your ${formTypeName} request has been received</p>
                </div>
                
                <div class="content">
                    <h2>Hello ${formData.userInfo.name || 'Valued Customer'},</h2>
                    
                    <p>Thank you for submitting your ${formTypeName.toLowerCase()} request. We've received your information and will process it shortly.</p>
                    
                    <div class="detail-box">
                        <h3>Request Details:</h3>
                        <p><strong>Property Address:</strong> ${formData.propertyAddress}</p>
                        <p><strong>Service Type:</strong> ${formTypeName}</p>
                        <p><strong>${formData.formType === 'underwrite' ? 'Estimated Price' : 'Target Offer Price'}:</strong> 
                           <span class="price-highlight">${priceField}</span></p>
                        <p><strong>Images Uploaded:</strong> ${formData.images.length} image(s)</p>
                        ${formData.photoLinks ? `<p><strong>Photo Links:</strong> <a href="${formData.photoLinks}" target="_blank">${formData.photoLinks}</a></p>` : ''}
                        <p><strong>Submission Date:</strong> ${new Date(formData.submissionTimestamp).toLocaleDateString()}</p>
                    </div>
                    
                    <div class="detail-box">
                        <h3>Your Notes:</h3>
                        <p>${formData.notes}</p>
                    </div>
                    
                    <p><strong>What's Next?</strong></p>
                    <ul>
                        <li>Our team will review your ${formTypeName.toLowerCase()} request</li>
                        <li>We'll analyze the property details and images you provided</li>
                        <li>You'll receive a detailed response within 24-48 hours</li>
                        <li>If we need additional information, we'll contact you directly</li>
                    </ul>
                    
                    <p>If you have any questions or need to make changes to your request, please contact our support team.</p>
                </div>
                
                <div class="footer">
                    <p>Thank you for choosing Rehouzd!</p>
                    <p>© ${new Date().getFullYear()} Rehouzd. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const textContent = `
        ${formTypeName} Request Confirmation
        
        Hello ${formData.userInfo.name || 'Valued Customer'},
        
        Thank you for submitting your ${formTypeName.toLowerCase()} request. We've received your information and will process it shortly.
        
        Request Details:
        - Property Address: ${formData.propertyAddress}
        - Service Type: ${formTypeName}
        - ${formData.formType === 'underwrite' ? 'Estimated Price' : 'Target Offer Price'}: ${priceField}
        - Images Uploaded: ${formData.images.length} image(s)
        ${formData.photoLinks ? `- Photo Links: ${formData.photoLinks}` : ''}
        - Submission Date: ${new Date(formData.submissionTimestamp).toLocaleDateString()}
        
        Your Notes:
        ${formData.notes}
        
        What's Next?
        - Our team will review your ${formTypeName.toLowerCase()} request
        - We'll analyze the property details and images you provided
        - You'll receive a detailed response within 24-48 hours
        - If we need additional information, we'll contact you directly
        
        If you have any questions or need to make changes to your request, please contact our support team.
        
        Thank you for choosing Rehouzd!
        © ${new Date().getFullYear()} Rehouzd. All rights reserved.
    `;
    
    return { subject, htmlContent, textContent };
};

/**
 * Generate email content for admin notification
 */
export const generateAdminNotificationContent = (formData: FormSubmissionData): {
    subject: string;
    htmlContent: string;
    textContent: string;
} => {
    const formTypeName = formData.formType === 'underwrite' ? 'Underwrite' : 'Get Offers';
    const priceField = formData.formType === 'underwrite' ? formData.estimatedPrice : formData.targetOfferPrice;
    
    const subject = `New ${formTypeName} Request - ${formData.propertyAddress}`;
    
    const imagesList = formData.images.map(img => 
        `- ${img.name} (${img.type}): ${img.url}`
    ).join('\n        ');
    
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
                    <h1>New ${formTypeName} Request</h1>
                    <p>Requires Admin Review</p>
                </div>
                
                <div class="content">
                    <div class="urgent">
                        <strong>Priority Request:</strong> New ${formTypeName.toLowerCase()} request submitted and requires review.
                    </div>
                    
                    <div class="detail-box">
                        <h3>Request Information:</h3>
                        <p><strong>Service Type:</strong> ${formTypeName}</p>
                        <p><strong>Property Address:</strong> ${formData.propertyAddress}</p>
                        <p><strong>${formData.formType === 'underwrite' ? 'Estimated Price' : 'Target Offer Price'}:</strong> 
                           <span class="price-highlight">${priceField}</span></p>
                        <p><strong>Submission Time:</strong> ${new Date(formData.submissionTimestamp).toLocaleString()}</p>
                    </div>
                    
                    <div class="detail-box">
                        <h3>Customer Information:</h3>
                        <p><strong>Name:</strong> ${formData.userInfo.name || 'Not provided'}</p>
                        <p><strong>Email:</strong> ${formData.userInfo.email}</p>
                        <p><strong>User ID:</strong> ${formData.userInfo.userId || 'Guest'}</p>
                    </div>
                    
                    ${formData.propertyDetails ? `
                    <div class="detail-box">
                        <h3>Property Details:</h3>
                        <p><strong>Beds:</strong> ${formData.propertyDetails.beds || 'Not provided'}</p>
                        <p><strong>Baths:</strong> ${formData.propertyDetails.baths || 'Not provided'}</p>
                        <p><strong>Square Feet:</strong> ${formData.propertyDetails.sqft || 'Not provided'}</p>
                        <p><strong>Year Built:</strong> ${formData.propertyDetails.year || 'Not provided'}</p>
                    </div>
                    ` : ''}
                    
                    <div class="detail-box">
                        <h3>Customer Notes:</h3>
                        <p>${formData.notes}</p>
                    </div>
                    
                    <div class="detail-box">
                        <h3>Uploaded Images (${formData.images.length}):</h3>
                        ${formData.images.map(img => `
                            <p><strong>${img.name}</strong> (${img.type})<br>
                               <a href="${img.url}" target="_blank">${img.url}</a></p>
                        `).join('')}
                        ${formData.photoLinks ? `
                        <p><strong>Photo Links Provided:</strong><br>
                           <a href="${formData.photoLinks}" target="_blank">${formData.photoLinks}</a></p>
                        ` : ''}
                    </div>
                    
                    <div class="urgent">
                        <h3>Action Required:</h3>
                        <ul>
                            <li>Review the property details and uploaded images</li>
                            <li>Process the ${formTypeName.toLowerCase()} request</li>
                            <li>Respond to customer within 24-48 hours</li>
                            <li>Contact customer if additional information is needed</li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Rehouzd Admin Panel - ${formTypeName} Request</p>
                    <p>© ${new Date().getFullYear()} Rehouzd. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const textContent = `
        NEW ${formTypeName.toUpperCase()} REQUEST - REQUIRES ADMIN REVIEW
        
        Priority Request: New ${formTypeName.toLowerCase()} request submitted and requires review.
        
        REQUEST INFORMATION:
        - Service Type: ${formTypeName}
        - Property Address: ${formData.propertyAddress}
        - ${formData.formType === 'underwrite' ? 'Estimated Price' : 'Target Offer Price'}: ${priceField}
        - Submission Time: ${new Date(formData.submissionTimestamp).toLocaleString()}
        
        CUSTOMER INFORMATION:
        - Name: ${formData.userInfo.name || 'Not provided'}
        - Email: ${formData.userInfo.email}
        - User ID: ${formData.userInfo.userId || 'Guest'}
        
        ${formData.propertyDetails ? `
        PROPERTY DETAILS:
        - Beds: ${formData.propertyDetails.beds || 'Not provided'}
        - Baths: ${formData.propertyDetails.baths || 'Not provided'}
        - Square Feet: ${formData.propertyDetails.sqft || 'Not provided'}
        - Year Built: ${formData.propertyDetails.year || 'Not provided'}
        ` : ''}
        
        CUSTOMER NOTES:
        ${formData.notes}
        
        UPLOADED IMAGES (${formData.images.length}):
        ${imagesList}
        ${formData.photoLinks ? `
        PHOTO LINKS PROVIDED:
        ${formData.photoLinks}
        ` : ''}
        
                    ACTION REQUIRED:
        - Review the property details and uploaded images
        - Process the ${formTypeName.toLowerCase()} request
        - Respond to customer within 24-48 hours
        - Contact customer if additional information is needed
        
        Rehouzd Admin Panel - ${formTypeName} Request
        © ${new Date().getFullYear()} Rehouzd. All rights reserved.
    `;
    
    return { subject, htmlContent, textContent };
}; 