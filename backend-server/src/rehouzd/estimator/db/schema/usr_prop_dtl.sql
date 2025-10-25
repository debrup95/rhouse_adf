-- User Property Details Table
-- User property information
CREATE TABLE IF NOT EXISTS usr_prop_dtl (
    usr_prop_dtl_pk BIGSERIAL PRIMARY KEY,
    usr_prls_dtl_fk BIGINT NOT NULL,
    slvr_int_prop_offer_dtl_fk BIGINT,
    record_inserted_ts TIMESTAMP,
    record_updated_ts TIMESTAMP,
    sys_prop_attr_br_cnt INTEGER,
    sys_prop_attr_bth_cnt INTEGER,
    sys_prop_attr_sqft_nr INTEGER,
    sys_prop_yr_blt_nr INTEGER,
    prop_address_line_txt VARCHAR(255),
    prop_city_nm VARCHAR(100),
    prop_state_nm VARCHAR(50),
    prop_cnty_nm VARCHAR(100),
    prop_zip_cd VARCHAR(20),
    prop_offer_state_cd VARCHAR(50),
    prop_offer_state_dc VARCHAR(255),
    prop_home_cnd_cd VARCHAR(50),
    prop_stg1_ts TIMESTAMP,
    prop_stg2_ts TIMESTAMP,
    prop_stg3_ts TIMESTAMP,
    num_homes_sld_qty BIGINT,
    num_active_byr_qty BIGINT,
    prop_offer_lv_amt FLOAT,
    prop_offer_hv_amt FLOAT,
    tlk_spec_ind BOOLEAN,
    tlk_spec_ask_ts TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_usr_prop_dtl_profile
        FOREIGN KEY (usr_prls_dtl_fk)
        REFERENCES usr_prls_dtl(usr_prls_dtl_sk),
        
    CONSTRAINT fk_usr_prop_dtl_offer
        FOREIGN KEY (slvr_int_prop_offer_dtl_fk)
        REFERENCES slvr_int_prop_offer_dtl(slvr_int_prop_offer_dtl_sk)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_usr_prop_dtl_profile ON usr_prop_dtl(usr_prls_dtl_fk);
CREATE INDEX IF NOT EXISTS idx_usr_prop_dtl_offer ON usr_prop_dtl(slvr_int_prop_offer_dtl_fk);
CREATE INDEX IF NOT EXISTS idx_usr_prop_dtl_address ON usr_prop_dtl(prop_address_line_txt);
CREATE INDEX IF NOT EXISTS idx_usr_prop_dtl_location ON usr_prop_dtl(prop_city_nm, prop_state_nm, prop_zip_cd);
CREATE INDEX IF NOT EXISTS idx_usr_prop_dtl_status ON usr_prop_dtl(prop_offer_state_cd);
CREATE INDEX IF NOT EXISTS idx_usr_prop_dtl_tlk_spec ON usr_prop_dtl(tlk_spec_ind) WHERE tlk_spec_ind = TRUE; 