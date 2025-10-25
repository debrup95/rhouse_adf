# Google OAuth Setup Guide

## Fixing the "redirect_uri_mismatch" Error

If you're seeing a "Error 400: redirect_uri_mismatch" error when trying to authenticate with Google Photos, follow these steps:

### 1. Understand the Problem

This error occurs when the redirect URI configured in Google Cloud Console doesn't match the one your application is using. Our application uses:

```
{window.location.origin}/oauth2/callback
```

For example:
- During development: `http://localhost:3000/oauth2/callback`
- In production: `https://yourdomain.com/oauth2/callback`

### 2. Update Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your project
3. Go to "APIs & Services" > "Credentials"
4. Find and edit the OAuth 2.0 Client ID you're using
5. In the "Authorized redirect URIs" section, add:
   - For development: `http://localhost:3000/oauth2/callback`
   - For production: `https://yourdomain.com/oauth2/callback`
6. Click "Save"

### 3. Verify Configuration

Make sure:
- The Google Photos API is enabled in your Google Cloud Console project
- Your application is using the correct Client ID in `config.ts`
- The authorized JavaScript origins in Google Cloud Console include your domains:
  - For development: `http://localhost:3000`
  - For production: `https://yourdomain.com`

### 4. Testing

After making these changes, it may take a few minutes for the changes to propagate. Try signing in again after 5 minutes.

## Implementation Details

The Google Photos integration in this project uses:

1. `@react-oauth/google` library for authentication
2. Implicit flow (client-side only authentication)
3. `GoogleOAuthProvider` wrapper in `index.tsx`
4. `GooglePhotosSelector.tsx` as the main component for selecting photos
5. `GoogleOAuthCallback.tsx` to handle the redirect after authentication

## Security Considerations

- Don't include client secrets in frontend code
- Use environment variables for sensitive information when possible
- Consider implementing server-side authentication for better security in the future 