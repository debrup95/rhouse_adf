# OTP-Based Password Reset Setup

This document explains how to set up and use the new OTP-based password reset feature that uses Azure Communication Services (ACS) for email delivery.

## Overview

The password reset system has been upgraded from a simple token-based approach to a more secure OTP (One-Time Password) system that:

- Generates 6-digit OTPs that expire in 10 minutes
- Stores OTPs securely in the database with encryption
- Sends professional-looking HTML emails via Azure Communication Services
- Includes rate limiting to prevent spam
- Provides attempt tracking and automatic cleanup

## Features

### Security Features
- **6-digit OTP**: Easy to enter but secure enough for password resets
- **10-minute expiration**: Short-lived to minimize security risk
- **Rate limiting**: Users can only request one OTP per minute
- **Attempt tracking**: OTPs are invalidated after 5 failed attempts
- **Automatic cleanup**: Expired and used OTPs are automatically removed
- **Email enumeration protection**: Same response whether email exists or not

### User Experience
- **Professional emails**: HTML-formatted emails with clear instructions
- **Clear validation**: Real-time validation with helpful error messages
- **Mobile-friendly**: OTP input field optimized for mobile devices
- **Progress feedback**: Clear steps and success/error messages

## Prerequisites

### 1. Azure Communication Services Setup

1. **Create an ACS Resource**:
   - Go to Azure Portal
   - Create a new "Communication Services" resource
   - Note the connection string from the "Keys" section

2. **Set up Email Domain**:
   - In your ACS resource, go to "Email" → "Domains"
   - Add and verify a domain (or use an Azure-managed domain)
   - Note the verified sender email address

3. **Get Connection String**:
   ```
   endpoint=https://your-acs-resource.communication.azure.com/;accesskey=your_access_key
   ```

### 2. Environment Variables

Add these environment variables to your `.env` file:

```bash
# Azure Communication Services (Required for OTP emails)
AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING=endpoint=https://your-acs-resource.communication.azure.com/;accesskey=your_access_key
ACS_SENDER_EMAIL=DoNotReply@your-verified-domain.com
```

### 3. Database Setup

The OTP table is automatically created when you run database migrations. If you need to create it manually:

```sql
-- Run this SQL in your PostgreSQL database
\i backend-server/src/rehouzd/estimator/db/schema/password_reset_otps.sql
```

## API Endpoints

### 1. Request Password Reset OTP
```http
POST /api/auth/request-password-reset-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset OTP has been sent to your email."
}
```

### 2. Verify OTP and Reset Password
```http
POST /api/auth/verify-otp-reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully."
}
```

## Frontend Usage

The frontend has been updated to use the new OTP system:

1. **Request OTP**: User enters email and requests reset
2. **Enter OTP**: User receives email with 6-digit code
3. **Set New Password**: User enters OTP and new password
4. **Success**: Password is reset and user can log in

### Key Features:
- OTP input automatically formats and validates 6-digit codes
- Clear error messages for invalid/expired OTPs
- Helpful text explaining the process
- Rate limiting messages when user requests too frequently

## Backward Compatibility

The old token-based endpoints are still available for backward compatibility:

- `/api/auth/request-password-reset` - Now uses OTP internally
- `/api/auth/reset-password` - Automatically detects OTP vs old token format

## Error Handling

### Common Error Messages:
- `"Please wait before requesting another OTP."` - Rate limiting (1 minute cooldown)
- `"OTP code has expired. Please request a new one."` - OTP expired (10 minutes)
- `"Invalid or expired OTP code."` - Wrong OTP or already used
- `"Too many invalid attempts. Please request a new OTP."` - 5+ failed attempts

### Troubleshooting:

1. **Email not received**:
   - Check spam/junk folder
   - Verify ACS sender email is configured correctly
   - Check ACS resource status in Azure Portal

2. **OTP not working**:
   - Ensure OTP is exactly 6 digits
   - Check if OTP has expired (10 minutes)
   - Verify email address matches exactly

3. **Rate limiting issues**:
   - Wait 1 minute between OTP requests
   - Check database for recent OTP entries

## Database Maintenance

### Cleanup Expired OTPs
The system automatically cleans up expired OTPs, but you can also run manual cleanup:

```sql
SELECT cleanup_expired_otps();
```

### Monitor OTP Usage
```sql
-- Check recent OTP requests
SELECT email, otp_code, created_at, expires_at, used, attempts 
FROM password_reset_otps 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

## Testing

### Test the Email Service
```typescript
import { sendPasswordResetOTP } from './services/azure/acsEmailService';

// Test sending OTP email
await sendPasswordResetOTP('test@example.com', '123456', 'Test User');
```

### Test OTP Generation and Validation
```typescript
import * as otpModel from './models/auth/otpModel';

// Generate OTP
const otp = otpModel.generateOTP();
console.log(otp); // Should be 6 digits

// Create OTP in database
await otpModel.createPasswordResetOTP('test@example.com', otp, 10);

// Validate OTP
const validation = await otpModel.validatePasswordResetOTP('test@example.com', otp);
console.log(validation); // Should be { valid: true, message: 'OTP is valid.', otpId: number }
```

## Security Considerations

1. **OTP Storage**: OTPs are stored in the database with proper indexing
2. **Rate Limiting**: Prevents brute force and spam attempts
3. **Expiration**: Short-lived OTPs minimize exposure window
4. **Attempt Tracking**: Prevents repeated guessing attacks
5. **Email Enumeration**: Same response for valid/invalid emails
6. **Cleanup**: Automatic removal of used/expired OTPs

## Production Deployment

1. **Azure Key Vault**: Store ACS connection string in Key Vault
2. **Monitoring**: Set up alerts for failed email sends
3. **Scaling**: ACS can handle high email volumes
4. **Backup**: Ensure database backups include OTP table

## Migration from Old System

The new system is backward compatible, but to fully migrate:

1. Update frontend to use new OTP endpoints
2. Test thoroughly in staging environment
3. Monitor both old and new endpoints during transition
4. Eventually remove old token-based system

## Support

For issues with:
- **ACS Setup**: Check Azure Communication Services documentation
- **Database Issues**: Verify PostgreSQL connection and schema
- **Email Delivery**: Check ACS resource logs in Azure Portal
- **Frontend Issues**: Check browser console for validation errors 