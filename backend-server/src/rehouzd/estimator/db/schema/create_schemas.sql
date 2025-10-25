-- Create Schemas Script for Local Development
-- This script creates the bronze and silver schemas if they don't exist

-- Create bronze schema for raw data tables
CREATE SCHEMA IF NOT EXISTS bronze;

-- Create silver schema for processed data tables  
CREATE SCHEMA IF NOT EXISTS silver;

-- Grant necessary permissions (adjust as needed for your environment)
-- For local development, these permissions should be sufficient
GRANT USAGE ON SCHEMA bronze TO PUBLIC;
GRANT CREATE ON SCHEMA bronze TO PUBLIC;
GRANT USAGE ON SCHEMA silver TO PUBLIC;
GRANT CREATE ON SCHEMA silver TO PUBLIC;

-- Log completion
SELECT 'Schemas created successfully' AS status; 