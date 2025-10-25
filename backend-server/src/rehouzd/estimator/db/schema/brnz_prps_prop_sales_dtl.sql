-- bronze.brnz_prps_prop_sales_dtl definition
-- Property sales detail table for bronze layer

CREATE TABLE IF NOT EXISTS bronze.brnz_prps_prop_sales_dtl (
	brnz_prps_prop_sales_dtl_sk BIGINT NOT NULL,
	load_date_dt DATE NULL,
	etl_nr BIGINT NULL,
	etl_recorded_gmts TIMESTAMP NULL,
	record_inserted_ts TIMESTAMP NULL,
	investor_company_nm_txt TEXT NULL,
	prop_last_sale_dt DATE NULL,
	prop_last_sale_amt DOUBLE PRECISION NULL,
	prop_attr_br_cnt INTEGER NULL,
	prop_attr_bth_cnt INTEGER NULL,
	prop_attr_sqft_nr INTEGER NULL,
	prop_yr_blt_nr INTEGER NULL,
	prop_address_line_txt TEXT NULL,
	prop_city_nm TEXT NULL,
	prop_state_nm TEXT NULL,
	prop_cnty_nm TEXT NULL,
	prop_zip_cd TEXT NULL,
	prop_tlt_cnd_nm TEXT NULL,
	prop_int_cnd_nm TEXT NULL,
	prop_ext_cnd_nm TEXT NULL,
	prop_bth_cnd_nm TEXT NULL,
	prop_kth_cnd_nm TEXT NULL,
	prop_list_price_amt DOUBLE PRECISION NULL,
	active_rec_ind BOOLEAN NULL,
	mailing_address TEXT NULL,
	mailing_unit TEXT NULL,
	mailing_city TEXT NULL,
	mailing_zip TEXT NULL,
	CONSTRAINT brnz_prps_prop_sales_dtl_pkey PRIMARY KEY (brnz_prps_prop_sales_dtl_sk)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_brnz_prps_prop_sales_dtl_investor 
    ON bronze.brnz_prps_prop_sales_dtl (investor_company_nm_txt);

CREATE INDEX IF NOT EXISTS idx_brnz_prps_prop_sales_dtl_sale_date 
    ON bronze.brnz_prps_prop_sales_dtl (prop_last_sale_dt);

CREATE INDEX IF NOT EXISTS idx_brnz_prps_prop_sales_dtl_zip 
    ON bronze.brnz_prps_prop_sales_dtl (prop_zip_cd);

CREATE INDEX IF NOT EXISTS idx_brnz_prps_prop_sales_dtl_county 
    ON bronze.brnz_prps_prop_sales_dtl (prop_cnty_nm);

CREATE INDEX IF NOT EXISTS idx_brnz_prps_prop_sales_dtl_active 
    ON bronze.brnz_prps_prop_sales_dtl (active_rec_ind);

-- Composite index for buyer ranking queries
CREATE INDEX IF NOT EXISTS idx_brnz_prps_prop_sales_dtl_buyer_ranking 
    ON bronze.brnz_prps_prop_sales_dtl (investor_company_nm_txt, prop_last_sale_dt, active_rec_ind);

-- Comment on table and important columns
COMMENT ON TABLE bronze.brnz_prps_prop_sales_dtl IS 'Property sales detail table containing investor purchase history data';
COMMENT ON COLUMN bronze.brnz_prps_prop_sales_dtl.investor_company_nm_txt IS 'Name of the investor/company that purchased the property';
COMMENT ON COLUMN bronze.brnz_prps_prop_sales_dtl.prop_last_sale_dt IS 'Date of the last property sale';
COMMENT ON COLUMN bronze.brnz_prps_prop_sales_dtl.prop_last_sale_amt IS 'Amount of the last property sale';
COMMENT ON COLUMN bronze.brnz_prps_prop_sales_dtl.active_rec_ind IS 'Indicates if this is an active record'; 