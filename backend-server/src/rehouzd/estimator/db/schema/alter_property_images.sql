ALTER TABLE property_images 
ADD COLUMN target_price VARCHAR(50) NULL;
ADD COLUMN property_beds VARCHAR(20) NULL;
ADD COLUMN property_baths VARCHAR(20) NULL;
ADD COLUMN property_sqft VARCHAR(20) NULL;
ADD COLUMN property_year VARCHAR(20) NULL;
ADD COLUMN photo_url TEXT NULL;
ADD COLUMN images_data JSONB NULL;
ADD COLUMN status VARCHAR(50) DEFAULT 'pending' NULL;
ADD COLUMN admin_notes TEXT NULL;
ADD COLUMN processed_by BIGINT NULL;
ADD COLUMN processed_at TIMESTAMPTZ NULL;
ADD COLUMN request_type VARCHAR(50) DEFAULT 'getoffer' NULL;

-- Add foreign key constraint for processed_by
ALTER TABLE property_images 
ADD CONSTRAINT fk_property_images_processed_by 
FOREIGN KEY (processed_by) 
REFERENCES users(user_id) 
ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_images_status ON property_images(status);
CREATE INDEX IF NOT EXISTS idx_property_images_request_type ON property_images(request_type);
CREATE INDEX IF NOT EXISTS idx_property_images_created_at ON property_images(created_at);
CREATE INDEX IF NOT EXISTS idx_property_images_target_price ON property_images(target_price);

-- Add GIN index for JSONB column
CREATE INDEX IF NOT EXISTS idx_property_images_images_data ON property_images USING GIN (images_data);