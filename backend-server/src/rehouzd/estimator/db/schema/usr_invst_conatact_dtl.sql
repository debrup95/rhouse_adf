-- User Investor Contact Details Table
-- Investor contact information
CREATE TABLE IF NOT EXISTS usr_invst_contact_dtl (
    usr_invst_contact_dtl_sk BIGSERIAL PRIMARY KEY, -- Fixed column name and typo
    usr_invst_dtl_fk BIGINT NOT NULL,
    recorded_created_ts TIMESTAMP,
    record_created_login_id VARCHAR(100),
    record_inserted_ts TIMESTAMP,
    investor_contact_frst_nm_txt VARCHAR(100),
    investor_contact_lst_nm_txt VARCHAR(100),
    investor_contact_email_add_txt VARCHAR(255),
    investor_contact_phn_nr VARCHAR(20),
    investor_contact_srcd_chnl_nm VARCHAR(100)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_usr_invst_contact_dtl_fk ON usr_invst_contact_dtl(usr_invst_dtl_fk);
CREATE INDEX IF NOT EXISTS idx_usr_invst_contact_dtl_email ON usr_invst_contact_dtl(investor_contact_email_add_txt);
CREATE INDEX IF NOT EXISTS idx_usr_invst_contact_dtl_phone ON usr_invst_contact_dtl(investor_contact_phn_nr);
CREATE INDEX IF NOT EXISTS idx_usr_invst_contact_dtl_name ON usr_invst_contact_dtl(investor_contact_frst_nm_txt, investor_contact_lst_nm_txt); 