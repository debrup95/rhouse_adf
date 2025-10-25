-- Property Images Table: Tracks uploaded property images
CREATE TABLE IF NOT EXISTS property_images (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    property_address VARCHAR(255) NOT NULL,
    container_name VARCHAR(255),
    image_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to users table
    CONSTRAINT fk_property_images_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_property_images_user_id ON property_images(user_id);
CREATE INDEX IF NOT EXISTS idx_property_images_property_address ON property_images(property_address);

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_property_images_updated_at
BEFORE UPDATE ON property_images
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 