import { Pool } from 'pg';
import logger from '../utils/logger';

// Create a pool instance with our configuration
// Prefer DATABASE_URL (connection string) over individual parameters
const getDatabaseConfig = () => {
  const connectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING;
  
  if (connectionString) {
    // Use connection string (preferred for production and test)
    return {
      connectionString,
      max: 100, // Increased for batch operations
      min: 10,  // Increased minimum connections
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 15000,
      ssl: (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test')
        ? { rejectUnauthorized: false }
        : false
    };
  } else {
    // Fallback to individual parameters (for local development)
    return {
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rehouzd',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 100, // Increased for batch operations
      min: 10,  // Increased minimum connections
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 15000,
      ssl: false
    };
  }
};

const pool = new Pool(getDatabaseConfig());

// Log pool events for monitoring
pool.on('connect', (client) => {
  logger.debug('New client connected to database', { 
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

// pool.on('acquire', (client) => {
//   logger.debug('Client acquired from pool', { 
//     totalCount: pool.totalCount,
//     idleCount: pool.idleCount,
//     waitingCount: pool.waitingCount
//   });
// });

// pool.on('remove', (client) => {
//   logger.debug('Client removed from pool', { 
//     totalCount: pool.totalCount,
//     idleCount: pool.idleCount,
//     waitingCount: pool.waitingCount
//   });
// });

// Log pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { 
    error: err,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
  // Don't exit the process immediately, let the application handle the error
});

// Simple query method with better error handling
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // logger.debug('Executed query', { 
    //   query: text.substring(0, 100) + (text.length > 100 ? '...' : ''), // Truncate long queries in logs
    //   duration, 
    //   rows: res.rowCount,
    //   poolStats: {
    //     totalCount: pool.totalCount,
    //     idleCount: pool.idleCount,
    //     waitingCount: pool.waitingCount
    //   }
    // });
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Error executing query', { 
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      error: error instanceof Error ? error.message : String(error),
      duration,
      params: params ? params.length : 0,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    });
    throw error;
  }
};

// Health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    logger.info('Database health check passed', {
      currentTime: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0], // Just the PostgreSQL version number
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    });
    return true;
  } catch (error) {
    logger.error('Database health check failed', { 
      error: error instanceof Error ? error.message : String(error),
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      }
    });
    return false;
  }
};

// Graceful shutdown function
export const closeDatabasePool = async (): Promise<void> => {
  try {
    logger.info('Closing database connection pool...');
    await pool.end();
    logger.info('Database connection pool closed successfully');
  } catch (error) {
    logger.error('Error closing database connection pool', { 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export default pool;
