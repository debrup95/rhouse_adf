-- Skip Trace Results Table: Unified table for shared results and user access tracking
CREATE TABLE IF NOT EXISTS skip_trace_results (
    lookup_id BIGSERIAL PRIMARY KEY,
    
    -- Shared result identification (for deduplication)
    input_address_normalized TEXT NOT NULL, -- Standardized address format
    input_owner_name_normalized TEXT,
    input_city TEXT,
    input_state TEXT,
    input_zip_code TEXT,
    
    -- SUCCESS TRACKING: Store the address that actually returned data
    successful_lookup_address TEXT, -- The specific address that gave us contact info
    successful_lookup_owner TEXT,   -- The owner name that worked
    address_match_confidence DECIMAL(3,2), -- How well the successful address matched the search
    
    -- Result metadata
    first_lookup_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_lookup_count INTEGER DEFAULT 1, -- How many times this was looked up across all users
    data_freshness_days INTEGER DEFAULT 0, -- Days since last API call (for 90-day refresh)
    
    -- API response metadata
    api_response_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'no_data', 'error'
    api_response_time_ms INTEGER,
    
    -- Lead Sherpa response data (stored as JSONB for flexibility)
    raw_api_response JSONB,
    
    -- Extracted contact information for easy querying
    found_phone_numbers JSONB, -- Array of phone objects with metadata
    found_email_addresses JSONB, -- Array of email strings
    found_mailing_addresses JSONB, -- Array of address objects
    owner_names JSONB, -- Array of owner name variations
    
    -- Data quality indicators
    phone_count INTEGER DEFAULT 0,
    email_count INTEGER DEFAULT 0,
    address_count INTEGER DEFAULT 0,
    dnc_status BOOLEAN,
    litigator_status BOOLEAN,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Cost tracking
    total_api_cost_cents INTEGER, -- Total cost for all lookups of this result
    
    -- Error information (if lookup failed)
    error_message TEXT,
    error_code VARCHAR(50),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Access Log: Tracks individual user access to shared results
CREATE TABLE IF NOT EXISTS skip_trace_user_access (
    access_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    lookup_id BIGINT NOT NULL, -- References skip_trace_results
    
    -- User-specific lookup context
    buyer_id TEXT, -- Which buyer this was for
    buyer_name TEXT,
    original_search_address TEXT, -- What the user originally searched for
    original_search_owner TEXT,
    
    -- Access metadata
    access_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    credit_type VARCHAR(10) NOT NULL CHECK (credit_type IN ('free', 'paid', 'cached')),
    access_source VARCHAR(20) NOT NULL, -- 'new_lookup', 'cache_hit', 'property_reverse'
    
    -- Cost tracking (for user billing)
    credit_cost INTEGER DEFAULT 1, -- Credits charged to user (0 for cached results)
    was_cached BOOLEAN DEFAULT FALSE,
    cache_age_hours INTEGER, -- How old was the cached data when accessed
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_skip_trace_user_access_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_skip_trace_user_access_lookup
        FOREIGN KEY (lookup_id)
        REFERENCES skip_trace_results(lookup_id)
        ON DELETE CASCADE
);

-- MAIN INDEXES for performance
-- Unique constraint for deduplication (address + owner combination)
CREATE UNIQUE INDEX IF NOT EXISTS idx_skip_trace_results_unique 
    ON skip_trace_results(input_address_normalized, COALESCE(input_owner_name_normalized, ''));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_skip_trace_results_address ON skip_trace_results(input_address_normalized);
CREATE INDEX IF NOT EXISTS idx_skip_trace_results_owner ON skip_trace_results(input_owner_name_normalized);
CREATE INDEX IF NOT EXISTS idx_skip_trace_results_freshness ON skip_trace_results(data_freshness_days);
CREATE INDEX IF NOT EXISTS idx_skip_trace_results_status ON skip_trace_results(api_response_status);
CREATE INDEX IF NOT EXISTS idx_skip_trace_results_successful_address ON skip_trace_results(successful_lookup_address);

-- User access indexes
CREATE INDEX IF NOT EXISTS idx_user_access_user ON skip_trace_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_lookup ON skip_trace_user_access(lookup_id);
CREATE INDEX IF NOT EXISTS idx_user_access_date ON skip_trace_user_access(access_date);
CREATE INDEX IF NOT EXISTS idx_user_access_buyer ON skip_trace_user_access(buyer_id);
CREATE INDEX IF NOT EXISTS idx_user_access_user_date ON skip_trace_user_access(user_id, access_date DESC);

-- GIN indexes for JSONB fields for efficient searching
CREATE INDEX IF NOT EXISTS idx_skip_trace_results_phone_numbers ON skip_trace_results USING GIN (found_phone_numbers);
CREATE INDEX IF NOT EXISTS idx_skip_trace_results_emails ON skip_trace_results USING GIN (found_email_addresses);
CREATE INDEX IF NOT EXISTS idx_skip_trace_results_addresses ON skip_trace_results USING GIN (found_mailing_addresses);

-- Composite index for cache lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_skip_trace_cache_lookup ON skip_trace_results(input_address_normalized, input_owner_name_normalized, data_freshness_days) 
    WHERE api_response_status = 'success';

-- Index for 90-day refresh automation
CREATE INDEX IF NOT EXISTS idx_skip_trace_refresh_needed ON skip_trace_results(data_freshness_days, last_updated) 
    WHERE data_freshness_days >= 90 AND api_response_status = 'success'; 