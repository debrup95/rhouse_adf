-- This table represents real estate buyers/investors
-- Note: This table will be created by ADF pipeline in the silver schema
CREATE TABLE IF NOT EXISTS silver.slvr_int_inv_dtl (
  slvr_int_inv_dtl_sk             BIGINT              NOT NULL PRIMARY KEY,
  load_date_dt                    DATE,
  etl_nr                          BIGINT,
  etl_recorded_gmts               TIMESTAMP WITHOUT TIME ZONE,
  record_inserted_ts              TIMESTAMP WITHOUT TIME ZONE,
  active_flg                      BOOLEAN,
  active_rec_ind                  BOOLEAN,
  investor_company_nm_txt         TEXT,
  investor_profile                JSONB,
  num_prop_purchased_lst_12_mths_nr BIGINT,
  skip_flg                        BOOLEAN DEFAULT FALSE
); 