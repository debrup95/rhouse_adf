export interface AppConfig {
  NODE_ENV: string;
  PORT: string;
  KEYVAULT_NAME?: string;

  // DB
  DB_CONNECTION_STRING?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;

  // Services
  AZURE_STORAGE_ACCOUNT?: string;
  AZURE_STORAGE_KEY?: string;
  PARCL_LABS_API_KEY?: string;
  LEAD_SHERPA_API_KEY?: string;
  BATCH_DATA_API_KEY?: string;
  SKIP_TRACE_PRIMARY_PROVIDER?: string;

  // Stripe Configuration
  STRIPE_SECRET_KEY?: string;
  // STRIPE_WEBHOOK_SECRET?: string;

  // Email
  EMAIL_HOST?: string;
  EMAIL_PORT?: string;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  EMAIL_FROM?: string;

  // Server
  SERVER_HOST?: string;
  HOST?: string;
  FRONTEND_URL?: string;

  // Database - Azure SQL (alternative)
  AZURE_SQL_SERVER?: string;
  AZURE_SQL_DATABASE?: string;
  AZURE_SQL_USER?: string;
  AZURE_SQL_PASSWORD?: string;
  DB_SSL?: string;

  // Auth & OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL?: string;
  GOOGLE_OAUTH_URL?: string;
  GOOGLE_ACCESS_TOKEN_URL?: string;
  GOOGLE_TOKEN_INFO_URL?: string;

  // Google Photos OAuth (separate from main auth)
  GOOGLE_PHOTOS_CLIENT_ID?: string;
  GOOGLE_PHOTOS_CLIENT_SECRET?: string;

  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;

  // SMTP alias
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;

  // CORS
  CORS_ORIGIN?: string;

  // Azure Communication Services
  AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING?: string;
  ACS_SENDER_EMAIL?: string;
  ADMIN_EMAIL?: string;
}

type AppConfigKey = keyof AppConfig;

// This object is a mapping of the secret name (as stored in keyvault) to the ENV variable name that will be created
// Key vault keys could not be saved with underscores
// Every key in this object will be fetched before the server starts

// Environment-specific secret mappings
const getSecretMappings = (): Record<string, AppConfigKey> => {
  const isTest = process.env.NODE_ENV === 'test';
  
  return {
    [isTest ? "DATABASE-URL-TEST" : "DATABASE-URL"]: "DB_CONNECTION_STRING",
  "AZURE-STORAGE-ACCOUNT": "AZURE_STORAGE_ACCOUNT",
  "AZURE-STORAGE-KEY": "AZURE_STORAGE_KEY",
  "PARCL-LABS-API-KEY": "PARCL_LABS_API_KEY",
  "LEAD-SHERPA-API-KEY": "LEAD_SHERPA_API_KEY",
  "BATCH-DATA-API-KEY": "BATCH_DATA_API_KEY",
  "SKIP-TRACE-PRIMARY-PROVIDER": "SKIP_TRACE_PRIMARY_PROVIDER",
  
  // Stripe Configuration
  [isTest ? "STRIPE-SECRET-KEY-TEST" : "STRIPE-SECRET-KEY"]: "STRIPE_SECRET_KEY",
  // "STRIPE-WEBHOOK-SECRET": "STRIPE_WEBHOOK_SECRET",
  
  [isTest ? "CORS-ORIGIN-TEST" : "CORS-ORIGIN"]: "CORS_ORIGIN",
  "DB-HOST": "DB_HOST",
  "DB-NAME": "DB_NAME",
  "DB-PASSWORD": "DB_PASSWORD",
  "DB-PORT": "DB_PORT",
  "DB-USER": "DB_USER",
  "EMAIL-FROM": "EMAIL_FROM",
  "EMAIL-HOST": "EMAIL_HOST",
  "EMAIL-PASS": "EMAIL_PASS",
  "EMAIL-PORT": "EMAIL_PORT",
  "EMAIL-USER": "EMAIL_USER",
  "GOOGLE-CALLBACK-URL": "GOOGLE_CALLBACK_URL",
  "JWT-EXPIRES-IN": "JWT_EXPIRES_IN",
  "JWT-SECRET": "JWT_SECRET",
  "SMTP-HOST": "SMTP_HOST",
  "SMTP-PASS": "SMTP_PASS",
  "SMTP-PORT": "SMTP_PORT",
  "SMTP-USER": "SMTP_USER",
  "GOOGLE-CLIENT-ID": "GOOGLE_CLIENT_ID",
  "GOOGLE-CLIENT-SECRET": "GOOGLE_CLIENT_SECRET",
  "GOOGLE-OAUTH-URL": "GOOGLE_OAUTH_URL",
  "GOOGLE-ACCESS-TOKEN-URL": "GOOGLE_ACCESS_TOKEN_URL",
  "GOOGLE-TOKEN-INFO-URL": "GOOGLE_TOKEN_INFO_URL",
  "GOOGLE-PHOTOS-CLIENT-ID": "GOOGLE_PHOTOS_CLIENT_ID",
  "GOOGLE-PHOTOS-CLIENT-SECRET": "GOOGLE_PHOTOS_CLIENT_SECRET",
  "FRONTEND-URL": "FRONTEND_URL",
  "HOST": "HOST",
  "DB-SSL": "DB_SSL",
  "AZURE-SQL-SERVER": "AZURE_SQL_SERVER",
  "AZURE-SQL-DATABASE": "AZURE_SQL_DATABASE",
  "AZURE-SQL-USER": "AZURE_SQL_USER",
  "AZURE-SQL-PASSWORD": "AZURE_SQL_PASSWORD",
  "AZURE-COMMUNICATION-SERVICES-CONNECTION-STRING": "AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING",
  "ACS-SENDER-EMAIL": "ACS_SENDER_EMAIL",
  "ADMIN-EMAIL": "ADMIN_EMAIL",
  };
};

export const secretMappings = getSecretMappings();
