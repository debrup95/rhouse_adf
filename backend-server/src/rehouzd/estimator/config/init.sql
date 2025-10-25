-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20),
    password_hash TEXT NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create specialist_calls table if it doesn't exist
CREATE TABLE IF NOT EXISTS specialist_calls (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGSERIAL NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estimate (
    user_id BIGSERIAL NOT NULL,
    address_id BIGSERIAL PRIMARY KEY,
    address_value VARCHAR(255),

    estimate_offer_min VARCHAR(255),
    estimate_offer_max VARCHAR(255),
    estimate_offer_value VARCHAR(255),

    underwrite_rent VARCHAR(255),
    underwrite_expense VARCHAR(255),
    underwrite_cap_rate VARCHAR(255),
    underwrite_selling_costs VARCHAR(255),
    underwrite_holding_costs VARCHAR(255),
    underwrite_margin VARCHAR(255),
    underwrite_low VARCHAR(255),
    underwrite_high VARCHAR(255),

    rental_or_flip BOOLEAN,
    after_repair_value VARCHAR(255),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);