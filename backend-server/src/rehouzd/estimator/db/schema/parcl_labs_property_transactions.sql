-- Parcl Labs Property Transactions Table
-- Stores transaction-level classifications for each ownership period
CREATE TABLE IF NOT EXISTS public.parcl_labs_property_transactions (
    id BIGSERIAL PRIMARY KEY,
    parcl_property_id VARCHAR(50) NOT NULL,

    -- Transaction period
    transaction_sequence INTEGER NOT NULL, -- 1, 2, 3... (order of ownership periods)
    purchase_event_id BIGINT REFERENCES public.parcl_labs_property_events(id),
    sale_event_id BIGINT REFERENCES public.parcl_labs_property_events(id),

    -- Transaction details
    purchase_date DATE NOT NULL,
    sale_date DATE,
    holding_period_days INTEGER, -- NULL if still owned

    -- Classification
    transaction_category VARCHAR(20) NOT NULL, -- 'WHOLESALER', 'FLIP', 'LONG_TERM_HOLD', 'CURRENT_OWNERSHIP'
    investor_type VARCHAR(20), -- 'FLIPPER', 'WHOLESALER', 'LANDLORD', 'UNKNOWN'

    -- Financial details
    purchase_price DECIMAL(12,2),
    sale_price DECIMAL(12,2),
    profit_loss DECIMAL(12,2), -- NULL if still owned
    rental_price DECIMAL(10,2), -- Latest rental price during ownership period

    -- Additional analysis
    has_rental_activity BOOLEAN DEFAULT FALSE,
    rental_events_count INTEGER DEFAULT 0,
    days_to_first_rental INTEGER, -- NULL if no rental activity

    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data_source VARCHAR(20) DEFAULT 'parcl_labs',

    -- Constraints
    UNIQUE(parcl_property_id, transaction_sequence),
    CHECK (transaction_category IN ('WHOLESALER', 'FLIP', 'LONG_TERM_HOLD', 'CURRENT_OWNERSHIP')),
    CHECK (investor_type IN ('FLIPPER', 'WHOLESALER', 'LANDLORD', 'UNKNOWN'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_transactions_parcl_id ON public.parcl_labs_property_transactions(parcl_property_id);
CREATE INDEX IF NOT EXISTS idx_property_transactions_category ON public.parcl_labs_property_transactions(transaction_category);
CREATE INDEX IF NOT EXISTS idx_property_transactions_investor_type ON public.parcl_labs_property_transactions(investor_type);
CREATE INDEX IF NOT EXISTS idx_property_transactions_purchase_date ON public.parcl_labs_property_transactions(purchase_date);
CREATE INDEX IF NOT EXISTS idx_property_transactions_sequence ON public.parcl_labs_property_transactions(parcl_property_id, transaction_sequence);
