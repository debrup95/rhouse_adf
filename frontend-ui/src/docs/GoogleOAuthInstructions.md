# Google Photos Integration Setup Guide

## Overview

This guide helps you configure Google Photos integration for the Rehouzd application. The integration allows users to select photos from their Google Photos library.

## Prerequisites

- Google Cloud Console project
- Frontend environment configuration
- Basic understanding of OAuth 2.0

## Step 1: Google Cloud Console Configuration

### 1.1 Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (should be "Rehouzd")
3. Navigate to **"APIs & Services" > "Library"**
4. Search for and enable:
   - **Google Photos Library API** (enabled)
- **Google OAuth2 API** (enabled)

### 1.2 Configure OAuth Consent Screen

1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Click **"EDIT APP"**
3. Update the following fields:
   - **Application name**: `Rehouzd`
   - **Application home page**: `https://www.rehouzd.com`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address

4. In the **"Scopes"** section, click **"ADD OR REMOVE SCOPES"**
5. Add these specific scopes:
   ```
   https://www.googleapis.com/auth/photoslibrary.readonly
   https://www.googleapis.com/auth/photoslibrary.sharing
   ```
   > **Note**: We've simplified the scopes for better security and reliability

6. **Save** your changes

### 1.3 Create OAuth 2.0 Client ID

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"+ CREATE CREDENTIALS" > "OAuth 2.0 Client ID"**
3. Configure as follows:
   - **Application type**: Web application
   - **Name**: `Rehouzd Frontend Google Photos`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://www.rehouzd.com
     ```
   - **Authorized redirect URIs**: Leave empty (using implicit flow)

4. **Create** and copy the **Client ID**

## Step 2: Frontend Configuration

### 2.1 Environment Variables

Create a `.env` file in your `frontend-ui` directory:

```bash
# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:5004
REACT_APP_GOOGLE_CLIENT_ID=your_google_photos_client_id_here
REACT_APP_Maps_API_KEY=your_maps_api_key
REACT_APP_GOOGLE_MAP_ID=your_google_map_id
```

### 2.2 Production Configuration

For Azure deployment, set these environment variables in your Azure Static Web Apps or App Service:

```bash
REACT_APP_API_URL=https://your-backend-domain.azurewebsites.net
REACT_APP_GOOGLE_CLIENT_ID=your_google_photos_client_id_here
```

## Step 3: Testing the Integration

### 3.1 Development Testing

1. **Restart your development server** after adding environment variables
2. **Clear browser cache and cookies**
3. **Navigate to the photo upload section** in your app
4. **Click "Sign in with Google"**
5. **Grant all requested permissions** when prompted
6. **Verify photos load correctly**

### 3.2 Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Configuration Required" error | Ensure `REACT_APP_GOOGLE_CLIENT_ID` is set correctly |
| "Authentication popup was closed" | Disable popup blockers, keep popup open until completion |
| "Access denied (403)" | Verify Photos Library API is enabled and scopes are configured |
| "Authentication expired (401)" | Clear stored tokens and re-authenticate |

### 3.3 Browser Requirements

- **Popup blockers**: Must be disabled for your domain
- **Third-party cookies**: Should be enabled
- **JavaScript**: Must be enabled
- **Supported browsers**: Chrome, Firefox, Safari, Edge

## Step 4: Production Deployment

### 4.1 OAuth Consent Screen Status

For production use, consider:

1. **Testing mode**: Limited to test users you specify
2. **Production mode**: Available to all users (requires Google verification)

### 4.2 Security Considerations

- **Client ID**: Safe to expose in frontend code
- **Client Secret**: Never use in frontend applications
- **Scopes**: Only request minimum required permissions
- **Token storage**: Automatically handled with 1-hour expiry

## Troubleshooting

### Debug Information

The application logs helpful debug information in the browser console:

```javascript
// Check if configuration is loaded
console.log('Google Client ID available:', Boolean(config.googleClientId));

// Monitor authentication flow
console.log('Google OAuth succeeded');
console.log('Using stored Google Photos token');
```

### Common Error Messages

- **"popup_closed"**: User closed authentication popup
- **"access_denied"**: User denied permissions or API not enabled
- **"invalid_client"**: Client ID is incorrect or not configured
- **"insufficient_scope"**: Required scopes not granted

### Getting Help

1. **Check browser console** for detailed error messages
2. **Verify Google Cloud Console** configuration
3. **Test with different browsers** to isolate issues
4. **Clear all browser data** if authentication seems stuck

## API Limits and Quotas

- **Daily quota**: 10,000 requests per day (default)
- **Rate limiting**: 100 requests per 100 seconds per user
- **Photo resolution**: Automatically optimized for display

For higher limits, request quota increases in Google Cloud Console.

---

**Last Updated**: January 2025  
**Version**: 2.0 (Simplified and optimized) 