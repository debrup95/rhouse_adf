import fs from 'fs';
import path from 'path';
import { query } from '../../config/db';
import logger from '../../utils/logger';

/**
 * Resolves a schema file path, handling relative paths
 * @param filePath Relative or absolute file path
 * @param basePath Base directory for relative paths
 * @returns Resolved absolute file path
 */
const resolveSchemaPath = (filePath: string, basePath: string): string => {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.join(basePath, filePath);
};

/**
 * Processes and executes a SQL script, handling \i directives
 * @param filePath Path to the SQL script file
 * @returns Promise that resolves when script execution is complete
 */
export const processSchemaFile = async (filePath: string): Promise<void> => {
  try {
    const resolvedPath = path.resolve(filePath);
    const basePath = path.dirname(resolvedPath);
    
    logger.info('Processing schema file', { path: resolvedPath });
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Schema file not found: ${resolvedPath}`);
    }
    
    const scriptContent = fs.readFileSync(resolvedPath, 'utf8');
    const lines = scriptContent.split('\n');
    
    // Process each line in the script
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for include directive
      if (line.startsWith('\\i ')) {
        // Extract the included file path
        const includePath = line.substring(3).trim();
        const resolvedIncludePath = resolveSchemaPath(includePath, basePath);
        
        // Recursively process the included file
        await processSchemaFile(resolvedIncludePath);
      } else if (line.length > 0 && !line.startsWith('--')) {
        // Collect SQL statements until we hit a semicolon
        let statement = line;
        let j = i + 1;
        
        // If the line doesn't end with semicolon and isn't blank,
        // continue collecting the statement
        while (j < lines.length && 
              !statement.trim().endsWith(';') && 
              lines[j].trim().length > 0) {
          statement += ' ' + lines[j].trim();
          j++;
        }
        
        // If we collected multiple lines, adjust the line counter
        if (j > i + 1) {
          i = j - 1;
        }
        
        // Only execute non-empty statements that end with semicolon
        if (statement.trim().length > 0 && statement.trim().endsWith(';')) {
          await query(statement);
        }
      }
    }
    
    logger.info('Successfully processed schema file', { path: resolvedPath });
  } catch (error) {
    logger.error('Error processing schema file', { path: filePath, error });
    throw error;
  }
};

/**
 * Loads and executes the database schema
 */
export const loadDatabaseSchema = async (): Promise<void> => {
  const createSchemasPath = path.resolve(__dirname, '../schema/create_schemas.sql');
  const schemaIndexPath = path.resolve(__dirname, '../schema/index.sql');
  
  logger.info('Loading database schema', { schemaIndexPath });
  
  try {
    // First, create the bronze and silver schemas
    logger.info('Creating bronze and silver schemas');
    await processSchemaFile(createSchemasPath);
    
    // Then, load the main schema
    await processSchemaFile(schemaIndexPath);
    logger.info('Database schema loaded successfully');
  } catch (error) {
    logger.error('Failed to load database schema', { error });
    throw error;
  }
};

export default loadDatabaseSchema; 