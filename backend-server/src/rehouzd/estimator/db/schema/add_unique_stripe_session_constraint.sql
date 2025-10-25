-- Add unique constraint to prevent duplicate purchases for the same Stripe session
-- This prevents multiple credit additions if the API is called multiple times

-- Add the unique constraint
ALTER TABLE skip_trace_purchases 
ADD CONSTRAINT unique_stripe_session_id 
UNIQUE (stripe_session_id);

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_skip_trace_purchases_stripe_session_id 
ON skip_trace_purchases (stripe_session_id);
