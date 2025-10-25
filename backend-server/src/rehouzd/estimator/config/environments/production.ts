export default {
  env: 'production',
  db: {
    // host: process.env.DB_HOST,
    // port: parseInt(process.env.DB_PORT || '5432'),
    // database: process.env.DB_NAME,
    // user: process.env.DB_USER,
    // password: process.env.DB_PASSWORD,
    // host: process.env.DB_HOST || 'localhost',
    // port: parseInt(process.env.DB_PORT || '5432'),
    // database: process.env.DB_NAME || 'postgres',
    // user: process.env.DB_USER || 'postgres',
    // password: process.env.DB_PASSWORD || 'postgres',
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  },
  logLevel: 'warn',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
}; 