-- Admin Control Rules Table
-- System rules and configuration
CREATE TABLE IF NOT EXISTS adm_ctl_rules (
    adm_ctl_rules_sk BIGSERIAL PRIMARY KEY, -- Fixed column name
    load_date_dt DATE,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP,
    record_inserted_ts TIMESTAMP,
    calculation_rule_type_cd VARCHAR(100),
    calculation_rule_type_dc VARCHAR(255),
    calculation_input_parm_nm VARCHAR(100),
    calculation_input_parm_val VARCHAR(255)
);

-- Indexes for rule lookups
CREATE INDEX IF NOT EXISTS idx_adm_ctl_rules_type ON adm_ctl_rules(calculation_rule_type_cd);
CREATE INDEX IF NOT EXISTS idx_adm_ctl_rules_param ON adm_ctl_rules(calculation_input_parm_nm); 