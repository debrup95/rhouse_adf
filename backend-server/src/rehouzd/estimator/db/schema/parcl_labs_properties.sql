-- Parcl Labs Properties Table
-- Stores parsed/structured property data from API responses
CREATE TABLE IF NOT EXISTS public.parcl_labs_properties (
    id BIGSERIAL PRIMARY KEY,
    parcl_property_id VARCHAR(50) NOT NULL UNIQUE,
    raw_response_id BIGINT REFERENCES public.parcl_labs_raw_responses(id),

    -- Search context
    search_session_id VARCHAR(100),

    -- Property metadata
    address TEXT,
    city VARCHAR(100),
    state_abbreviation VARCHAR(50),
    county VARCHAR(100),
    zip_code VARCHAR(20),
    bedrooms INTEGER,
    bathrooms DECIMAL(4,2),
    square_footage INTEGER,
    year_built INTEGER,
    property_type VARCHAR(50),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),

    unit VARCHAR(50),
    cbsa VARCHAR(100),
    event_count INTEGER,
    current_on_market_flag BOOLEAN,
    event_history_sale_flag BOOLEAN,
    event_history_rental_flag BOOLEAN,
    event_history_listing_flag BOOLEAN,
    current_investor_owned_flag BOOLEAN,
    current_owner_occupied_flag BOOLEAN,
    current_new_construction_flag BOOLEAN,
    current_on_market_rental_flag BOOLEAN,

    -- Current/Latest Classification (for backward compatibility)
    investor_category VARCHAR(20), -- 'FLIP', 'LANDLORD', 'WHOLESALER', 'UNKNOWN'
    days_to_sale INTEGER, -- Days between purchase and sale (for flips)
    days_to_rental INTEGER, -- Days between purchase and first rental event
    classification_date TIMESTAMPTZ, -- When classification was determined

    -- Tracking
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    data_source VARCHAR(20) DEFAULT 'parcl_labs'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parcl_properties_parcl_id ON public.parcl_labs_properties(parcl_property_id);
CREATE INDEX IF NOT EXISTS idx_parcl_properties_coords ON public.parcl_labs_properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_parcl_properties_location ON public.parcl_labs_properties(city, state_abbreviation, zip_code);
CREATE INDEX IF NOT EXISTS idx_parcl_properties_session ON public.parcl_labs_properties(search_session_id);
CREATE INDEX IF NOT EXISTS idx_parcl_properties_raw_response ON public.parcl_labs_properties(raw_response_id);
CREATE INDEX IF NOT EXISTS idx_parcl_properties_investor_category ON public.parcl_labs_properties(investor_category);
