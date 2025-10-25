-- Silver Integrated Property Sales Delta Table
-- Processed property sales data
CREATE TABLE IF NOT EXISTS silver.slvr_int_prop_sales_dlt (
    slvr_int_prop_dtl_sk BIGSERIAL PRIMARY KEY,
    slvr_int_prop_fk BIGINT NOT NULL,
    load_date_dt DATE,
    etl_nr BIGINT,
    etl_recorded_gmts TIMESTAMP,
    record_inserted_ts TIMESTAMP,
    prop_sale_dt DATE,
    prop_sale_amt FLOAT,
    prop_tlt_cnd_nm VARCHAR(255),
    prop_int_cnd_nm VARCHAR(255),
    prop_ext_cnd_nm VARCHAR(255),
    prop_bth_cnd_nm VARCHAR(255),
    prop_kth_cnd_nm VARCHAR(255),
    prop_list_price_amt FLOAT,
    latest_record_ind BOOLEAN,

    -- Add foreign key when slvr_int_prop table is available
    CONSTRAINT fk_slvr_int_prop
        FOREIGN KEY (slvr_int_prop_fk)
        REFERENCES silver.slvr_int_prop(slvr_int_prop_sk)
        DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_sales_dlt_fk ON silver.slvr_int_prop_sales_dlt(slvr_int_prop_fk);
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_sales_dlt_latest ON silver.slvr_int_prop_sales_dlt(latest_record_ind) WHERE latest_record_ind = TRUE;
CREATE INDEX IF NOT EXISTS idx_slvr_int_prop_sales_dlt_sale_date ON silver.slvr_int_prop_sales_dlt(prop_sale_dt); 