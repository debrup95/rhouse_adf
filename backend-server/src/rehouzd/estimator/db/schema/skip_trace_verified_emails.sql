-- Skip Trace Email Verification Table
-- Tracks user verifications of email addresses for crowd-sourced validation
CREATE TABLE IF NOT EXISTS skip_trace_verified_emails (
    verification_id BIGSERIAL PRIMARY KEY,
    
    -- Email and buyer identification
    email_address VARCHAR(255) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    normalized_buyer_name VARCHAR(255) NOT NULL, -- for flexible matching
    
    -- Verification details
    verified_by_user_id BIGINT NOT NULL REFERENCES users(user_id),
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('verified', 'invalid')),
    verification_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate verifications by same user for same email/buyer combo
    UNIQUE(email_address, normalized_buyer_name, verified_by_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skip_trace_verified_emails_buyer_name 
    ON skip_trace_verified_emails(normalized_buyer_name);
    
CREATE INDEX IF NOT EXISTS idx_skip_trace_verified_emails_email 
    ON skip_trace_verified_emails(email_address);
    
CREATE INDEX IF NOT EXISTS idx_skip_trace_verified_emails_user 
    ON skip_trace_verified_emails(verified_by_user_id);

-- Function to get email verification stats for a buyer
CREATE OR REPLACE FUNCTION get_email_verification_stats(
    p_buyer_name TEXT,
    p_emails TEXT[]
)
RETURNS TABLE(
    email_address TEXT,
    verified_count INTEGER,
    invalid_count INTEGER,
    net_verification_score INTEGER,
    verification_status VARCHAR(20)
) AS $$
DECLARE
    normalized_name TEXT;
BEGIN
    normalized_name := normalize_buyer_name(p_buyer_name);
    
    RETURN QUERY
    SELECT 
        e.email_address::TEXT,
        COALESCE(SUM(CASE WHEN sve.verification_status = 'verified' THEN 1 ELSE 0 END), 0)::INTEGER as verified_count,
        COALESCE(SUM(CASE WHEN sve.verification_status = 'invalid' THEN 1 ELSE 0 END), 0)::INTEGER as invalid_count,
        COALESCE(
            SUM(CASE WHEN sve.verification_status = 'verified' THEN 1 ELSE 0 END) - 
            SUM(CASE WHEN sve.verification_status = 'invalid' THEN 1 ELSE 0 END), 
            0
        )::INTEGER as net_verification_score,
        CASE 
            WHEN COALESCE(
                SUM(CASE WHEN sve.verification_status = 'verified' THEN 1 ELSE 0 END) - 
                SUM(CASE WHEN sve.verification_status = 'invalid' THEN 1 ELSE 0 END), 
                0
            ) > 0 THEN 'verified'::VARCHAR(20)
            WHEN COALESCE(
                SUM(CASE WHEN sve.verification_status = 'verified' THEN 1 ELSE 0 END) - 
                SUM(CASE WHEN sve.verification_status = 'invalid' THEN 1 ELSE 0 END), 
                0
            ) < 0 THEN 'invalid'::VARCHAR(20)
            ELSE 'unverified'::VARCHAR(20)
        END as verification_status
    FROM (
        SELECT UNNEST(p_emails) as email_address
    ) e
    LEFT JOIN skip_trace_verified_emails sve ON 
        LOWER(TRIM(sve.email_address)) = LOWER(TRIM(e.email_address))
        AND sve.normalized_buyer_name = normalized_name
    GROUP BY e.email_address
    ORDER BY e.email_address;
END;
$$ LANGUAGE plpgsql;

-- Function to add email verification
CREATE OR REPLACE FUNCTION add_email_verification(
    p_email_address TEXT,
    p_buyer_name TEXT,
    p_user_id BIGINT,
    p_verification_status VARCHAR(20)
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    new_verified_count INTEGER,
    new_invalid_count INTEGER,
    new_net_score INTEGER
) AS $$
DECLARE
    normalized_name TEXT;
    cleaned_email TEXT;
    existing_verification_id BIGINT;
    stats_record RECORD;
BEGIN
    normalized_name := normalize_buyer_name(p_buyer_name);
    cleaned_email := LOWER(TRIM(p_email_address));
    
    -- Validate input
    IF p_verification_status NOT IN ('verified', 'invalid') THEN
        RETURN QUERY SELECT FALSE, 'Invalid verification status'::TEXT, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Basic email format validation
    IF cleaned_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
        RETURN QUERY SELECT FALSE, 'Invalid email format'::TEXT, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Check if user has already verified this email/buyer combo
    SELECT verification_id INTO existing_verification_id
    FROM skip_trace_verified_emails
    WHERE LOWER(TRIM(email_address)) = cleaned_email
      AND normalized_buyer_name = normalized_name
      AND verified_by_user_id = p_user_id;
    
    IF existing_verification_id IS NOT NULL THEN
        -- Update existing verification
        UPDATE skip_trace_verified_emails
        SET verification_status = p_verification_status,
            verification_date = NOW(),
            updated_at = NOW()
        WHERE verification_id = existing_verification_id;
    ELSE
        -- Insert new verification
        INSERT INTO skip_trace_verified_emails (
            email_address,
            buyer_name,
            normalized_buyer_name,
            verified_by_user_id,
            verification_status
        ) VALUES (
            cleaned_email,
            p_buyer_name,
            normalized_name,
            p_user_id,
            p_verification_status
        );
    END IF;
    
    -- Get updated stats
    SELECT * INTO stats_record
    FROM get_email_verification_stats(p_buyer_name, ARRAY[cleaned_email])
    WHERE email_address = cleaned_email;
    
    RETURN QUERY SELECT 
        TRUE,
        'Email verification recorded successfully'::TEXT,
        stats_record.verified_count,
        stats_record.invalid_count,
        stats_record.net_verification_score;
END;
$$ LANGUAGE plpgsql;