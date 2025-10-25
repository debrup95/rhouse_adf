-- Silver Integrated Property Comps Table
-- Property comparables data
CREATE TABLE IF NOT EXISTS silver.slvr_int_prop_comps (
    slvr_int_prop_comps_sk BIGSERIAL PRIMARY KEY,
    slvr_int_prop_fk BIGINT NOT NULL,
    brnz_prcl_prop_sales_dtl_fk INTEGER,
    load_date_dt DATE,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP,
    record_inserted_ts TIMESTAMP,
    prop_attr_br_cnt INTEGER,
    prop_attr_bth_cnt INTEGER,
    prop_attr_sqft_nr INTEGER,
    prop_yr_blt_nr INTEGER,
    prop_address_line_txt VARCHAR(255),
    prop_city_nm VARCHAR(100),
    prop_state_nm VARCHAR(50),
    prop_cnty_nm VARCHAR(100),
    prop_zip_cd VARCHAR(20),
    prop_latitude_val DECIMAL(9,6),
    prop_longitude_val DECIMAL(9,6),
    prop_latest_rental_amt FLOAT,
    prop_latest_sales_amt FLOAT,
    record_update_ts TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_slvr_int_prop_comps_prop
        FOREIGN KEY (slvr_int_prop_fk)
        REFERENCES silver.slvr_int_prop(slvr_int_prop_sk),
        
    CONSTRAINT fk_slvr_int_prop_comps_bronze
        FOREIGN KEY (brnz_prcl_prop_sales_dtl_fk)
        REFERENCES bronze.brnz_prcl_prop_sales_dtl(brnz_prcl_prop_sales_dtl_sk)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_comps_fk ON silver.slvr_int_prop_comps(slvr_int_prop_fk);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_comps_bronze_fk ON silver.slvr_int_prop_comps(brnz_prcl_prop_sales_dtl_fk);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_comps_coords ON silver.slvr_int_prop_comps(prop_latitude_val, prop_longitude_val);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_comps_location ON silver.slvr_int_prop_comps(prop_city_nm, prop_state_nm, prop_zip_cd);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_comps_rental ON silver.slvr_int_prop_comps(prop_latest_rental_amt);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_comps_sales ON silver.slvr_int_prop_comps(prop_latest_sales_amt); 