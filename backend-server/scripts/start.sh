#!/bin/sh

# This script is used to start the application with Azure Key Vault integration
# It can be used both locally and in Azure App Service

# If running in Azure and KeyVault name is provided
if [ -n "$KEYVAULT_NAME" ] && [ "$NODE_ENV" = "production" ]; then
  echo "Initializing with Azure KeyVault integration using Managed Identity..."
  # The application will use DefaultAzureCredential which automatically detects Managed Identity.
fi

# Log environment
echo "Starting server in $NODE_ENV mode"

# Start the application
exec node dist/rehouzd/estimator/index.js