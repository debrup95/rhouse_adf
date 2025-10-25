-- User Credit Transactions Table: Logs all credit additions and deductions
CREATE TABLE IF NOT EXISTS user_credit_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'credit', 'debit', 'refund', 'adjustment'
    credit_amount INTEGER NOT NULL, -- Positive for additions, negative for deductions
    action_type VARCHAR(100), -- 'underwrite_request', 'monthly_renewal', 'plan_upgrade', etc.
    description TEXT,
    reference_id BIGINT, -- Reference to related record (e.g., underwrite_request_id)
    reference_table VARCHAR(100), -- Table name for the reference
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    metadata JSONB, -- Additional transaction details
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_user_credit_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Indexes for performance and analytics
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_user_id ON user_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_type ON user_credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_action ON user_credit_transactions(action_type);
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_created ON user_credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_reference ON user_credit_transactions(reference_table, reference_id);

-- Index for user transaction history queries
CREATE INDEX IF NOT EXISTS idx_user_credit_transactions_user_created ON user_credit_transactions(user_id, created_at DESC); 