-- Shared Estimates Table: Enables public sharing of property estimates and PDF reports
-- This table creates shareable links for saved estimates with expiration and access control
CREATE TABLE IF NOT EXISTS shared_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_estimate_id BIGINT NOT NULL,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
    view_count INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    shared_by_user_id BIGINT NOT NULL,
    
    -- PDF Report specific fields  
    report_strategy VARCHAR(10) NOT NULL CHECK (report_strategy IN ('rent', 'flip')),
    preset_values JSONB, -- Stores rehab calculator values for PDF reports
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key to saved_estimates table
    CONSTRAINT fk_shared_estimates_saved_estimate
        FOREIGN KEY (saved_estimate_id)
        REFERENCES saved_estimates(id)
        ON DELETE CASCADE,
        
    -- Foreign key to users table for tracking who shared the estimate
    CONSTRAINT fk_shared_estimates_user
        FOREIGN KEY (shared_by_user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_shared_estimates_share_token ON shared_estimates(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_estimates_saved_estimate_id ON shared_estimates(saved_estimate_id);
CREATE INDEX IF NOT EXISTS idx_shared_estimates_shared_by_user_id ON shared_estimates(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_estimates_is_active ON shared_estimates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_shared_estimates_expires_at ON shared_estimates(expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_estimates_created_at ON shared_estimates(created_at);
CREATE INDEX IF NOT EXISTS idx_shared_estimates_report_strategy ON shared_estimates(report_strategy);

-- Composite index for active, non-expired links (removed NOW() function as it's not immutable)
CREATE INDEX IF NOT EXISTS idx_shared_estimates_active_valid 
ON shared_estimates(share_token, is_active, expires_at) 
WHERE is_active = TRUE;

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_shared_estimates_updated_at
BEFORE UPDATE ON shared_estimates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique share tokens
-- Note: Using fallback method since pgcrypto extension is not available in Azure Database for PostgreSQL
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(255) AS $$
DECLARE
    token VARCHAR(255);
    token_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random token using built-in functions (Azure PostgreSQL compatible)
        token := LOWER(
            CONCAT(
                MD5(random()::text || NOW()::text),
                TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT % 1000000, 'FM000000')
            )
        );
        
        -- Remove any URL-unsafe characters and ensure it's exactly 32 characters
        token := REPLACE(REPLACE(REPLACE(token, '+', ''), '/', ''), '=', '');
        token := SUBSTRING(token, 1, 32);
        
        -- Pad with additional characters if needed
        WHILE LENGTH(token) < 32 LOOP
            token := token || SUBSTRING(MD5(random()::text), 1, 32 - LENGTH(token));
        END LOOP;
        
        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM shared_estimates WHERE share_token = token) INTO token_exists;
        
        -- Exit loop if token is unique
        IF NOT token_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a shared estimate is valid and accessible
CREATE OR REPLACE FUNCTION is_shared_estimate_valid(token VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM shared_estimates 
        WHERE share_token = token 
        AND is_active = TRUE 
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count atomically
CREATE OR REPLACE FUNCTION increment_shared_estimate_view(token VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    UPDATE shared_estimates 
    SET 
        view_count = view_count + 1,
        last_accessed = NOW()
    WHERE share_token = token 
    AND is_active = TRUE 
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment interaction count atomically
CREATE OR REPLACE FUNCTION increment_shared_estimate_interaction(token VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    UPDATE shared_estimates 
    SET 
        interaction_count = interaction_count + 1,
        last_accessed = NOW()
    WHERE share_token = token 
    AND is_active = TRUE 
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;