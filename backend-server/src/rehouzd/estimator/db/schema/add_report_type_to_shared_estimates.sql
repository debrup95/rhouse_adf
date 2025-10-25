-- Add report_type column to shared_estimates table
-- This allows distinguishing between investor reports and seller reports

-- Add the report_type column with a default value of 'investor' for backward compatibility
ALTER TABLE shared_estimates 
ADD COLUMN IF NOT EXISTS report_type VARCHAR(10) DEFAULT 'investor' 
CHECK (report_type IN ('investor', 'seller'));

-- Update existing records to have 'investor' as the report type (they are all investor reports)
UPDATE shared_estimates 
SET report_type = 'investor' 
WHERE report_type IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE shared_estimates 
ALTER COLUMN report_type SET NOT NULL;

-- Add index for report_type for better query performance
CREATE INDEX IF NOT EXISTS idx_shared_estimates_report_type ON shared_estimates(report_type);

-- Add composite index for report_type and other commonly queried fields
CREATE INDEX IF NOT EXISTS idx_shared_estimates_report_type_active 
ON shared_estimates(report_type, is_active, expires_at) 
WHERE is_active = TRUE;
