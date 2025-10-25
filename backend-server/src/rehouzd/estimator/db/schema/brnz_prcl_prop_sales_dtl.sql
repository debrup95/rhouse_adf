-- Bronze Parcel Property Sales Details Table
-- Raw property sales data
CREATE TABLE IF NOT EXISTS bronze.brnz_prcl_prop_sales_dtl (
    brnz_prcl_prop_sales_dtl_sk BIGSERIAL PRIMARY KEY,
    load_date_dt DATE NOT NULL,
    brnz_goog_prop_add_dtl_fk BIGINT NOT NULL,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP WITHOUT TIME ZONE,
    record_inserted_ts TIMESTAMP WITHOUT TIME ZONE,
    investor_company_nm_txt VARCHAR(255),
    prop_sale_dt DATE,
    prop_sale_amt DOUBLE PRECISION,  
    prop_attr_br_cnt INTEGER,
    prop_attr_bth_cnt INTEGER,
    prop_attr_sqft_nr INTEGER,
    prop_yr_blt_nr INTEGER,
    prop_address_line_txt VARCHAR(255),
    prop_city_nm VARCHAR(100),
    prop_state_nm VARCHAR(50),
    prop_cnty_nm VARCHAR(100),
    prop_zip_cd VARCHAR(20),
    prop_list_price_amt DOUBLE PRECISION,  
    prop_status_cd VARCHAR(50),
    prop_acty_status_cd VARCHAR(50),
    prop_acty_sub_status_cd VARCHAR(50),
    prop_acty_sub_status_cd_2 VARCHAR(50),       
    prop_latitude_val DECIMAL(9,6),
    prop_longitude_val DECIMAL(9,6),

    CONSTRAINT fk_bronze_goog_prop_add_dtl
        FOREIGN KEY (brnz_goog_prop_add_dtl_fk)
        REFERENCES bronze.brnz_goog_prop_add_dtl (brnz_goog_prop_add_dtl_sk)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_brnz_prcl_prop_sales_dtl_fk ON bronze.brnz_prcl_prop_sales_dtl(brnz_goog_prop_add_dtl_fk);
CREATE INDEX IF NOT EXISTS idx_brnz_prcl_prop_sales_dtl_address ON bronze.brnz_prcl_prop_sales_dtl(prop_address_line_txt);
CREATE INDEX IF NOT EXISTS idx_brnz_prcl_prop_sales_dtl_location ON bronze.brnz_prcl_prop_sales_dtl(prop_city_nm, prop_state_nm, prop_zip_cd);
CREATE INDEX IF NOT EXISTS idx_brnz_prcl_prop_sales_dtl_sale_date ON bronze.brnz_prcl_prop_sales_dtl(prop_sale_dt);
CREATE INDEX IF NOT EXISTS idx_brnz_prcl_prop_sales_dtl_coords ON bronze.brnz_prcl_prop_sales_dtl(prop_latitude_val, prop_longitude_val);
CREATE INDEX IF NOT EXISTS idx_brnz_prcl_prop_sales_dtl_status ON bronze.brnz_prcl_prop_sales_dtl(prop_status_cd, prop_acty_status_cd); 