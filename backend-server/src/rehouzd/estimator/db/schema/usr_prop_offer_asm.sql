-- User Property Offer Assessment Table
-- User property offer evaluations
CREATE TABLE IF NOT EXISTS usr_prop_offer_asm (
    usr_prop_offer_asm_sk BIGSERIAL PRIMARY KEY,
    usr_prls_dtl_fk BIGINT NOT NULL,
    slvr_int_prop_offer_dtl_fk BIGINT NOT NULL,
    usr_prop_dtl_fk BIGINT NOT NULL, -- Fixed column name
    record_inserted_ts TIMESTAMP,
    record_inserted_ts_date DATE,
    record_updated_ts TIMESTAMP,
    offer_cap_rate_percent FLOAT,
    offer_expense_rate_percent FLOAT,
    offer_effective_rnt_amt FLOAT,
    offer_repair_val_amt FLOAT,
    prop_offer_lv_amt FLOAT,
    prop_offer_hv_amt FLOAT,
    latest_saved_offer_asm_ind BOOLEAN,
    
    -- Foreign keys
    CONSTRAINT fk_usr_prop_offer_asm_profile
        FOREIGN KEY (usr_prls_dtl_fk)
        REFERENCES usr_prls_dtl(usr_prls_dtl_sk),
        
    CONSTRAINT fk_usr_prop_offer_asm_offer
        FOREIGN KEY (slvr_int_prop_offer_dtl_fk)
        REFERENCES slvr_int_prop_offer_dtl(slvr_int_prop_offer_dtl_sk),
        
    CONSTRAINT fk_usr_prop_offer_asm_property
        FOREIGN KEY (usr_prop_dtl_fk)
        REFERENCES usr_prop_dtl(usr_prop_dtl_pk)
        DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_usr_prop_offer_asm_profile ON usr_prop_offer_asm(usr_prls_dtl_fk);
CREATE INDEX IF NOT EXISTS idx_usr_prop_offer_asm_offer ON usr_prop_offer_asm(slvr_int_prop_offer_dtl_fk);
CREATE INDEX IF NOT EXISTS idx_usr_prop_offer_asm_property ON usr_prop_offer_asm(usr_prop_dtl_fk);
CREATE INDEX IF NOT EXISTS idx_usr_prop_offer_asm_latest ON usr_prop_offer_asm(latest_saved_offer_asm_ind) 
    WHERE latest_saved_offer_asm_ind = TRUE; 