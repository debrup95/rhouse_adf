-- Fix property_images foreign key constraint issue
-- Make user_id nullable and drop FK constraint to allow requests without existing users

-- Drop the existing foreign key constraint
ALTER TABLE property_images
DROP CONSTRAINT IF EXISTS fk_property_images_user;

-- Make user_id nullable
ALTER TABLE property_images
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining why FK constraint was removed
COMMENT ON COLUMN property_images.user_id IS 'User ID - nullable to allow requests from users that may not exist in the users table yet (e.g., during registration flow)';
