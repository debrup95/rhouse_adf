-- Admin Reference Property Condition Table
-- Reference data for property condition categories
CREATE TABLE IF NOT EXISTS adm_ref_prop_condition (
    adm_ref_prop_condition_sk BIGSERIAL PRIMARY KEY,
    load_date_dt DATE,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP,
    record_inserted_ts TIMESTAMP,
    prop_condition_cgty_nm VARCHAR(100),
    prop_condition_cgty_lv_nr BIGINT,
    prop_condition_cgty_hv_nr BIGINT
);

-- Index for condition category name
CREATE INDEX IF NOT EXISTS idx_adm_ref_prop_condition_name ON adm_ref_prop_condition(prop_condition_cgty_nm); 