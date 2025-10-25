-- Parcl Labs Property Events Table
-- Stores parsed property events (sales, rentals) from API responses
CREATE TABLE IF NOT EXISTS public.parcl_labs_property_events (
    id BIGSERIAL PRIMARY KEY,
    parcl_property_id VARCHAR(50) NOT NULL,
    raw_response_id BIGINT REFERENCES public.parcl_labs_raw_responses(id),

    -- Search context
    search_session_id VARCHAR(100),

    -- Event data
    event_type VARCHAR(20), -- 'SALE', 'RENTAL', 'LISTING'
    event_name VARCHAR(50), -- 'SOLD', 'LISTED_RENT', 'PRICE_CHANGE', 'LISTING_REMOVED', etc.
    event_date DATE NOT NULL,
    price DECIMAL(12,2),
    entity_owner_name TEXT,
    true_sale_index BOOLEAN,
    investor_flag BOOLEAN,
    owner_occupied_flag BOOLEAN,

    transfer_index INTEGER,
    current_owner_flag BOOLEAN,
    new_construction_flag BOOLEAN,
    record_updated_date DATE,

    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data_source VARCHAR(20) DEFAULT 'parcl_labs'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parcl_events_parcl_id ON public.parcl_labs_property_events(parcl_property_id);
CREATE INDEX IF NOT EXISTS idx_parcl_events_date ON public.parcl_labs_property_events(event_date);
CREATE INDEX IF NOT EXISTS idx_parcl_events_type ON public.parcl_labs_property_events(event_type, event_name);
CREATE INDEX IF NOT EXISTS idx_parcl_events_session ON public.parcl_labs_property_events(search_session_id);
CREATE INDEX IF NOT EXISTS idx_parcl_events_raw_response ON public.parcl_labs_property_events(raw_response_id);
CREATE INDEX IF NOT EXISTS idx_parcl_events_price ON public.parcl_labs_property_events(price) WHERE price IS NOT NULL;
