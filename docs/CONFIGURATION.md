# Configuration Guide

This document outlines the configuration needed for both the frontend and backend applications.

## Environment Files

### Backend Environment Variables (.env file)

Create a `.env` file in the `backend-server` directory with the following variables:

```dotenv
# Server Configuration
NODE_ENV=development
PORT=5004
HOST=0.0.0.0

# Database Configuration - Use connection string or individual params
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rehouzd
# Or specify individual connection parameters:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=rehouzd
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_SSL=false

# Security
JWT_SECRET=your-jwt-secret-replace-in-production
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5004/api/auth/google/callback

# Logging
LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Email Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_FROM=noreply@rehouzd.com

# For Docker development, use these values:
# DATABASE_URL=postgresql://postgres:postgres@postgres:5432/rehouzd
```

### Frontend Environment Variables (.env file)

Create a `.env` file in the `frontend-ui` directory with the following variables:

```dotenv
# API URL - Point to your backend instance
REACT_APP_API_URL=http://localhost:5004

# Google Maps API Configuration
REACT_APP_Maps_API_KEY=your-maps-api-key
REACT_APP_GOOGLE_MAP_ID=your-map-id

# Build Configuration
DISABLE_ESLINT_PLUGIN=true
CI=false

# Development Settings
PORT=3000
HTTPS=false
BROWSER=none
GENERATE_SOURCEMAP=true
```

## Environment-Specific Configuration

### Development Environment

For local development, the settings in the `.env` files should be configured for your local machine.

If using Docker, make sure to:
- Use `postgres` as the database host instead of `localhost`
- Set appropriate URLs for services to communicate within the Docker network

### Production Environment (Azure)

In production, environment variables are managed through:
1. Azure Key Vault for sensitive information
2. App Service Configuration for non-sensitive settings

Key production settings:
1. Set `NODE_ENV=production`
2. Configure database connection string from Azure PostgreSQL
3. Set proper CORS settings for production domains
4. Provide Azure Key Vault configuration

## Azure Key Vault Secrets

In Azure Key Vault, create these secrets:

| Secret Name | Description |
|-------------|-------------|
| `db-connection-string` | PostgreSQL connection string |
| `jwt-secret` | Secret for JWT token generation |
| `google-client-id` | Google OAuth client ID |
| `google-client-secret` | Google OAuth client secret |
| `email-password` | Email service password |

These secrets will be automatically mapped to environment variables in the application. 