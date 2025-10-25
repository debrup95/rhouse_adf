-- Parcl Labs Raw API Responses Table
-- Stores raw API responses immediately for audit/debugging and background processing
CREATE TABLE IF NOT EXISTS public.parcl_labs_raw_responses (
    id BIGSERIAL PRIMARY KEY,
    request_hash VARCHAR(64) NOT NULL UNIQUE,
    api_endpoint VARCHAR(100) NOT NULL,
    request_params JSONB,
    raw_response JSONB NOT NULL,
    response_status INTEGER,   
    search_session_id VARCHAR(100),
    user_id INTEGER,
    target_property_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processing_status VARCHAR(20) DEFAULT 'pending'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parcl_raw_responses_hash ON public.parcl_labs_raw_responses(request_hash);
CREATE INDEX IF NOT EXISTS idx_parcl_raw_responses_session ON public.parcl_labs_raw_responses(search_session_id);
CREATE INDEX IF NOT EXISTS idx_parcl_raw_responses_status ON public.parcl_labs_raw_responses(processing_status);
CREATE INDEX IF NOT EXISTS idx_parcl_raw_responses_created ON public.parcl_labs_raw_responses(created_at);
