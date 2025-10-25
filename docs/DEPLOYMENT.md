# Rehouzd Deployment Guide

This document outlines the steps required to deploy the Rehouzd application in different environments.

## Table of Contents

1. [Local Development with Docker](#local-development-with-docker)
2. [Azure Deployment](#azure-deployment)
3. [Environment Variables](#environment-variables)
4. [Azure Key Vault Integration](#azure-key-vault-integration)
5. [Troubleshooting](#troubleshooting)

## Local Development with Docker

### Prerequisites

- Docker and Docker Compose installed
- Git

### Steps

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-org/Rehouzd-MVP.git
   cd Rehouzd-MVP
   ```

2. **Create environment files:**

   Create `.env` files for both frontend and backend based on the provided examples:

   ```bash
   # For backend
   cp backend-server/.env.example backend-server/.env
   
   # For frontend (if needed)
   cp frontend-ui/.env.example frontend-ui/.env
   ```

3. **Update environment variables:**

   Edit the `.env` files with your specific settings (database credentials, API keys, etc.)

4. **Start the development environment:**

   ```bash
   docker-compose up
   ```

   This will start the following services:
   - Frontend (React) at http://localhost:3001
   - Backend (Node.js) at http://localhost:5004
   - PostgreSQL at localhost:5432

5. **Stopping the environment:**

   ```bash
   docker-compose down
   ```

   To remove volumes as well (will delete database data):

   ```bash
   docker-compose down -v
   ```

## Azure Deployment

### Prerequisites

- Azure subscription
- Azure CLI installed
- GitHub repository with GitHub Actions enabled

### Steps

1. **Set up Azure resources:**

   Follow the instructions in [main.bicep](../main.bicep) to deploy the required Azure resources using Bicep.

2. **Configure GitHub Secrets:**

   The following secrets are required for GitHub Actions deployment:

   - `ACR_NAME`: Azure Container Registry name
   - `ACR_LOGIN_SERVER`: ACR login server (e.g., `yourregistry.azurecr.io`)
   - `ACR_PASSWORD`: ACR admin password
   - `RESOURCE_GROUP`: Azure Resource Group name
   - `AZURE_CREDENTIALS`: Service principal credentials JSON

3. **Create Service Principal:**

   ```bash
   az ad sp create-for-rbac --name "rehouzd-github-actions" --role contributor \
     --scopes /subscriptions/<subscription-id>/resourceGroups/<resource-group> \
     --sdk-auth
   ```

   Save the JSON output as the `AZURE_CREDENTIALS` secret in GitHub.

4. **Configure Azure Key Vault:**

   Create the following secrets in your Azure Key Vault:

   - `DB-CONNECTION-STRING`: PostgreSQL connection string
   - `JWT-SECRET`: Secret for JWT token generation
   - `GOOGLE-CLIENT-ID`: Google OAuth client ID
   - `GOOGLE-CLIENT-SECRET`: Google OAuth client secret

5. **Deploy to Azure:**

   Push to the main branch or create a pull request to trigger the GitHub Actions workflow:

   ```bash
   git push origin main
   ```

   The GitHub Actions workflow will:
   - Build and test the applications
   - Build and push Docker images to ACR
   - Deploy the infrastructure using Bicep
   - Deploy to staging slots
   - Swap to production after approval

## Environment Variables

### Backend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | `development`, `production` |
| `PORT` | Server port | Yes | `5004` |
| `HOST` | Server host | Yes | `0.0.0.0` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Secret for JWT generation | Yes | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT expiration time | Yes | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No | `client-id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No | `client-secret` |
| `LOG_LEVEL` | Logging level | No | `info`, `debug`, `warn`, `error` |
| `KEYVAULT_NAME` | Azure Key Vault name | No (Azure only) | `rehouzd-kv` |

### Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `REACT_APP_API_URL` | Backend API URL | Yes | `http://localhost:5004` or `https://api.rehouzd.com` |
| `REACT_APP_Maps_API_KEY` | Google Maps API Key | No | `your-maps-api-key` |
| `REACT_APP_GOOGLE_MAP_ID` | Google Maps Map ID | No | `your-map-id` |

## Azure Key Vault Integration

The application is configured to automatically integrate with Azure Key Vault in production environments:

1. **Backend Integration:**
   - The backend application uses the Azure Identity and KeyVault libraries to access secrets
   - Ensure the managed identity has appropriate permissions to access the Key Vault

2. **Frontend Integration:**
   - For the frontend, environment variables are injected at container startup
   - The frontend doesn't directly access Key Vault; it receives values through Azure App Service settings

3. **Secret Naming Convention:**
   - Use kebab-case for secret names (e.g., `db-connection-string`)
   - In the application, secrets will be available as environment variables in UPPER_SNAKE_CASE (e.g., `DB_CONNECTION_STRING`)

## Troubleshooting

### Common Issues

#### Docker Compose Issues

- **Problem**: Containers exit immediately after starting
  - **Solution**: Check the logs with `docker-compose logs -f [service-name]`

- **Problem**: Backend can't connect to database
  - **Solution**: Ensure the database service is fully started before the backend tries to connect

#### Azure Deployment Issues

- **Problem**: GitHub Actions deployment fails
  - **Solution**: Check GitHub Actions logs for detailed error information
  - **Solution**: Verify service principal permissions

- **Problem**: Application can't access Key Vault
  - **Solution**: Verify managed identity is correctly assigned
  - **Solution**: Check Key Vault access policies

- **Problem**: Environment variables not available
  - **Solution**: Check App Service configuration settings
  - **Solution**: Verify Key Vault secret names match expected environment variable names

### Logs

- **Local Development**: Logs are available in the Docker container output
- **Azure**: Logs can be viewed in:
  - Azure App Service Logs
  - Azure Application Insights (if configured)
  - Container logs via Azure CLI 