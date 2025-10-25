-- Password Reset OTP Table: Stores one-time passwords for password resets
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    
    -- Indexes for performance
    UNIQUE(email, otp_code)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email_code ON password_reset_otps(email, otp_code);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_used ON password_reset_otps(is_used);

-- Function to clean up expired OTPs (run this periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_otps 
    WHERE expires_at < NOW() OR is_used = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to automatically clean up old OTPs when inserting new ones
CREATE OR REPLACE FUNCTION cleanup_user_otps()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete any existing OTPs for this email
    DELETE FROM password_reset_otps 
    WHERE email = NEW.email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_user_otps_trigger
    BEFORE INSERT ON password_reset_otps
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_user_otps(); 