-- Main schema index file that includes all table definitions
-- This file should be executed to create the complete database schema

-- Create schemas
\i create_schemas.sql

-- Users and authentication tables
\i users.sql
\i password_reset_otps.sql
\i specialist_calls.sql

-- Subscription and credit system tables
\i subscription_plans.sql
\i user_subscriptions.sql
\i user_credit_transactions.sql

-- Skip trace system tables
\i skip_trace_credits.sql
\i skip_trace_results.sql
\i skip_trace_verified_phones.sql
\i skip_trace_verified_emails.sql
\i skip_trace_purchases.sql

-- Request tracking tables
\i offer_matching_requests.sql
\i underwrite_requests.sql
\i state_interest_requests.sql

-- Property and estimates tables
-- \i estimate.sql
\i saved_estimates.sql
\i property_images.sql

-- Bronze tables (raw data)
\i brnz_goog_prop_add_dtl.sql
\i brnz_prcl_prop_sales_dtl.sql
\i brnz_prps_prop_sales_dtl.sql

-- Parcl Labs data storage (public schema)
\i parcl_labs_raw_responses.sql
\i parcl_labs_properties.sql
\i parcl_labs_property_events.sql
\i parcl_labs_property_transactions.sql

-- Silver tables (processed data)
-- \i slvr_int_prop_sales_dlt.sql
-- \i slvr_int_prop.sql
-- \i slvr_int_prop_comps.sql
-- \i slvr_int_prop_offer_dtl.sql
\i slvr_int_inv_dtl.sql

-- Admin and reference tables
-- \i adm_ref_prop_condition.sql
\i adm_ctl_rules.sql
\i market_reference.sql
\i market_reference_counties.sql
\i market_underwrite_inputs.sql
\i market_calculation_reference.sql
\i property_condition_cost.sql

-- Rehab calculator tables
\i rehab_categories.sql
\i quality_tiers.sql
\i property_size_categories.sql
\i pricing_basis_types.sql
\i rehab_line_items.sql
-- \i rehab_data_population.sql

-- User profile tables
-- \i usr_prls_dtl.sql
-- \i usr_invst_conatact_dtl.sql
-- \i usr_prop_offer_asm.sql
-- \i usr_prop_dtl.sql

-- Views for reporting and analytics
\i skip_trace_views.sql

-- Functions for skip trace operations
\i skip_trace_functions.sql

-- Shared estimates for PDF report sharing
\i shared_estimates.sql 