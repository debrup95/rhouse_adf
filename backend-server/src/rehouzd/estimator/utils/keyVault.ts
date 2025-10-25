import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import logger from './logger';

/**
 * Utility for accessing Azure Key Vault secrets
 */
class KeyVaultService {
  private client: SecretClient | null = null;
  private isInitialized = false;
  private readonly keyVaultName: string | undefined;

  constructor() {
    this.keyVaultName = process.env.KEYVAULT_NAME;
  }

  /**
   * Initialize the Key Vault client
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (!this.keyVaultName) {
      logger.warn('Key Vault name not provided. Key Vault integration disabled.');
      return false;
    }

    // In production or test, DefaultAzureCredential will attempt to use Managed Identity.
    // For local development, it can use other credentials like Azure CLI.
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
      try {
        logger.info(`Initializing Key Vault client for ${process.env.NODE_ENV} (attempting Managed Identity)`);
        const credential = new DefaultAzureCredential(); // Automatically handles Managed Identity in Azure
        const keyVaultUrl = `https://${this.keyVaultName}.vault.azure.net`;
        
        this.client = new SecretClient(keyVaultUrl, credential);
        this.isInitialized = true;
        
        logger.info(`Key Vault client initialized successfully for ${process.env.NODE_ENV}.`);
        return true;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Failed to start server: ${err.message}`);
        logger.error(err.stack);
        return false;
      }
    } else {
      // Optional: Handle local development differently, e.g., by not initializing
      // or by using a different auth method if you have local secrets/setup.
      // For now, we'll just disable it for non-production if relying on managed identity.
      logger.warn('Key Vault integration is primarily designed for production with Managed Identity. Disabled for non-production.');
      return false;
    }
  }

  /**
   * Get a secret from Key Vault
   * @param secretName The name of the secret
   * @returns The secret value or null if not found
   */
  public async getSecret(secretName: string): Promise<string | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        logger.warn(`Key Vault not initialized. Cannot get secret: ${secretName}`);
        return null;
      }
    }

    try {
      if (!this.client) {
        logger.warn(`Key Vault client is not available. Cannot get secret: ${secretName}`);
        return null;
      }

      const secret = await this.client.getSecret(secretName);
      return secret.value || null;
    } catch (error) {
      logger.error(`Failed to get secret: ${secretName}`, { error });
      return null;
    }
  }
}

// Export a singleton instance
export const keyVaultService = new KeyVaultService();

export default keyVaultService; 