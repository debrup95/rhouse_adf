-- User Profile Details Table
-- Extended user profile information

-- Can be verified and deleted after testing
CREATE TABLE IF NOT EXISTS usr_prls_dtl (
    usr_prls_dtl_sk BIGSERIAL PRIMARY KEY,
    load_date_dt DATE,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP,
    record_inserted_ts TIMESTAMP,
    first_nm_txt VARCHAR(100),
    last_nm_txt VARCHAR(100),
    ph_nr_txt VARCHAR(20),
    email_addr_txt VARCHAR(255),
    usr_type_cd VARCHAR(50),
    usr_type_dc VARCHAR(255)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_usr_prls_dtl_email ON usr_prls_dtl(email_addr_txt);
CREATE INDEX IF NOT EXISTS idx_usr_prls_dtl_phone ON usr_prls_dtl(ph_nr_txt);
CREATE INDEX IF NOT EXISTS idx_usr_prls_dtl_name ON usr_prls_dtl(first_nm_txt, last_nm_txt);
CREATE INDEX IF NOT EXISTS idx_usr_prls_dtl_type ON usr_prls_dtl(usr_type_cd); 