-- Silver Integrated Property Offer Details Table
-- Property offer calculation details
CREATE TABLE IF NOT EXISTS silver.slvr_int_prop_offer_dtl (
    slvr_int_prop_offer_dtl_sk BIGSERIAL PRIMARY KEY,
    slvr_int_prop_fk BIGINT NOT NULL,
    load_date_dt DATE,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP,
    record_insert_ts TIMESTAMP,
    record_clone_ts TIMESTAMP,
    record_update_ts TIMESTAMP,
    prop_cnd_std_lv FLOAT,
    prop_cnd_std_hv FLOAT,
    prop_cnd_otd_lv FLOAT,
    prop_cnd_otd_hv FLOAT,
    prop_cnd_fix_lv FLOAT,
    prop_cnd_fix_hv FLOAT,
    prop_cnd_rnvtd_lv FLOAT,
    prop_cnd_rnvtd_hv FLOAT,
    prop_uw_grss_rnt_mnthly_amt FLOAT,
    prop_uw_vcny_mnthly_amt FLOAT,
    prop_uw_eff_rnt_mnthly_amt FLOAT,
    prop_exp_mgmt_amt FLOAT,
    prop_exp_tax_amt FLOAT,
    prop_exp_ins_amt FLOAT,
    prop_exp_hoa_amt FLOAT,
    prop_exp_leasing_fee_amt FLOAT,
    prop_exp_maint_amt FLOAT,
    prop_exp_resrv_amt FLOAT,
    prop_opr_exp_amt FLOAT,
    prop_net_opr_inm_amt FLOAT,
    prop_arv_cpm_amt FLOAT,
    prop_arv_cap_rate_amt FLOAT,
    prop_arv_lv_amt FLOAT,
    prop_arv_hv_amt FLOAT,
    prop_bnh_stg_cap_rate_amt FLOAT,
    prop_bnh_stg_max_debt_srvc_amt FLOAT,
    prop_bnh_stg_dbt_cnstnt FLOAT,
    prop_bnh_stg_loan_amt FLOAT,
    prop_bnh_stg_debt_srvc_amt FLOAT,
    prop_brrrr_stg_full_eqty_amt FLOAT,
    prop_brrrr_stg_rtn_full_eqty_amt FLOAT,
    prop_brrrr_stg_rtn_debt_pay_off_amt FLOAT,
    prop_flip_stg_rtn_full_eqty_n_mrgn_amt FLOAT,
    prop_flip_stg_rtn_full_equity_n_mrgn_rt_amt FLOAT,
    latest_saved_offer_ind BOOLEAN,

    -- Foreign key to Silver property table
    CONSTRAINT fk_slvr_int_prop_offer_prop
        FOREIGN KEY (slvr_int_prop_fk)
        REFERENCES silver.slvr_int_prop(slvr_int_prop_sk)
);

-- Fix the syntax error in the original SQL by removing semicolon

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_offer_dtl_fk ON silver.slvr_int_prop_offer_dtl(slvr_int_prop_fk);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_offer_dtl_latest ON silver.slvr_int_prop_offer_dtl(latest_saved_offer_ind) WHERE latest_saved_offer_ind = TRUE;
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_offer_dtl_arv ON silver.slvr_int_prop_offer_dtl(prop_arv_lv_amt, prop_arv_hv_amt); 