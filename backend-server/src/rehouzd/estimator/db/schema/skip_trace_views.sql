-- Skip Trace Views: Useful views for reporting and analytics

-- View: User Skip Trace Summary
-- Provides a comprehensive overview of each user's skip trace activity
CREATE OR REPLACE VIEW user_skip_trace_summary AS
SELECT 
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    stc.free_credits_remaining,
    stc.paid_credits_remaining,
    stc.total_free_credits_used,
    stc.total_paid_credits_used,
    stc.total_lookups_performed,
    (stc.free_credits_remaining + stc.paid_credits_remaining) AS total_credits_remaining,
    (stc.total_free_credits_used + stc.total_paid_credits_used) AS total_credits_used,
    
    -- Purchase summary
    COALESCE(purchase_stats.total_purchased, 0) AS total_credits_purchased,
    COALESCE(purchase_stats.total_spent_cents, 0) AS total_spent_cents,
    COALESCE(purchase_stats.purchase_count, 0) AS purchase_count,
    purchase_stats.last_purchase_date,
    
    -- Lookup summary
    lookup_stats.successful_lookups,
    lookup_stats.failed_lookups,
    lookup_stats.last_lookup_date,
    lookup_stats.avg_phone_numbers_found,
    lookup_stats.avg_email_addresses_found,
    
    stc.created_at AS account_created,
    stc.updated_at AS last_activity
    
FROM users u
LEFT JOIN skip_trace_credits stc ON u.user_id = stc.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(credits_purchased) AS total_purchased,
        SUM(amount_paid_cents) AS total_spent_cents,
        COUNT(*) AS purchase_count,
        MAX(purchase_date) AS last_purchase_date
    FROM skip_trace_purchases 
    WHERE payment_status = 'completed'
    GROUP BY user_id
) purchase_stats ON u.user_id = purchase_stats.user_id
LEFT JOIN (
    SELECT 
        stua.user_id,
        COUNT(CASE WHEN str.api_response_status = 'success' THEN 1 END) AS successful_lookups,
        COUNT(CASE WHEN str.api_response_status != 'success' THEN 1 END) AS failed_lookups,
        MAX(stua.access_date) AS last_lookup_date,
        AVG(str.phone_count) AS avg_phone_numbers_found,
        AVG(str.email_count) AS avg_email_addresses_found
    FROM skip_trace_user_access stua
    JOIN skip_trace_results str ON stua.lookup_id = str.lookup_id
    GROUP BY stua.user_id
) lookup_stats ON u.user_id = lookup_stats.user_id;

-- View: Skip Trace Audit Log
-- Provides detailed audit trail for compliance and support
CREATE OR REPLACE VIEW skip_trace_audit_log AS
SELECT 
    str.lookup_id,
    stua.user_id,
    u.email AS user_email,
    u.first_name,
    u.last_name,
    stua.original_search_address AS input_address,
    stua.original_search_owner AS input_owner_name,
    stua.access_date AS lookup_date,
    stua.credit_type,
    str.api_response_status,
    str.phone_count,
    str.email_count,
    str.address_count,
    str.dnc_status,
    str.litigator_status,
    str.total_api_cost_cents AS api_cost_cents,
    str.error_message,
    
    -- Purchase information if paid credit was used
    CASE 
        WHEN stua.credit_type = 'paid' THEN (
            SELECT purchase_date 
            FROM skip_trace_purchases stp 
            WHERE stp.user_id = stua.user_id 
            AND stp.payment_status = 'completed'
            AND stp.purchase_date <= stua.access_date
            ORDER BY stp.purchase_date DESC 
            LIMIT 1
        )
        ELSE NULL
    END AS source_purchase_date,
    
    stua.created_at
    
FROM skip_trace_user_access stua
JOIN skip_trace_results str ON stua.lookup_id = str.lookup_id
JOIN users u ON stua.user_id = u.user_id
ORDER BY stua.access_date DESC;

-- View: Monthly Skip Trace Metrics
-- Provides monthly aggregated metrics for business analytics
CREATE OR REPLACE VIEW monthly_skip_trace_metrics AS
SELECT 
    DATE_TRUNC('month', stua.access_date) AS month,
    COUNT(*) AS total_lookups,
    COUNT(DISTINCT stua.user_id) AS unique_users,
    COUNT(CASE WHEN stua.credit_type = 'free' THEN 1 END) AS free_credit_lookups,
    COUNT(CASE WHEN stua.credit_type = 'paid' THEN 1 END) AS paid_credit_lookups,
    COUNT(CASE WHEN str.api_response_status = 'success' THEN 1 END) AS successful_lookups,
    COUNT(CASE WHEN str.api_response_status != 'success' THEN 1 END) AS failed_lookups,
    
    -- Success rate
    ROUND(
        COUNT(CASE WHEN str.api_response_status = 'success' THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) AS success_rate_percent,
    
    -- Average data quality
    AVG(str.phone_count) AS avg_phones_per_lookup,
    AVG(str.email_count) AS avg_emails_per_lookup,
    AVG(str.address_count) AS avg_addresses_per_lookup,
    
    -- Revenue metrics
    SUM(str.total_api_cost_cents) AS total_api_cost_cents,
    
    -- DNC/Compliance metrics
    COUNT(CASE WHEN str.dnc_status = true THEN 1 END) AS dnc_flagged_contacts,
    COUNT(CASE WHEN str.litigator_status = true THEN 1 END) AS litigator_flagged_contacts
    
FROM skip_trace_user_access stua
JOIN skip_trace_results str ON stua.lookup_id = str.lookup_id
GROUP BY DATE_TRUNC('month', stua.access_date)
ORDER BY month DESC;

-- View: User Credit Balance
-- Simple view for checking user credit balances
CREATE OR REPLACE VIEW user_credit_balance AS
SELECT 
    u.user_id,
    u.email,
    COALESCE(stc.free_credits_remaining, 3) AS free_credits,
    COALESCE(stc.paid_credits_remaining, 0) AS paid_credits,
    COALESCE(stc.free_credits_remaining, 3) + COALESCE(stc.paid_credits_remaining, 0) AS total_credits,
    COALESCE(stc.total_lookups_performed, 0) AS total_lookups,
    stc.updated_at AS last_updated
FROM users u
LEFT JOIN skip_trace_credits stc ON u.user_id = stc.user_id; 