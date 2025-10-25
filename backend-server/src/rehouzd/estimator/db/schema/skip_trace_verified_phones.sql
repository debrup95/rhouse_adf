-- Skip Trace Phone Verification Table
-- Tracks user verifications of phone numbers for crowd-sourced validation
CREATE TABLE IF NOT EXISTS skip_trace_verified_phones (
    verification_id BIGSERIAL PRIMARY KEY,
    
    -- Phone and buyer identification
    phone_number VARCHAR(20) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    normalized_buyer_name VARCHAR(255) NOT NULL, -- for flexible matching
    
    -- Verification details
    verified_by_user_id BIGINT NOT NULL REFERENCES users(user_id),
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('verified', 'invalid')),
    verification_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate verifications by same user for same phone/buyer combo
    UNIQUE(phone_number, normalized_buyer_name, verified_by_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skip_trace_verified_phones_buyer_name 
    ON skip_trace_verified_phones(normalized_buyer_name);
    
CREATE INDEX IF NOT EXISTS idx_skip_trace_verified_phones_phone 
    ON skip_trace_verified_phones(phone_number);
    
CREATE INDEX IF NOT EXISTS idx_skip_trace_verified_phones_user 
    ON skip_trace_verified_phones(verified_by_user_id);

-- Function to normalize buyer names for flexible matching
CREATE OR REPLACE FUNCTION normalize_buyer_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Convert to lowercase, remove extra spaces, remove common suffixes
    RETURN TRIM(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                LOWER(input_name),
                '\s+(llc|inc|corp|ltd|co|company|properties|investments?|holdings?|group|enterprises?)\s*$',
                '',
                'gi'
            ),
            '\s+',
            ' ',
            'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get phone verification stats for a buyer
CREATE OR REPLACE FUNCTION get_phone_verification_stats(
    p_buyer_name TEXT,
    p_phone_numbers TEXT[]
)
RETURNS TABLE(
    phone_number TEXT,
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
        p.phone_number::TEXT,
        COALESCE(SUM(CASE WHEN svp.verification_status = 'verified' THEN 1 ELSE 0 END), 0)::INTEGER as verified_count,
        COALESCE(SUM(CASE WHEN svp.verification_status = 'invalid' THEN 1 ELSE 0 END), 0)::INTEGER as invalid_count,
        COALESCE(
            SUM(CASE WHEN svp.verification_status = 'verified' THEN 1 ELSE 0 END) - 
            SUM(CASE WHEN svp.verification_status = 'invalid' THEN 1 ELSE 0 END), 
            0
        )::INTEGER as net_verification_score,
        CASE 
            WHEN COALESCE(
                SUM(CASE WHEN svp.verification_status = 'verified' THEN 1 ELSE 0 END) - 
                SUM(CASE WHEN svp.verification_status = 'invalid' THEN 1 ELSE 0 END), 
                0
            ) > 0 THEN 'verified'::VARCHAR(20)
            WHEN COALESCE(
                SUM(CASE WHEN svp.verification_status = 'verified' THEN 1 ELSE 0 END) - 
                SUM(CASE WHEN svp.verification_status = 'invalid' THEN 1 ELSE 0 END), 
                0
            ) < 0 THEN 'invalid'::VARCHAR(20)
            ELSE 'unverified'::VARCHAR(20)
        END as verification_status
    FROM (
        SELECT UNNEST(p_phone_numbers) as phone_number
    ) p
    LEFT JOIN skip_trace_verified_phones svp ON 
        svp.phone_number = REGEXP_REPLACE(p.phone_number, '[^0-9]', '', 'g')
        AND svp.normalized_buyer_name = normalized_name
    GROUP BY p.phone_number
    ORDER BY p.phone_number;
END;
$$ LANGUAGE plpgsql;

-- Function to add phone verification
CREATE OR REPLACE FUNCTION add_phone_verification(
    p_phone_number TEXT,
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
    existing_verification_id BIGINT;
    stats_record RECORD;
BEGIN
    normalized_name := normalize_buyer_name(p_buyer_name);
    
    -- Validate input
    IF p_verification_status NOT IN ('verified', 'invalid') THEN
        RETURN QUERY SELECT FALSE, 'Invalid verification status'::TEXT, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Check if user has already verified this phone/buyer combo
    SELECT verification_id INTO existing_verification_id
    FROM skip_trace_verified_phones
    WHERE phone_number = p_phone_number
      AND normalized_buyer_name = normalized_name
      AND verified_by_user_id = p_user_id;
    
    IF existing_verification_id IS NOT NULL THEN
        -- Update existing verification
        UPDATE skip_trace_verified_phones
        SET verification_status = p_verification_status,
            verification_date = NOW(),
            updated_at = NOW()
        WHERE verification_id = existing_verification_id;
    ELSE
        -- Insert new verification
        INSERT INTO skip_trace_verified_phones (
            phone_number,
            buyer_name,
            normalized_buyer_name,
            verified_by_user_id,
            verification_status
        ) VALUES (
            p_phone_number,
            p_buyer_name,
            normalized_name,
            p_user_id,
            p_verification_status
        );
    END IF;
    
    -- Get updated stats
    SELECT * INTO stats_record
    FROM get_phone_verification_stats(p_buyer_name, ARRAY[p_phone_number])
    WHERE phone_number = p_phone_number;
    
    RETURN QUERY SELECT 
        TRUE,
        'Verification recorded successfully'::TEXT,
        stats_record.verified_count,
        stats_record.invalid_count,
        stats_record.net_verification_score;
END;
$$ LANGUAGE plpgsql; 