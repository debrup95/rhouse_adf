-- Skip Trace Functions: Useful functions for credit management and operations

-- Function: Get user's total available credits
CREATE OR REPLACE FUNCTION get_user_skip_trace_credits(p_user_id BIGINT)
RETURNS TABLE(
    free_credits INTEGER,
    paid_credits INTEGER,
    total_credits INTEGER,
    total_used INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(stc.free_credits_remaining, 3) AS free_credits,
        COALESCE(stc.paid_credits_remaining, 0) AS paid_credits,
        COALESCE(stc.free_credits_remaining, 3) + COALESCE(stc.paid_credits_remaining, 0) AS total_credits,
        COALESCE(stc.total_free_credits_used + stc.total_paid_credits_used, 0) AS total_used
    FROM users u
    LEFT JOIN skip_trace_credits stc ON u.user_id = stc.user_id
    WHERE u.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Consume skip trace credit (with transaction safety)
CREATE OR REPLACE FUNCTION consume_skip_trace_credit(
    p_user_id BIGINT,
    p_lookup_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    credit_type VARCHAR(10),
    remaining_free INTEGER,
    remaining_paid INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_free_credits INTEGER := 0;
    v_paid_credits INTEGER := 0;
    v_credit_type VARCHAR(10);
    v_error_message TEXT := NULL;
    v_success BOOLEAN := FALSE;
BEGIN
    -- Get current credits with row locking to prevent race conditions
    SELECT 
        COALESCE(free_credits_remaining, 3),
        COALESCE(paid_credits_remaining, 0)
    INTO v_free_credits, v_paid_credits
    FROM skip_trace_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- If no record exists, create one with default free credits
    IF NOT FOUND THEN
        INSERT INTO skip_trace_credits (user_id, free_credits_remaining)
        VALUES (p_user_id, 3)
        ON CONFLICT (user_id) DO NOTHING;
        
        v_free_credits := 3;
        v_paid_credits := 0;
    END IF;
    
    -- Check if user has any credits
    IF v_free_credits + v_paid_credits <= 0 THEN
        v_error_message := 'Insufficient credits';
        v_success := FALSE;
    ELSE
        -- Consume free credits first, then paid credits
        IF v_free_credits > 0 THEN
            v_credit_type := 'free';
            v_free_credits := v_free_credits - 1;
            
            UPDATE skip_trace_credits
            SET 
                free_credits_remaining = v_free_credits,
                total_free_credits_used = total_free_credits_used + 1,
                total_lookups_performed = total_lookups_performed + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
        ELSE
            v_credit_type := 'paid';
            v_paid_credits := v_paid_credits - 1;
            
            UPDATE skip_trace_credits
            SET 
                paid_credits_remaining = v_paid_credits,
                total_paid_credits_used = total_paid_credits_used + 1,
                total_lookups_performed = total_lookups_performed + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id;
        END IF;
        
        v_success := TRUE;
    END IF;
    
    RETURN QUERY SELECT 
        v_success,
        v_credit_type,
        v_free_credits,
        v_paid_credits,
        v_error_message;
END;
$$ LANGUAGE plpgsql;

-- Function: Add paid credits to user account
CREATE OR REPLACE FUNCTION add_skip_trace_credits(
    p_user_id BIGINT,
    p_credits INTEGER,
    p_purchase_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    new_paid_balance INTEGER,
    new_total_balance INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_new_paid_balance INTEGER;
    v_new_total_balance INTEGER;
    v_error_message TEXT := NULL;
    v_success BOOLEAN := FALSE;
BEGIN
    -- Validate input
    IF p_credits <= 0 THEN
        v_error_message := 'Credits must be positive';
        v_success := FALSE;
    ELSE
        -- Insert or update credits record
        INSERT INTO skip_trace_credits (
            user_id, 
            paid_credits_remaining
        )
        VALUES (p_user_id, p_credits)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            paid_credits_remaining = skip_trace_credits.paid_credits_remaining + p_credits,
            updated_at = NOW();
        
        -- Get updated balances
        SELECT 
            paid_credits_remaining,
            free_credits_remaining + paid_credits_remaining
        INTO v_new_paid_balance, v_new_total_balance
        FROM skip_trace_credits
        WHERE user_id = p_user_id;
        
        v_success := TRUE;
    END IF;
    
    RETURN QUERY SELECT 
        v_success,
        v_new_paid_balance,
        v_new_total_balance,
        v_error_message;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user's skip trace history with pagination
CREATE OR REPLACE FUNCTION get_user_skip_trace_history(
    p_user_id BIGINT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    lookup_id BIGINT,
    lookup_date TIMESTAMPTZ,
    input_address TEXT,
    input_owner_name TEXT,
    credit_type VARCHAR(10),
    api_response_status VARCHAR(20),
    phone_count INTEGER,
    email_count INTEGER,
    found_phone_numbers JSONB,
    found_email_addresses JSONB,
    dnc_status BOOLEAN,
    api_cost_cents INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        str.lookup_id,
        str.lookup_date,
        str.input_address,
        str.input_owner_name,
        str.credit_type,
        str.api_response_status,
        str.phone_count,
        str.email_count,
        str.found_phone_numbers,
        str.found_email_addresses,
        str.dnc_status,
        str.api_cost_cents
    FROM skip_trace_results str
    WHERE str.user_id = p_user_id
    ORDER BY str.lookup_date DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user can perform skip trace lookup
CREATE OR REPLACE FUNCTION can_perform_skip_trace(p_user_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_total_credits INTEGER := 0;
BEGIN
    SELECT 
        COALESCE(free_credits_remaining, 3) + COALESCE(paid_credits_remaining, 0)
    INTO v_total_credits
    FROM skip_trace_credits
    WHERE user_id = p_user_id;
    
    -- If no record exists, user has 3 free credits
    IF NOT FOUND THEN
        v_total_credits := 3;
    END IF;
    
    RETURN v_total_credits > 0;
END;
$$ LANGUAGE plpgsql; 