-- Add unique constraint to prevent duplicate user access charges
-- This ensures a user can only be charged once per lookup
ALTER TABLE skip_trace_user_access 
ADD CONSTRAINT unique_user_lookup_access 
UNIQUE (user_id, lookup_id);

-- Create index for better performance on cache lookups
CREATE INDEX IF NOT EXISTS idx_skip_trace_user_access_user_lookup 
ON skip_trace_user_access (user_id, lookup_id);