# Google Photos API Setup Guide

## Fixing 403 Access Denied Error

If you're seeing a "Access denied (403)" error when trying to access Google Photos, follow these steps:

## 1. Enable the Google Photos Library API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" > "Library"
4. Search for "Photos Library API"
5. Click on "Google Photos Library API"
6. Click "ENABLE" (if it's not already enabled)

## 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Make sure your app is properly configured:
   - Add "https://www.googleapis.com/auth/photoslibrary.readonly" and "https://www.googleapis.com/auth/photoslibrary.sharing" under "Scopes"
   - If your app is in "Testing" mode, add your Google account as a test user
   - If possible, set the app to "In production" status

## 3. Check API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Find your OAuth 2.0 Client ID
3. Verify that "Authorized JavaScript origins" includes your domain (e.g., http://localhost:3000)
4. Verify that "Authorized redirect URIs" includes your redirect URI (e.g., http://localhost:3000/oauth2/callback)

## 4. Check API Quotas

1. Go to "APIs & Services" > "Dashboard"
2. Find "Google Photos Library API" and check if you have hit any quotas or limits
3. If necessary, request an increase in quota

## 5. Test with Full Permissions

Once you've completed the above steps:

1. Clear your browser cookies for your application domain
2. Try signing in again with the "Try Again with Full Permissions" button 
3. When prompted, make sure to approve ALL requested permissions

## 6. Verify App Status in Google Cloud Console

1. If your app is still in "Testing" mode in the OAuth consent screen:
   - Make sure your Google account is added as a test user
   - Or, if ready, move the app to "In production" status
   - Note: Moving to production requires verification if you're requesting sensitive scopes

## Important Notes

- It can take up to 5-10 minutes for API changes to propagate
- Check the browser console for detailed error messages
- The Google Photos API requires explicit user consent to access photos
- If testing locally, use http://localhost:3000 rather than 127.0.0.1 or other variations 