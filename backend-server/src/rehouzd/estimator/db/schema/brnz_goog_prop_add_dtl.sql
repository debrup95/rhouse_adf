-- Bronze Google Property Address Details Table
-- Raw property address data from Google
CREATE TABLE IF NOT EXISTS bronze.brnz_goog_prop_add_dtl (
    brnz_goog_prop_add_dtl_sk BIGSERIAL PRIMARY KEY,
    load_date_dt DATE NOT NULL,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP WITHOUT TIME ZONE,
    record_inserted_ts TIMESTAMP WITHOUT TIME ZONE,
    prop_address_line_txt VARCHAR(255),
    prop_city_nm VARCHAR(100),
    prop_state_nm VARCHAR(50),
    prop_cnty_nm VARCHAR(100),
    prop_zip_cd VARCHAR(20)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_brnz_goog_prop_add_dtl_address ON bronze.brnz_goog_prop_add_dtl(prop_address_line_txt);
CREATE INDEX IF NOT EXISTS idx_brnz_goog_prop_add_dtl_location ON bronze.brnz_goog_prop_add_dtl(prop_city_nm, prop_state_nm, prop_zip_cd);
CREATE INDEX IF NOT EXISTS idx_brnz_goog_prop_add_dtl_load_date ON bronze.brnz_goog_prop_add_dtl(load_date_dt); 