-- Skip Trace Purchases Table: Tracks all credit purchases and payment transactions
CREATE TABLE IF NOT EXISTS skip_trace_purchases (
    purchase_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- Purchase details
    credits_purchased INTEGER NOT NULL,
    amount_paid_cents INTEGER NOT NULL, -- Amount in cents
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Payment provider details
    payment_provider VARCHAR(20) NOT NULL DEFAULT 'stripe', -- 'stripe', 'paypal', etc.
    payment_intent_id VARCHAR(255), -- Stripe payment intent ID
    payment_status VARCHAR(20) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
    
    -- Stripe session/checkout details
    stripe_session_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Bundle information
    bundle_type VARCHAR(20), -- '10_credits', '25_credits', '50_credits', '100_credits'
    unit_price_cents INTEGER, -- Price per credit in cents
    
    -- Transaction metadata
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50), -- 'card', 'bank_transfer', etc.
    
    -- Refund tracking
    refunded_at TIMESTAMPTZ,
    refund_amount_cents INTEGER DEFAULT 0,
    refund_reason TEXT,
    
    -- Metadata for additional payment details
    payment_metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_skip_trace_purchases_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
        
    -- Ensure positive values
    CONSTRAINT chk_credits_positive
        CHECK (credits_purchased > 0),
        
    CONSTRAINT chk_amount_positive
        CHECK (amount_paid_cents > 0),
        
    CONSTRAINT chk_refund_amount_non_negative
        CHECK (refund_amount_cents >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skip_trace_purchases_user ON skip_trace_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_skip_trace_purchases_date ON skip_trace_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_skip_trace_purchases_status ON skip_trace_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_skip_trace_purchases_provider ON skip_trace_purchases(payment_provider);
CREATE INDEX IF NOT EXISTS idx_skip_trace_purchases_stripe_session ON skip_trace_purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_skip_trace_purchases_payment_intent ON skip_trace_purchases(payment_intent_id);

-- Composite index for user purchase history
CREATE INDEX IF NOT EXISTS idx_skip_trace_purchases_user_history ON skip_trace_purchases(user_id, purchase_date DESC, payment_status);

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_skip_trace_purchases_updated_at
BEFORE UPDATE ON skip_trace_purchases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 