-- Subscription Plans Table: Defines available subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    plan_type VARCHAR(50) NOT NULL, -- 'free', 'professional', 'enterprise', etc.
    monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    credits_per_month INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    features JSONB, -- Flexible feature configuration
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (plan_name, plan_type, monthly_price, credits_per_month, features, description) 
VALUES 
    ('Free Plan', 'free', 0.00, 7, 
     '{"underwrite_requests": true, "basic_analytics": true, "buyer_matching": false, "priority_support": false}',
     'Perfect for beginners exploring the platform'),
    ('Professional Plan', 'professional', 49.99, 49, 
     '{"underwrite_requests": true, "basic_analytics": true, "buyer_matching": true, "priority_support": true, "advanced_analytics": true}',
     'For active real estate professionals')
ON CONFLICT (plan_name) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_type ON subscription_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 