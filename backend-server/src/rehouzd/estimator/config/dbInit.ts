import { query } from './db';
import logger from '../utils/logger';
import loadDatabaseSchema from '../db/utils/schemaLoader';

// Initialize database tables
const runSQLScript = async (): Promise<void> => {
  try {
    logger.info('Initializing database tables...');
    
    // Load the database schema using our custom schema loader
    await loadDatabaseSchema();
    
    logger.info('Database tables initialized successfully');
    
    // Test connection
    const testResult = await query('SELECT NOW() as now');
    logger.info('Database connection test successful', { 
      timestamp: testResult.rows[0].now 
    });
    
    return Promise.resolve();
  } catch (error) {
    logger.error('Failed to initialize database tables', { error });
    
    // Only exit in production, allow development to continue
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    return Promise.reject(error);
  }
};

export default runSQLScript;
