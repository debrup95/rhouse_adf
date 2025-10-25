-- Fix underwrite_requests foreign key constraint issue
-- Make user_id nullable and drop FK constraint to allow requests without existing users

-- Drop the existing foreign key constraint if it exists
ALTER TABLE underwrite_requests
DROP CONSTRAINT IF EXISTS fk_underwrite_requests_user;

-- Make user_id nullable
ALTER TABLE underwrite_requests
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining why FK constraint was removed
COMMENT ON COLUMN underwrite_requests.user_id IS 'User ID - nullable to allow requests from users that may not exist in the users table yet (e.g., during registration flow)';
