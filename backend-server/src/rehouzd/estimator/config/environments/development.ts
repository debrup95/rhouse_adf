export default {
  env: 'development',
  db: {
    // host: process.env.DB_HOST || 'localhost',
    // port: parseInt(process.env.DB_PORT || '5432'),
    // database: process.env.DB_NAME || 'postgres',
    // user: process.env.DB_USER || 'postgres',
    // password: process.env.DB_PASSWORD || 'postgres',
    connectionString: process.env.DATABASE_URL,
  },
  logLevel: 'debug',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
}; 