-- Silver Integrated Property Table
-- Core property information
CREATE TABLE IF NOT EXISTS silver.slvr_int_prop (
    slvr_int_prop_sk BIGSERIAL PRIMARY KEY,
    slvr_int_inv_dtl_fk BIGINT,
    brnz_usr_prls_dtl_fk INTEGER,
    brnz_prcl_prop_sales_dtl_fk INTEGER,
    load_date_dt DATE,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP,
    record_inserted_ts TIMESTAMP,
    src_system_cd VARCHAR(50),
    src_system_dc VARCHAR(255),
    prop_attr_br_cnt INTEGER,
    prop_attr_bth_cnt INTEGER,
    prop_attr_sqft_nr INTEGER,
    prop_yr_blt_nr INTEGER,
    prop_address_line_txt VARCHAR(255),
    prop_city_nm VARCHAR(100),
    prop_state_nm VARCHAR(50),
    prop_cnty_nm VARCHAR(100),
    prop_zip_cd VARCHAR(20),

    -- Foreign key to bronze property sales table
    CONSTRAINT fk_brnz_prcl_prop_sales_dtl
        FOREIGN KEY (brnz_prcl_prop_sales_dtl_fk)
        REFERENCES bronze.brnz_prcl_prop_sales_dtl(brnz_prcl_prop_sales_dtl_sk)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_address ON silver.slvr_int_prop(prop_address_line_txt);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_location ON silver.slvr_int_prop(prop_city_nm, prop_state_nm, prop_zip_cd);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_attributes ON silver.slvr_int_prop(prop_attr_br_cnt, prop_attr_bth_cnt, prop_attr_sqft_nr);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_bronze_fk ON silver.slvr_int_prop(brnz_prcl_prop_sales_dtl_fk); 