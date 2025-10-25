// file: src/config/index.ts
import dotenv from "dotenv";
import path from "path";
// note: I think these could just be moved to .env files
// then dotenv.config() can point to the correct env file based on NODE_ENV
// .env.development and .env.production (assuming no secrets are present)
// import development from './environments/development';
// import production from './environments/production';
import { AppConfig, secretMappings } from "./environments/envInterfaces";
import { keyVaultService } from "../utils/keyVault";
import logger from "../utils/logger";

// Get environment
const ENV = process.env.NODE_ENV || "local";

// Load dotenv based on env
if (ENV === "local") {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
} else if (ENV === "development") {
  // this is not configured
  dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
} else if (ENV === "production") {
  // this is not configured, default ENV are currently passed in during CICD
  dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });
}

// Initial config from env (dotenv or injected during deploy)
const initialConfig: AppConfig = {
  // There should only be secrets here if running locally
  NODE_ENV: ENV,
  PORT: process.env.PORT || "5004",
  KEYVAULT_NAME: process.env.KEYVAULT_NAME,

  DB_CONNECTION_STRING: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  AZURE_STORAGE_ACCOUNT: process.env.AZURE_STORAGE_ACCOUNT,
  AZURE_STORAGE_KEY: process.env.AZURE_STORAGE_KEY,
  PARCL_LABS_API_KEY: process.env.PARCL_LABS_API_KEY,
  LEAD_SHERPA_API_KEY: process.env.LEAD_SHERPA_API_KEY,
  BATCH_DATA_API_KEY: process.env.BATCH_DATA_API_KEY,
  SKIP_TRACE_PRIMARY_PROVIDER: process.env.SKIP_TRACE_PRIMARY_PROVIDER,

  // Stripe Configuration
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  // STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  SERVER_HOST: process.env.HOST,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  GOOGLE_OAUTH_URL: process.env.GOOGLE_OAUTH_URL,
  GOOGLE_ACCESS_TOKEN_URL: process.env.GOOGLE_ACCESS_TOKEN_URL,
  GOOGLE_TOKEN_INFO_URL: process.env.GOOGLE_TOKEN_INFO_URL,
  GOOGLE_PHOTOS_CLIENT_ID: process.env.GOOGLE_PHOTOS_CLIENT_ID,
  GOOGLE_PHOTOS_CLIENT_SECRET: process.env.GOOGLE_PHOTOS_CLIENT_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  CORS_ORIGIN: process.env.CORS_ORIGIN,

  // Additional server config
  HOST: process.env.HOST,
  FRONTEND_URL: process.env.FRONTEND_URL,
  DB_SSL: process.env.DB_SSL,

  // Azure SQL (alternative database)
  AZURE_SQL_SERVER: process.env.AZURE_SQL_SERVER,
  AZURE_SQL_DATABASE: process.env.AZURE_SQL_DATABASE,
  AZURE_SQL_USER: process.env.AZURE_SQL_USER,
  AZURE_SQL_PASSWORD: process.env.AZURE_SQL_PASSWORD,

  // Azure Communication Services
  AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING: process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING,
  ACS_SENDER_EMAIL: process.env.ACS_SENDER_EMAIL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
};

// Create a config object that will be populated by loadConfiguration
let config: AppConfig = { ...initialConfig };

// Load configuration from Key Vault in production
export const loadConfiguration = async (): Promise<AppConfig> => {
  logger.info("Loading application configuration...");

  // Start with initial values from environment
  config = { ...initialConfig };
  logger.info(`Loaded initial config for env: ${ENV}`);

  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") {
    logger.info(
      `${process.env.NODE_ENV} mode: Loading secrets from Key Vault: ${config.KEYVAULT_NAME} ${process.env.KEYVAULT_NAME}`
    );
    const kvInitialized = await keyVaultService.initialize();

    if (!kvInitialized) {
      logger.error("Failed to initialize Key Vault");
      throw new Error(`Key Vault initialization failed in ${process.env.NODE_ENV}.`);
    }

    logger.debug("Looping through secret mappings to retrieve each secret.");
    for (const [secretName, configKey] of Object.entries(secretMappings)) {
      logger.debug(
        `Attempting to retrieve secret: '${secretName}' to store as env var: '${configKey}'`
      );
      const secretValue = await keyVaultService.getSecret(secretName);
      if (secretValue) {
        logger.debug(`Found value for ${secretName}`);
        config[configKey] = secretValue;
      }
    }

    logger.info("Secrets retrieved successfully from Key Vault.");
  } else {
    logger.warn(
      "Not in production or no Key Vault. Using .env/system environment variables."
    );
  }

  // Can add a check here for required secrets
  // if (!config.PARCL_LABS_API_KEY) {
  //   logger.error('Parcl Labs API key is not set');
  // }

  logger.info("Setting retrieved secrets as environment variables.");
  for (const [key, value] of Object.entries(config)) {
    if (value !== undefined && value !== null) {
      process.env[key] = String(value);
      logger.debug(`Environment variable set: ${key}=<hidden>`);
    }
  }

  logger.info("Configuration loaded successfully.");
  return config;
};

// This export is for backward compatibility, but should not be used
// before loadConfiguration() is called
export default config;
