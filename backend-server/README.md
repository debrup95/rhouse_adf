# Backend Server - Rehouzd API

This is the Node.js/Express backend API server for the Rehouzd property estimation platform.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment for local development
export NODE_ENV=local

# Initialize database schema (first time only)
npm run db:init

# Start development server with hot reload
npm run dev

# Or run production build
npm run build && npm start
```

## Environment Configuration

The backend supports **dual environment configuration** - local development with `.env` files and production with Azure Key Vault.

### Local Development Setup

1. **Set NODE_ENV to local:**
   ```bash
   export NODE_ENV=local
   # OR prefix commands: NODE_ENV=local npm run dev
   ```

2. **Configure `.env` file:**
   ```env
   # Database (use local PostgreSQL)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=rehouzd
   DB_USER=postgres
   DB_PASSWORD=postgres

   # Authentication
   JWT_SECRET=your-local-jwt-secret
   JWT_EXPIRES_IN=7d

   # Google OAuth (get from Google Cloud Console)
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5004/api/auth/google/callback

   # Email (optional for local dev)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@rehouzd.com

   # CORS
   CORS_ORIGIN=http://localhost:3000,http://localhost:3001
   ```

### Production Configuration

In production (`NODE_ENV=production`), the app automatically:
- Loads secrets from **Azure Key Vault** using Managed Identity
- Falls back to environment variables if Key Vault unavailable
- Maps Key Vault secret names (kebab-case) to environment variables (SNAKE_CASE)

**Key Vault Secret Mapping:**
- `DATABASE-URL` → `DB_CONNECTION_STRING`
- `JWT-SECRET` → `JWT_SECRET`
- `GOOGLE-CLIENT-ID` → `GOOGLE_CLIENT_ID`
- `GOOGLE-CLIENT-SECRET` → `GOOGLE_CLIENT_SECRET`

## Development Commands

```bash
# Development with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start

# Initialize/reset database schema
npm run db:init

# Run tests
npm test

# Code quality
npm run lint          # ESLint
npm run prettier      # Format code

# Copy test data files during build
npm run copy-files
```

## Architecture Overview

### Directory Structure

```
src/rehouzd/estimator/
├── config/           # Environment and database configuration
├── controllers/      # Request handlers and response logic
├── services/         # Business logic layer
├── models/          # Data models and database interactions
├── repositories/    # Data access layer
├── routes/          # API endpoint definitions
├── middleware/      # Express middleware (auth, logging, errors)
├── utils/           # Shared utilities and helpers
├── db/schema/       # SQL database schema files
└── index.ts         # Application entry point
```

### Key Components

**Configuration System (`config/`):**
- Environment-specific configuration loading
- Azure Key Vault integration for production secrets
- Graceful fallbacks for local development

**Database Layer:**
- PostgreSQL with raw SQL queries
- Schema files in `db/schema/` directory
- Repository pattern for data access

**Authentication (`auth/`):**
- JWT-based authentication
- Google OAuth integration via Passport.js
- Cookie-based session management

**API Routes (`routes/`):**
- `/api/auth` - Authentication (signup, login, OAuth)
- `/api/property` - Property data and analysis
- `/api/estimates` - Property valuation calculations
- `/api/saved-estimates` - User's saved estimates
- `/api/buyer-matching` - Buyer-seller connections
- `/api/specialist-callback` - Specialist consultations
- `/api/underwrite-sliders` - Investment analysis parameters

**Services Layer (`services/`):**
- Business logic separated from controllers
- External API integrations (Parcl Labs, Google Maps)
- Email services and notifications

**Utilities (`utils/`):**
- Azure Blob Storage for file uploads
- Winston logging configuration
- Property calculation helpers
- Email service utilities

## Database Setup

### Local PostgreSQL Setup

```bash
# Using Docker (recommended)
docker run -d \
  --name rehouzd-postgres \
  -e POSTGRES_DB=rehouzd \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine

# Initialize schema
npm run db:init
```

### Schema Management

Database schema is managed through SQL files in `db/schema/`:
- Run `npm run db:init` to create/update all tables
- Schema files are executed in dependency order
- Safe to run multiple times (uses IF NOT EXISTS)

## External Services

### Required for Full Functionality

1. **Google OAuth** - User authentication
   - Get credentials from Google Cloud Console
   - Set redirect URI: `http://localhost:5004/api/auth/google/callback`

2. **Parcl Labs API** - Property market data
   - Set `PARCL_LABS_API_KEY` in environment

3. **Azure Blob Storage** - Property image uploads (production)
   - Set `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_KEY`

### Optional Services

- **Email/SMTP** - User notifications and password reset
- **Google Maps API** - Address validation and geocoding

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.ts
```

**Test Structure:**
- Unit tests for services and utilities
- Integration tests for API endpoints
- Mocked external dependencies

## Code Style & Quality

**ESLint Configuration:**
- TypeScript strict mode enabled
- Consistent code formatting with Prettier
- Pre-commit hooks enforce code quality

**Best Practices:**
- Repository pattern for data access
- Service layer for business logic
- Proper error handling with custom middleware
- Comprehensive logging with Winston
- Input validation on all endpoints

## Deployment

### Local Development
```bash
NODE_ENV=local npm run dev
```

### Production (Azure)
- Automatically configured via CI/CD pipeline
- Uses Container Apps with Managed Identity
- Secrets managed through Azure Key Vault
- Environment variables injected at runtime

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Ensure PostgreSQL is running on localhost:5432
- Check database credentials in `.env`
- Run `npm run db:init` to create schema

**Authentication Issues:**
- Verify Google OAuth credentials
- Check JWT_SECRET is set
- Ensure CORS_ORIGIN includes your frontend URL

**Azure Key Vault Issues (Production):**
- Verify Managed Identity has Key Vault access
- Check KEYVAULT_NAME environment variable
- Logs will show Key Vault initialization status

**Environment Variable Issues:**
- Ensure NODE_ENV is set correctly
- Check `.env` file exists and is readable
- Verify environment-specific configuration loading

### Logs and Debugging

Logs are written to:
- Console (development)
- `logs/` directory (all environments)
- Structured JSON format with Winston

**Log Levels:**
- `error` - Critical errors
- `warn` - Warnings and fallbacks
- `info` - General application flow
- `debug` - Detailed debugging info

Set `LOG_LEVEL=debug` for verbose logging during development.

## Contributing

1. **Set up local environment** with `NODE_ENV=local`
2. **Run tests** before submitting PRs
3. **Follow code style** - run `npm run lint` and `npm run prettier`
4. **Update schema** if database changes required
5. **Document API changes** in relevant controller/service files

For questions or support, check the main project documentation or reach out to the development team.