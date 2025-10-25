targetScope = 'resourceGroup'

@description('Azure region for all resources')
param location string = 'southcentralus'

@description('Container Registry name (must be globally unique)')
param acrName string

@description('App Service Plan name')
param planName string

@description('Flexible PostgreSQL server name (globally unique)')
param postgresName string

@description('Key Vault name (globally unique)')
param keyVaultName string

@description('Frontend Web App name')
param frontendAppName string

@description('Backend Web App name')
param backendAppName string

@description('Custom domain to bind')
param customDomain string = 'rehouzd.com'

// Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2022-02-01-preview' = {
  name: acrName
  location: location
  sku: { name: 'Standard' }
  properties: { adminUserEnabled: true }
}

// App Service Plan
resource plan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: planName
  location: location
  sku: {
    name: 'P1v2'
    tier: 'PremiumV2'
    capacity: 1
  }
  properties: {
    reserved: true // Linux
  }
}

// Key Vault
resource kv 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: false
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    accessPolicies: []
  }
}

// PostgreSQL Flexible Server
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2021-06-01' = {
  name: postgresName
  location: location
  sku: {
    name: 'Standard_B2s'
    tier: 'Burstable'
  }
  properties: {
    version: '13'
    storage: { storageSizeGB: 32 }
    administratorLogin: 'dbadminuser'
    administratorLoginPassword: 'PlaceholderPassword123!' // Will be replaced with Key Vault reference
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// PostgreSQL DB
resource postgresDB 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2021-06-01' = {
  name: 'rehouzd'
  parent: postgres
  properties: {
    charset: 'utf8'
    collation: 'en_US.utf8'
  }
}

// Store DB connection string in Key Vault
resource dbConnectionSecret 'Microsoft.KeyVault/vaults/secrets@2022-07-01' = {
  name: '${kv.name}/DB-CONNECTION-STRING'
  properties: {
    value: 'postgresql://${postgres.properties.administratorLogin}@${postgres.name}:${postgres.properties.administratorLoginPassword}@${postgres.name}.postgres.database.azure.com:5432/${postgresDB.name}?sslmode=require'
  }
}

// Frontend Web App (Linux container)
resource frontend 'Microsoft.Web/sites@2021-02-01' = {
  name: frontendAppName
  location: location
  kind: 'app,linux,container'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acr.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: acr.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: acr.listCredentials().passwords[0].value }
        { name: 'KEYVAULT_NAME', value: keyVaultName }
        { name: 'WEBSITES_PORT', value: '80' }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'BACKEND_API_URL', value: 'https://${backendAppName}.azurewebsites.net' }
      ]
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${frontendAppName}:latest'
      alwaysOn: true
      ftpsState: 'Disabled'
      http20Enabled: true
    }
  }
}

// Frontend staging slot
resource frontendStaging 'Microsoft.Web/sites/slots@2021-02-01' = {
  name: '${frontend.name}/staging'
  location: location
  kind: 'app,linux,container'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acr.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: acr.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: acr.listCredentials().passwords[0].value }
        { name: 'KEYVAULT_NAME', value: keyVaultName }
        { name: 'WEBSITES_PORT', value: '80' }
        { name: 'NODE_ENV', value: 'staging' }
        { name: 'BACKEND_API_URL', value: 'https://${backendAppName}-staging.azurewebsites.net' }
      ]
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${frontendAppName}:latest'
      alwaysOn: true
      ftpsState: 'Disabled'
      http20Enabled: true
    }
  }
}

// Backend Web App
resource backend 'Microsoft.Web/sites@2021-02-01' = {
  name: backendAppName
  location: location
  kind: 'app,linux,container'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acr.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: acr.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: acr.listCredentials().passwords[0].value }
        { name: 'KEYVAULT_NAME', value: keyVaultName }
        { name: 'WEBSITES_PORT', value: '3000' }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'KEY_VAULT_ENDPOINT', value: kv.properties.vaultUri }
      ]
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${backendAppName}:latest'
      alwaysOn: true
      ftpsState: 'Disabled'
      http20Enabled: true
    }
  }
}

// Backend staging slot
resource backendStaging 'Microsoft.Web/sites/slots@2021-02-01' = {
  name: '${backend.name}/staging'
  location: location
  kind: 'app,linux,container'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acr.properties.loginServer}' }
        { name: 'DOCKER_REGISTRY_SERVER_USERNAME', value: acr.listCredentials().username }
        { name: 'DOCKER_REGISTRY_SERVER_PASSWORD', value: acr.listCredentials().passwords[0].value }
        { name: 'KEYVAULT_NAME', value: keyVaultName }
        { name: 'WEBSITES_PORT', value: '3000' }
        { name: 'NODE_ENV', value: 'staging' }
        { name: 'KEY_VAULT_ENDPOINT', value: kv.properties.vaultUri }
      ]
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${backendAppName}:latest'
      alwaysOn: true
      ftpsState: 'Disabled'
      http20Enabled: true
    }
  }
}

// Set up Key Vault access policy for backend
resource backendKeyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2022-07-01' = {
  name: '${kv.name}/add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: backend.identity.principalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
      {
        tenantId: subscription().tenantId
        objectId: backendStaging.identity.principalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
    ]
  }
}

// Autoscaling settings for App Service Plan
resource autoscaleSettings 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: '${planName}-autoscale'
  location: location
  properties: {
    enabled: true
    targetResourceUri: plan.id
    profiles: [
      {
        name: 'Default'
        capacity: {
          minimum: '1'
          maximum: '3'
          default: '1'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: plan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: plan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
        ]
      }
    ]
  }
}

// Managed Certificate for custom domain
resource cert 'Microsoft.Web/certificates@2021-02-01' = {
  name: '${frontendAppName}-cert'
  location: location
  properties: {
    serverFarmId: plan.id
    canonicalName: customDomain
  }
}

// Bind the custom domain to the frontend app
resource hostNameBinding 'Microsoft.Web/sites/hostNameBindings@2021-02-01' = {
  parent: frontend
  name: customDomain
  properties: {
    sslState: 'SniEnabled'
    thumbprint: cert.properties.thumbprint
  }
}

// Outputs for use in GitHub Actions
output acrLoginServer string = acr.properties.loginServer
output frontendUrl string = 'https://${frontend.properties.defaultHostName}'
output backendUrl string = 'https://${backend.properties.defaultHostName}'
output frontendStagingUrl string = 'https://${frontendStaging.properties.defaultHostName}'
output backendStagingUrl string = 'https://${backendStaging.properties.defaultHostName}'
