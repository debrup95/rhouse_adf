import json
import os
import logging
import requests
import math
from datetime import datetime , timedelta
from utilities.common_utils import ExecPostgress , get_last_etl_ts
import threading

def upsert_table(records,conn,slv_pk,etl_nr,insert_query,upd_query):
    try: 
        logging.info("Upsert_table.")
        etl_nr = int(etl_nr)
        prv_etl_nr =  etl_nr
        slv_pk =int(slv_pk)
        cursor = conn.cursor()
        etl_nr= etl_nr + 1
        load_date_dt = datetime.today().date()
        etl_reorded_gmts = datetime.now()
        slvr_int_inv_dtl_sk = slv_pk

        #Upating active record indicator flag to false for the previous record as the entire table is taken for the bronze table  
        cursor.execute(upd_query, (prv_etl_nr,))
        conn.commit()
        print("Update successful.")

        for row in records:
            slvr_int_inv_dtl_sk = slvr_int_inv_dtl_sk +1
            investor_company_nm_txt = row[0]
            num_prop_purchased_lst_12_mths_nr = row[1]
            active_flag = True if row[2] else False
            record_inserted_ts = datetime.now()
            active_rec_ind = True
        
            investor_profile= {
                "min_prop_attr_br_cnt": row[3],
                "min_prop_attr_bth_cnt": row[4],
                "mx_props_amnt": row[5],
                "min_props_amnt": row[6],
                "min_year": int(row[7]),
                "min_sqft": int(row[8]),
                "list_zips": row[9]
            }
            condition_keys = ["prop_tlt_cnd_nm", "prop_int_cnd_nm", "prop_ext_cnd_nm", "prop_bth_cnd_nm", "prop_kth_cnd_nm"]
            condition_types = ["Good", "Average", "Disrepair", "Excellent", "Poor"]

            index = 10  
            for key in condition_keys:
                investor_profile[key] = {condition: row[index + i] for i, condition in enumerate(condition_types)}
                index += len(condition_types)
            

            logging.info(f"executions started: {(slvr_int_inv_dtl_sk,load_date_dt,etl_nr,etl_reorded_gmts,record_inserted_ts,active_flag,investor_company_nm_txt, json.dumps(investor_profile),int(num_prop_purchased_lst_12_mths_nr),active_rec_ind)}")
            cursor.execute(insert_query, (slvr_int_inv_dtl_sk,load_date_dt,etl_nr,etl_reorded_gmts,record_inserted_ts,active_flag,investor_company_nm_txt, json.dumps(investor_profile),int(num_prop_purchased_lst_12_mths_nr),active_rec_ind))
            logging.info("execut completed.")

        logging.info("commi start.")
        logging.info("commi end.")
        conn.commit()
        return etl_reorded_gmts,etl_nr
    except Exception as err:
        logging.error(f"Error occure in upsert_table and the error is  - {str(err)}")
        print(f"Error occure in upsert_table and the error is  - {str(err)}")
        raise Exception(err)


def process_slv_int_inv():
    try:
        DB_HOST = os.getenv("DB_HOST")
        DB_NAME = os.getenv("DB_NAME")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")
        DB_PORT = os.getenv("DB_PORT")

        obj = ExecPostgress(DB_HOST,DB_NAME,DB_USER,DB_PASSWORD,DB_PORT)

        conn , status_msg = obj.create_connection()
        if not conn and status_msg:
            raise Exception(f"connectiuon is not established with postgress DB - {DB_NAME} .")
        
        logging.info(f"connectiuon established with postgress DB - {DB_NAME} .")
        print(f"connectiuon established with postgress DB - {DB_NAME} .")
        
        brnz_tlb = "pl_brnz_prps_prop_sales_dtl"
        last_loaded_ts,batch_num = get_last_etl_ts(conn, brnz_tlb)
        logging.info(last_loaded_ts)
        logging.info(batch_num)
        query = f"""
            SELECT 
                investor_company_nm_txt, 
                COUNT(*) AS num_properties,
                SUM(CASE WHEN COUNT(*) >= 2 THEN 1 ELSE 0 END)
                OVER (PARTITION BY investor_company_nm_txt) AS active_flag,
                min(prop_attr_br_cnt) as min_prop_attr_br_cnt,
                floor(min(prop_attr_bth_cnt)) as min_prop_attr_bth_cnt,
                max(prop_last_sale_amt) as mx_props_amnt,
                min(prop_last_sale_amt) as min_props_amnt,
                FLOOR(min(prop_yr_blt_nr) / 10) * 10 as min_years,
                FLOOR(min(prop_attr_sqft_nr) / 10) * 10  as min_sqft,
                ARRAY_AGG( distinct prop_zip_cd) as list_zips,

                sum(case when prop_tlt_cnd_nm = 'Good' Then 1 else 0 end) as good_prop_tlt_cnd_nm,
                sum(case when prop_tlt_cnd_nm = 'Average' Then 1 else 0 end) as average_prop_tlt_cnd_nm,
                sum(case when prop_tlt_cnd_nm = 'Disrepair' Then 1 else 0 end) as disrepair_prop_tlt_cnd_nm,
                sum(case when prop_tlt_cnd_nm = 'Excellent' Then 1 else 0 end) as excellent_prop_tlt_cnd_nm,
                sum(case when prop_tlt_cnd_nm = 'Poor' Then 1 else 0 end) as poor_prop_tlt_cnd_nm,
                
                sum(case when prop_int_cnd_nm = 'Good' Then 1 else 0 end) as good_prop_int_cnd_nm,
                sum(case when prop_int_cnd_nm = 'Average' Then 1 else 0 end) as average_prop_int_cnd_nm,
                sum(case when prop_int_cnd_nm = 'Disrepair' Then 1 else 0 end) as disrepair_prop_int_cnd_nm,
                sum(case when prop_int_cnd_nm = 'Excellent' Then 1 else 0 end) as excellent_prop_int_cnd_nm,
                sum(case when prop_int_cnd_nm = 'Poor' Then 1 else 0 end) as poor_prop_int_cnd_nm,

                sum(case when prop_ext_cnd_nm = 'Good' Then 1 else 0 end) as good_prop_ext_cnd_nm,
                sum(case when prop_ext_cnd_nm = 'Average' Then 1 else 0 end) as average_prop_ext_cnd_nm,
                sum(case when prop_ext_cnd_nm = 'Disrepair' Then 1 else 0 end) as disrepair_prop_ext_cnd_nm,
                sum(case when prop_ext_cnd_nm = 'Excellent' Then 1 else 0 end) as excellent_prop_ext_cnd_nm,
                sum(case when prop_ext_cnd_nm = 'Poor' Then 1 else 0 end) as poor_prop_ext_cnd_nm,

                sum(case when prop_bth_cnd_nm = 'Good' Then 1 else 0 end) as good_prop_bth_cnd_nm,
                sum(case when prop_bth_cnd_nm = 'Average' Then 1 else 0 end) as average_prop_bth_cnd_nm,
                sum(case when prop_bth_cnd_nm = 'Disrepair' Then 1 else 0 end) as disrepair_prop_bth_cnd_nm,
                sum(case when prop_bth_cnd_nm = 'Excellent' Then 1 else 0 end) as excellent_prop_bth_cnd_nm,
                sum(case when prop_bth_cnd_nm = 'Poor' Then 1 else 0 end) as poor_prop_bth_cnd_nm,

                sum(case when prop_kth_cnd_nm = 'Good' Then 1 else 0 end) as good_prop_kth_cnd_nm,
                sum(case when prop_kth_cnd_nm = 'Average' Then 1 else 0 end) as average_prop_kth_cnd_nm,
                sum(case when prop_kth_cnd_nm = 'Disrepair' Then 1 else 0 end) as disrepair_prop_kth_cnd_nm,
                sum(case when prop_kth_cnd_nm = 'Excellent' Then 1 else 0 end) as excellent_prop_kth_cnd_nm,
                sum(case when prop_kth_cnd_nm = 'Poor' Then 1 else 0 end) as poor_prop_kth_cnd_nm

            FROM bronze.brnz_prps_prop_sales_dtl
            WHERE prop_last_sale_dt <= CURRENT_DATE 
            AND prop_last_sale_dt >= CURRENT_DATE - INTERVAL '12 months' 
            AND investor_company_nm_txt is not null
            AND prop_attr_br_cnt is not null
            AND prop_attr_bth_cnt is not null
            AND prop_last_sale_amt is not null
            AND prop_yr_blt_nr is not null
            AND prop_attr_sqft_nr is not null
            AND prop_zip_cd is not null
            GROUP BY investor_company_nm_txt;
            """
        logging.info(query)
        result_slvr_int_inv,message = obj.return_query_res(query,conn)
        logging.info(result_slvr_int_inv)
        # print(result_slvr_int_inv)

        query = """
        SELECT 
            COALESCE(MAX(slvr_int_inv_dtl_sk),0) AS slv_pk, 
            COALESCE(MAX(slvr_int_inv_dtl.etl_nr),0) AS etl_nr
        FROM silver.slvr_int_inv_dtl;
        """
        slv_pk,etl_nr= obj.return_query_res(query,conn)[0][0]
        logging.info(f"slv_pk: {slv_pk}")
        logging.info(f"etl_nr: {etl_nr}")

        #Update active_rec_ind to False to the previous version of data  .
        upd_query = """
            UPDATE silver.slvr_int_inv_dtl
            SET active_rec_ind = false
            WHERE etl_nr = %s
        """
        insert_query = """
            INSERT INTO silver.slvr_int_inv_dtl (
                slvr_int_inv_dtl_sk, 
                load_date_dt, 
                etl_nr, 
                etl_reorded_gmts, 
                record_inserted_ts, 
                active_flg, 
                investor_company_nm_txt, 
                investor_profile, 
                num_prop_purchased_lst_12_mths_nr,
                active_rec_ind
            ) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """
        
        etl_reorded_gmts,etl_nr = upsert_table(result_slvr_int_inv,conn,slv_pk,etl_nr,insert_query,upd_query)
        obj.upd_lookup_tbl(conn,"silver_int_inv_dtl",etl_reorded_gmts,etl_nr)
        obj.end_process(conn)
    except Exception as err:
        logging.error("Error occured in process_slv_int_inv and the error is -  ",str(err))
        raise Exception(err)




def process_slv_int_pr_cmps():
    try:
        logging.info(f"executions started: ")
        DB_HOST = os.getenv("DB_HOST")
        DB_NAME = os.getenv("DB_NAME")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")
        DB_PORT = os.getenv("DB_PORT")

        obj = ExecPostgress(DB_HOST,DB_NAME,DB_USER,DB_PASSWORD,DB_PORT)

        conn , status_msg = obj.create_connection()
        if not conn and status_msg:
            raise Exception(f"connectiuon is not established with postgress DB - {DB_NAME} .")
        
        logging.info(f"connectiuon established with postgress DB - {DB_NAME} .")
        print(f"connectiuon established with postgress DB - {DB_NAME} .")

        slv_tbl = "slvr_int_prop"
        slv_lst_ts,slv_etl_nr = get_last_etl_ts(conn, slv_tbl)

        brnz_tlb = "brnz_prcl_prop_sales_dtl"
        bnz_lst_ts,bnz_etl_nr = get_last_etl_ts(conn, brnz_tlb)

        res_query = f'''
            select
                bnz.prop_attr_br_cnt,
                slv.slvr_int_prop_sk,
                bnz.brnz_prcl_prop_sales_dtl_sk,
                bnz.prop_attr_bth_cnt,
                bnz.prop_attr_sqft_nr,
                bnz.prop_yr_blt_nr,
                bnz.prop_address_line_txt, 
                bnz.prop_city_nm, 
                bnz.prop_state_nm, 
                bnz.prop_cnty_nm, 
                bnz.prop_zip_cd, 
                bnz.prop_latitude_val, 
                bnz.prop_longitude_val, 
                bnz.prop_latest_rental_amt, 
                bnz.prop_latest_sales_amt
            from
                (
                    select
                        *
                    from bronze.brnz_prcl_prop_sales_dtl
                    where etl_nr = {bnz_etl_nr} and etl_recorded_gmts <= '{bnz_lst_ts}'
                    where 
                ) bnz
                
                join
                (
                    select
                        *
                    from silver.slvr_int_prop
                    where etl_nr = {slv_etl_nr} and etl_recorded_gmts <= '{slv_lst_ts}'
                    where 
                ) slv
            on 
                bnz.prop_attr_br_cnt  = slv.prop_attr_br_cnt and
                bnz.prop_attr_bth_cnt = slv.prop_attr_bth_cnt and
                slv.prop_attr_sqft_nr in between (slv.prop_attr_sqft_nr - 200 , slv.prop_attr_sqft_nr + 200) and
                slv.prop_yr_blt_nr in between(bnz.prop_yr_blt_nr - 20 , bnz.prop_yr_blt_nr + 20)
            '''
        
        logging.info(res_query)
        result_slvr_int_prp,message = obj.return_query_res(res_query,conn)
        if message:
            logging.error(message)
            raise Exception(message)
        
        logging.info(result_slvr_int_prp)
        query = """
        SELECT 
            COALESCE(MAX(slvr_int_prop_comps_sk),0) AS slvr_int_prop_comps_sk, 
            COALESCE(MAX(etl_nr),0) AS etl_nr
        FROM silver.slvr_int_prop;
        """

        slvr_int_prop_comps_sk,etl_nr= obj.return_query_res(query,conn)[0][0]

        etl_nr = int(etl_nr) +1
        load_date_dt = datetime.today().date()
        etl_reorded_gmts = datetime.now()
        cursor = conn.cursor()

        insert_query = '''
        INSERT INTO silver.slvr_int_prop_comps(
        slvr_int_prop_comps_sk, slvr_int_prop_fk, brnz_prcl_prop_sales_dtl_fk, load_date_dt, etl_nr, etl_recorded_gmts, record_inserted_ts, prop_attr_br_cnt, prop_attr_bth_cnt, prop_attr_sqft_nr, prop_yr_blt_nr, prop_address_line_txt, prop_city_nm, prop_state_nm, prop_cnty_nm, prop_zip_cd, prop_latitude_val, prop_longitude_val, prop_latest_rental_amt, prop_latest_sales_amt, record_update_ts)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        '''
        
        for row in result_slvr_int_prp:
            slvr_int_prop_comps_sk = int(slvr_int_prop_comps_sk) + 1
            record_inserted_ts = datetime.now()
            record_update_ts  = None
            prop_attr_br_cnt = row[0]
            slvr_int_prop_sk = row[1]
            brnz_prcl_prop_sales_dtl_sk = row[2]
            prop_attr_bth_cnt = row[3]
            prop_attr_sqft_nr = row[4]
            prop_yr_blt_nr = row[5]
            prop_address_line_txt = row[6] 
            prop_city_nm = row[7]
            prop_state_nm = row[8]
            prop_cnty_nm =  row[9]
            prop_zip_cd = row[10]
            prop_latitude_val = row[11] 
            prop_longitude_val = row[12]
            prop_latest_rental_amt = row[13]
            prop_latest_sales_amt = row[14]
            cursor.execute(insert_query, (slvr_int_prop_comps_sk,slvr_int_prop_sk, brnz_prcl_prop_sales_dtl_sk,load_date_dt,etl_nr,etl_reorded_gmts,record_inserted_ts,prop_attr_br_cnt, prop_attr_bth_cnt, prop_attr_sqft_nr, prop_yr_blt_nr, prop_address_line_txt, prop_city_nm, prop_state_nm, prop_cnty_nm, prop_zip_cd, prop_latitude_val, prop_longitude_val, prop_latest_rental_amt, prop_latest_sales_amt, record_update_ts))

        conn.commit()
        
        obj.upd_lookup_tbl(conn,"slvr_int_prop",etl_reorded_gmts,etl_nr)
        obj.end_process(conn)

        logging.info("Execution ends .")

    except Exception as err:
        logging.exception("Error occured in end_process and the error is -  ",str(err))
        logging.error("Error occured in end_process and the error is -  ",str(err))
        raise Exception(err)
    

def process_slv_int_prp():
    try:
        logging.info(f"executions started: ")
        DB_HOST = os.getenv("DB_HOST")
        DB_NAME = os.getenv("DB_NAME")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")
        DB_PORT = os.getenv("DB_PORT")

        obj = ExecPostgress(DB_HOST,DB_NAME,DB_USER,DB_PASSWORD,DB_PORT)

        conn , status_msg = obj.create_connection()
        if not conn and status_msg:
            raise Exception(f"connectiuon is not established with postgress DB - {DB_NAME} .")
        
        logging.info(f"connectiuon established with postgress DB - {DB_NAME} .")
        print(f"connectiuon established with postgress DB - {DB_NAME} .")

        brnz_tlb = "silver_int_inv_dtl"
        slv_lst_ts,slv_etl_nr = get_last_etl_ts(conn, brnz_tlb)

        brnz_tlb = "brnz_prcl_prop_sales_dtl"
        brnz_lst_ts,brnz_etl_nr = get_last_etl_ts(conn, brnz_tlb)
        
    
        query = f'''
                SELECT
                    brnz_prcl_prop_sales_dtl_sk,
                    slvr_int_inv_dtl_sk,
                    brnz.prop_attr_br_cnt,
                    brnz.prop_attr_bth_cnt,
                    brnz.prop_attr_sqft_nr,
                    brnz.prop_yr_blt_nr,
                    brnz.prop_zip_cd,
                    brnz.prop_city_nm,
                    brnz.prop_state_nm,
                    brnz.prop_cnty_nm,
                    brnz.prop_address_line_txt 
    
                FROM (
                    select 
                    *
                    from(
                    SELECT 
                    *,
                    case
                        when PROP_ACTY_STATUS_CD = 'SALE' and prop_acty_sub_status_cd in('SOLD','NON_ARMS_LENGTH_TRANSFER','SOLD_INTER_PORTFOLIO_TRANSFER','NON_ARMS_LENGTH_INTRA_PORTFOLIO_TRANSFER') then true
                        when PROP_ACTY_STATUS_CD = 'LISTING' and prop_acty_sub_status_cd in( 'LISTED_SALE', 'LISTING_REMOVED', 'OTHER', 'PENDING_SALE','PRICE_CHANGE', 'RELISTED') then true
                        when PROP_ACTY_STATUS_CD = 'RENTAL' and prop_acty_sub_status_cd in('LISTED_FOR_RENT','PRICE_CHANGE','DELISTED_FOR_RENT','LISTED_RENT') then true
                        else false
                    end as flag_info
                    FROM bronze.brnz_prcl_prop_sales_dtl b
                    where PROP_ACTY_STATUS_CD in ('SALE','LISTING','RENTAL') and b.etl_nr = {brnz_etl_nr} and  b.etl_recorded_gmts <= '{brnz_lst_ts}'
                    ) c where c.flag_info = true
                ) brnz
                LEFT JOIN (
                    SELECT
                        slvr_int_inv_dtl_sk,
                        (investor_profile->>'min_sqft')::INTEGER as min_sqft,
                        (investor_profile->>'min_year')::INTEGER as min_year,
                        (investor_profile->>'list_zips')::JSONB as list_zips,
                        (investor_profile->>'min_prop_attr_br_cnt')::INTEGER as attr_br_cnt,
                        (investor_profile->>'min_prop_attr_bth_cnt')::NUMERIC as attr_bth_cnt
                    FROM silver.slvr_int_inv_dtl s
                    WHERE s.active_flg = true and s.etl_nr = {slv_etl_nr} and  s.etl_reorded_gmts <= '{slv_lst_ts}'
                ) slv
                ON brnz.prop_attr_br_cnt = slv.attr_br_cnt 
                AND brnz.prop_attr_bth_cnt = slv.attr_bth_cnt
                AND brnz.prop_attr_sqft_nr = slv.min_sqft
                AND brnz.prop_yr_blt_nr >= slv.min_year
                AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(slv.list_zips) zip
                    WHERE zip::TEXT = brnz.prop_zip_cd::TEXT
                );
            '''
        logging.info(query)
        result_slvr_int_prp,message = obj.return_query_res(query,conn)
        logging.info(result_slvr_int_prp)
        if message:
            logging.error(message)
            raise Exception(message)
        
        query = """
        SELECT 
            COALESCE(MAX(slvr_int_prop_sk),0) AS slvr_int_prop_sk, 
            COALESCE(MAX(etl_nr),0) AS etl_nr
        FROM silver.slvr_int_prop;
        """

        slvr_int_prop_sk,etl_nr= obj.return_query_res(query,conn)[0][0]

        etl_nr = int(etl_nr) +1
        load_date_dt = datetime.today().date()
        etl_reorded_gmts = datetime.now()
        cursor = conn.cursor()

        insert_query = '''
        INSERT INTO silver.slvr_int_prop(
        slvr_int_prop_sk, slvr_int_inv_dtl_fk, brnz_prcl_prop_sales_dtl_fk, load_date_dt, etl_nr, etl_recorded_gmts, record_inserted_ts, src_system_cd, src_system_dc, prop_attr_br_cnt, prop_attr_bth_cnt, prop_attr_sqft_nr, prop_yr_blt_nr, prop_address_line_txt, prop_city_nm, prop_state_nm, prop_cnty_nm, prop_zip_cd)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        '''

        for row in result_slvr_int_prp:
            slvr_int_prop_sk = int(slvr_int_prop_sk) + 1
            record_inserted_ts = datetime.now()
            src_sys_cd ='PAR'
            src_sys_dc = 'PROPSTREAM'
            brnz_prcl_prop_sales_dtl_sk = row[0]
            slvr_int_inv_dtl_sk = row[1]
            prop_attr_br_cnt = row[2]
            prop_attr_bth_cnt = row[3]
            prop_attr_sqft_nr = row[4]
            prop_yr_blt_nr = row[5]
            prop_zip_cd = row[6]
            prop_city_nm = row[7]
            prop_state_nm = row[8]
            prop_cnty_nm = row[9]
            prop_address_line_txt = row[10]
            
            cursor.execute(insert_query, (slvr_int_prop_sk,slvr_int_inv_dtl_sk,brnz_prcl_prop_sales_dtl_sk,load_date_dt,etl_nr,etl_reorded_gmts,record_inserted_ts,src_sys_cd, src_sys_dc, prop_attr_br_cnt, prop_attr_bth_cnt, prop_attr_sqft_nr, prop_yr_blt_nr, prop_address_line_txt, prop_city_nm, prop_state_nm, prop_cnty_nm, prop_zip_cd))
            
        conn.commit()
        obj.upd_lookup_tbl(conn,"slvr_int_prop",etl_reorded_gmts,etl_nr)
        obj.end_process(conn)
        logging.info(f"executions ends.")
    except Exception as err:
        logging.error("Error occured in process_slv_int_prp and the error is -  ",str(err))
        raise Exception(err)
    
def prc_slv_int_prcl_sls_dlt_pl(conn,obj,etl_nr,load_date_dt,etl_reorded_gmts,slvr_int_prop_dtl_sk):
    try:
        logging.info(f"executions started for prc_slv_int_prcl_sls_dlt_pl")
        slv_tbl = "slvr_int_prop_comps"
        slv_lst_ts,slv_etl_nr = get_last_etl_ts(conn, slv_tbl)

        brnz_tlb = "brnz_prcl_prop_sales_dtl"
        bnz_lst_ts,bnz_etl_nr = get_last_etl_ts(conn, brnz_tlb)

        query = f'''
            select
                Null asslvr_int_prop_sk,
                brnz.prop_sale_dt,
                brnz.prop_sale_amt,
                NULL as prop_tlt_cnd_nm,
                NULL as prop_int_cnd_nm, 
                NULL as prop_ext_cnd_nm, 
                NULL as prop_bth_cnd_nm, 
                NULL as prop_kth_cnd_nm,
                brnz.prop_list_price_amt,
                true as latest_record_ind,
                Null as usraddr
            from
                (select * from bronze.brnz_prcl_prop_sales_dtl where etl_nr = {bnz_etl_nr} and  etl_recorded_gmts <= '{bnz_lst_ts}') brnz
            inner join
                (select * from silver.slvr_int_prop_comps where etl_nr = {slv_etl_nr} and  etl_recorded_gmts <= '{slv_lst_ts}') slvr
            on brnz.BRNZ_PRCL_PROP_SALES_DTL_SK = slvr.BRNZ_PRCL_PROP_SALES_DTL_FK
        '''

        result_slvr_int_prp,message = obj.return_query_res(query,conn)
        if message:
            logging.error(message)
            raise Exception(message)
        
        cursor = conn.cursor()

        insert_query = '''
        INSERT INTO silver.slvr_int_prop_sales_dlt(
        slvr_int_prop_dtl_sk, slvr_int_prop_fk, load_date_dt, etl_nr, etl_recorded_gmts, record_inserted_ts, prop_sale_dt, prop_sale_amt, prop_tlt_cnd_nm, prop_int_cnd_nm, prop_ext_cnd_nm, prop_bth_cnd_nm, prop_kth_cnd_nm, prop_list_price_amt, latest_record_ind)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        '''
        
        for row in result_slvr_int_prp:
            slvr_int_prop_dtl_sk = int(slvr_int_prop_dtl_sk) + 1
            record_inserted_ts = datetime.now()
            slvr_int_prop_fk = row[0]
            prop_sale_dt = row[1]
            prop_sale_amt= row[2]
            prop_tlt_cnd_nm = row[3]
            prop_int_cnd_nm = row[4]
            prop_ext_cnd_nm = row[5]
            prop_bth_cnd_nm = row[6]
            prop_kth_cnd_nm = row[7]
            prop_list_price_amt = row[8]
            latest_record_ind = row[9]
            usraddr = row[10]

            cursor.execute(insert_query, (slvr_int_prop_dtl_sk, slvr_int_prop_fk, load_date_dt, etl_nr,etl_reorded_gmts , record_inserted_ts, prop_sale_dt, prop_sale_amt, prop_tlt_cnd_nm, prop_int_cnd_nm, prop_ext_cnd_nm, prop_bth_cnd_nm, prop_kth_cnd_nm, prop_list_price_amt, latest_record_ind,usraddr))
        conn.commit()
        logging.info(f"executions finished for   prc_slv_int_prcl_sls_dlt_pl")
    except Exception as err:
        logging.error("Error occured in  prc_slv_int_prcl_sls_dlt_pl and the error is -  ",str(err))
        raise Exception(err)
    

def prc_slv_int_prop_sls_dlt_pl(conn,obj,etl_nr,load_date_dt,etl_recorded_gmts,slvr_int_prop_dtl_sk):
    try:
        logging.info(f"executions started for prc_slv_int_prop_sls_dlt_pl")
        brnz_tlb = "pl_brnz_prps_prop_sales_dtl"
        bnz_lst_ts,bnz_etl_nr = get_last_etl_ts(conn, brnz_tlb)

        query = f'''
                with cte as(
                    SELECT
                        Null as slvr_int_prop_fk,
                        PROP_LAST_SALE_DT as prop_sale_dt,
                        PROP_LAST_SALE_AMT as prop_sale_amt,
                        PROP_TLT_CND_NM as prop_tlt_cnd_nm ,
                        PROP_INT_CND_NM as prop_int_cnd_nm ,
                        PROP_EXT_CND_NM as prop_ext_cnd_nm,
                        PROP_BTH_CND_NM as prop_bth_cnd_nm,
                        PROP_KTH_CND_NM as prop_kth_cnd_nm,
                        PROP_LIST_PRICE_AMT as prop_list_price_amt,
                        CONCAT(PROP_ADDRESS_LINE_TXT,'/',PROP_CITY_NM,'/',PROP_STATE_NM,'/',PROP_CNTY_NM,'/',PROP_ZIP_CD) as usraddr,
                        dense_rank() over(partition by CONCAT(PROP_ADDRESS_LINE_TXT,'/',PROP_CITY_NM,'/',PROP_STATE_NM,'/',PROP_CNTY_NM,'/',PROP_ZIP_CD) order by PROP_LAST_SALE_DT desc) as d_rank
                    FROM 
                    bronze.brnz_prps_prop_sales_dtl
                    where etl_nr = {bnz_etl_nr} and  etl_recorded_gmts <= '{bnz_lst_ts}'
                    ORDER BY brnz_prps_prop_sales_dtl_sk ASC 
                )
                select
                    *,
                    case
                        when  d_rank = 1 then true else false
                    end 
                    as latest_record_ind
                from cte;
            '''

        result_slvr_int_prp,message = obj.return_query_res(query,conn)
        if message:
            logging.error(message)
            raise Exception(message)
        

        insert_query = '''
        INSERT INTO silver.slvr_int_prop_sales_dlt(
        slvr_int_prop_dtl_sk, slvr_int_prop_fk, load_date_dt, etl_nr, etl_recorded_gmts, record_inserted_ts, prop_sale_dt, prop_sale_amt, prop_tlt_cnd_nm, prop_int_cnd_nm, prop_ext_cnd_nm, prop_bth_cnd_nm, prop_kth_cnd_nm, prop_list_price_amt, latest_record_ind)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        '''
        
        for row in result_slvr_int_prp:
            cur = conn.cursor()
            slvr_int_prop_dtl_sk = int(slvr_int_prop_dtl_sk) + 1
            record_inserted_ts = datetime.now()
            slvr_int_prop_fk = row[0]
            prop_sale_dt = row[1]
            prop_sale_amt= row[2]
            prop_tlt_cnd_nm = row[3]
            prop_int_cnd_nm = row[4]
            prop_ext_cnd_nm = row[5]
            prop_bth_cnd_nm = row[6]
            prop_kth_cnd_nm = row[7]
            prop_list_price_amt = row[8]
            usraddr = row[9]
            latest_record_ind = row[11]

            query = '''
            SELECT * FROM silver.slvr_int_prop_sales_dlt WHERE latest_record_ind = true and usraddr = %s
            '''
            
            cur.execute(query, (usraddr,))
            result = cur.fetchall()

            if result:
                updquery = '''
                update silver.slvr_int_prop_sales_dlt set latest_record_ind = false where latest_record_ind = true and usraddr = %s
                '''
                cur.execute(updquery, (usraddr,))
                #rslt = cur.fetchall()

            insert_query = """
                INSERT INTO silver.slvr_int_prop_sales_dlt (
                    slvr_int_prop_dtl_sk, slvr_int_prop_fk, load_date_dt, etl_nr,
                    etl_recorded_gmts, record_inserted_ts, prop_sale_dt, prop_sale_amt,
                    prop_tlt_cnd_nm, prop_int_cnd_nm, prop_ext_cnd_nm, prop_bth_cnd_nm,
                    prop_kth_cnd_nm, prop_list_price_amt, latest_record_ind, usraddr
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
            """
            cur.execute(insert_query, (
                slvr_int_prop_dtl_sk, slvr_int_prop_fk, load_date_dt, etl_nr,
                etl_recorded_gmts, record_inserted_ts, prop_sale_dt, prop_sale_amt,
                prop_tlt_cnd_nm, prop_int_cnd_nm, prop_ext_cnd_nm, prop_bth_cnd_nm,
                prop_kth_cnd_nm, prop_list_price_amt, latest_record_ind, usraddr
            ))


        conn.commit()
        logging.info(f"executions finished for  prc_slv_int_prp_sls_dlt_pl2")

    except Exception as err:
        logging.error("Error occured in prc_slv_int_prp_sls_dlt_pl1 and the error is -  ",str(err))
        raise Exception(err)
    
def call_slvr_int_prp_dtl(conn,obj,etl_nr,load_date_dt,etl_recorded_gmts,slvr_int_prop_dtl_sk):
    try:
        logging.info(f"executions started for prc_slv_int_prop_sls_dlt_pl")
        prc_slv_int_prop_sls_dlt_pl(conn,obj,etl_nr,load_date_dt,etl_recorded_gmts,slvr_int_prop_dtl_sk)
        logging.info(f"executions ends for prc_slv_int_prop_sls_dlt_pl")
        logging.info(f"executions started for prc_slv_int_prcl_sls_dlt_pl")
        prc_slv_int_prcl_sls_dlt_pl(conn,obj,etl_nr,load_date_dt,etl_recorded_gmts,slvr_int_prop_dtl_sk)
        logging.info(f"executions started for prc_slv_int_prcl_sls_dlt_pl")
        obj.upd_lookup_tbl(conn,"slvr_int_prop_sales_dlt",etl_recorded_gmts,etl_nr)
        obj.end_process(conn)
    except Exception as err:
        logging.error("Error occured in prc_slv_int_prp_sls_dlt_pl1 and the error is -  ",str(err))
        raise Exception(err)
    

def bnz_prps_upd(etl_recorded_gmts,etl_nr):
    try:
        DB_HOST = os.getenv("DB_HOST")
        DB_NAME = os.getenv("DB_NAME")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")
        DB_PORT = os.getenv("DB_PORT")

        obj = ExecPostgress(DB_HOST,DB_NAME,DB_USER,DB_PASSWORD,DB_PORT)

        logging.info(f"etl_recorded_gmts - {etl_recorded_gmts} .")
        logging.info(f"etl_nr - {etl_nr} .")

        conn , status_msg = obj.create_connection()
        if not conn and status_msg:
            raise Exception(f"connectiuon is not established with postgress DB - {DB_NAME} .")
        
        logging.info(f"connectiuon established with postgress DB - {DB_NAME} .")
        print(f"connectiuon established with postgress DB - {DB_NAME} .")

        obj.upd_lookup_tbl(conn,"pl_brnz_prps_prop_sales_dtl",etl_recorded_gmts,etl_nr)
        obj.end_process(conn)
        logging.info(f"executions finished for  bnz_prps_upd")

    except Exception as err:
        logging.error("Error occured in bnz_prps_upd and the error is -  ",str(err))
        raise Exception(err)


SEARC_ADDR_API = "https://api.parcllabs.com/v1/property/search_address"
EVENT_HISTORY_API = "https://api.parcllabs.com/v1/property/event_history"


def subtract_months(date, months):
    """Subtracts months from a given date without using dateutil."""
    month = date.month - months
    year = date.year

    # Adjust the year and month if necessary
    while month <= 0:
        month += 12
        year -= 1

    # Handle edge cases where day might not exist in target month (e.g., Feb 30)
    day = min(date.day, (datetime(year, month, 1).replace(day=28) + timedelta(days=4)).day)
    
    return datetime(year, month, day)

def get_valid_event(events, primary_type, primary_name, fallback_type=None, fallback_name=None):
    """
    Retrieve the latest event of primary_type and primary_name.
    If its price is 0, fallback to fallback_type and fallback_name.
    """
    primary_event = None
    fallback_event = None
    
    for event in sorted(events, key=lambda x: x["event_date"], reverse=True):
        if event["PROP_ACTY_STATUS_CD"] == primary_type and event["PROP_ACTY_SUB_STATUS_CD"] == primary_name:
            primary_event = event
            if event["price"] > 0:
                return event
        elif fallback_type and fallback_name and event["PROP_ACTY_STATUS_CD"] == fallback_type and event["PROP_ACTY_SUB_STATUS_CD"] == fallback_name:
            fallback_event = event
    
    return primary_event if primary_event and primary_event["price"] > 0 and primary_event["price"] is not None  else fallback_event

def api_info_extract_load_brnx_prc(obj,conn,bnz_pk,etl_nr,insert_query):
    try:
        query = """
        select max(etl_nr) as etl_nr, max(last_loaded_ts) as last_loaded_ts
        from lookups.adf_load_tracker
        where tbl_nm = 'brnz_goog_prop_add_dtl';
        """
        etl_nr_ld ,last_loaded_ts = obj.return_query_res(query,conn)[0][0]
        last_loaded_ts = str(last_loaded_ts)
        bnz_pk = int(bnz_pk)
        etl_nr = int(etl_nr) + 1
        cursor = conn.cursor()

        print(last_loaded_ts)

        query = f"""
            SELECT prop_address_line_txt, prop_city_nm, prop_state_nm, prop_zip_cd 
            FROM bronze.brnz_goog_prop_add_dtl
            WHERE etl_nr = {etl_nr_ld} AND etl_recorded_gmts <= '{last_loaded_ts}'
            ORDER BY brnz_goog_prop_address_dtl_sk ASC;
        """
        result_ggl, message = obj.return_query_res(query, conn)

        if message:
            raise Exception(message)
        
        etl_reorded_gmts = datetime.now()

        for row in result_ggl:
            bnz_pk = bnz_pk + 1
            prop_address_line_txt = row[0]
            prop_city_nm = row[1]
            prop_state_nm = row[2]
            prop_zip_cd  = row[3]
            
            headers = {
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Accept": "application/json",
                "Authorization": "40Kajrsnv7zy5ycq0mGFwLMbvNwgpAvekSYgOcCbHAo" 
            }
         
            body = [
                {
                    "address": prop_address_line_txt,
                    "city": prop_city_nm,
                    "state_abbreviation": prop_state_nm,
                    "zip_code": prop_zip_cd
                }
            ]
            srch_res = requests.post(SEARC_ADDR_API, headers=headers, json=body).json()['items']
            load_date_dt = datetime.today().date()
            
            for res in srch_res:
                parcl_property_id_lis =res['parcl_property_id'] 
                bedrooms = res['bedrooms']
                bathrooms = int(math.ceil(res['bathrooms']))
                square_footage = res['square_footage']
                year_built =  res['year_built']
                address =  res['address']
                city = res['city']
                state_abbreviation = res['state_abbreviation']
                county = res['county']
                zip_code = res['zip_code']
                PROP_LIST_PRICE_AMT = None
                latitude = res['latitude']
                longitude = res['longitude']
                # previous_date = load_date_dt - relativedelta(months=6)
                previous_date = subtract_months(load_date_dt,6)
                previous_date = previous_date.strftime("%Y-%m-%d")
                
                js_bd = {
                    "parcl_property_id": [str(parcl_property_id_lis)],
                    "start_date": previous_date
                }

                event_res = None
                            
                event_res = requests.post(EVENT_HISTORY_API, headers=headers, json=js_bd)
                if event_res.status_code != 200:
                    print(f"for {parcl_property_id_lis} this is the error not making call - {event_res.json()}")
                    logging.error(f"for {parcl_property_id_lis} this is the error not making call - {event_res.json()}")
                    continue

                event_res = event_res.json()['items'] 
                PROP_ACTY_STATUS_DC = None 
                PROP_ACTY_SUB_STATUS_DC = None       
                events_list = []
                
                for event in event_res:
                    events_list.append({
                        "PROP_ACTY_STATUS_CD": event['event_type'],
                        "PROP_ACTY_SUB_STATUS_CD": event['event_name'],
                        "event_date": datetime.strptime(event['event_date'], "%Y-%m-%d"),
                        "entity_owner_name": event['entity_owner_name'],
                        "price": event['price']
                    })
              

                # Process SALE - SOLD, fallback to LISTING - PENDING SALE if price is 0
                selected_event = get_valid_event(events_list, "SALE", "SOLD", "LISTING", "PENDING SALE")
                if selected_event:
                    cursor.execute(
                        insert_query,
                        (bnz_pk, load_date_dt, etl_nr, etl_reorded_gmts, datetime.now(),
                        selected_event["entity_owner_name"], selected_event["event_date"], selected_event["price"],
                        bedrooms, bathrooms, square_footage, year_built, address, city, state_abbreviation,
                        county, zip_code, PROP_LIST_PRICE_AMT, selected_event["PROP_ACTY_STATUS_CD"],
                        PROP_ACTY_STATUS_DC, selected_event["PROP_ACTY_SUB_STATUS_CD"], PROP_ACTY_SUB_STATUS_DC,
                        latitude, longitude)
                    )

               # Process RENTAL - DELISTED FOR RENT separately
                rental_event = get_valid_event(events_list, "RENTAL", "DELISTED FOR RENT")
                if rental_event:
                    cursor.execute(
                        insert_query,
                        (bnz_pk, load_date_dt, etl_nr, etl_reorded_gmts, datetime.now(),
                        rental_event["entity_owner_name"], rental_event["event_date"], rental_event["price"],
                        bedrooms, bathrooms, square_footage, year_built, address, city, state_abbreviation,
                        county, zip_code, PROP_LIST_PRICE_AMT, rental_event["PROP_ACTY_STATUS_CD"],
                        PROP_ACTY_STATUS_DC, rental_event["PROP_ACTY_SUB_STATUS_CD"], PROP_ACTY_SUB_STATUS_DC,
                        latitude, longitude)
                    )

        conn.commit()
        return etl_reorded_gmts,etl_nr
    except Exception as err:
        print(err)
        logging.error(f"Error occure in api_info_extract_load_brnx_prc and the error is  - {str(err)}")
        raise Exception (err)

def process_bnz_prcl_dtl():
    try:
        DB_HOST = os.getenv("DB_HOST")
        DB_NAME = os.getenv("DB_NAME")
        DB_USER = os.getenv("DB_USER")
        DB_PASSWORD = os.getenv("DB_PASSWORD")
        DB_PORT = os.getenv("DB_PORT")

        obj = ExecPostgress(DB_HOST,DB_NAME,DB_USER,DB_PASSWORD,DB_PORT)

        conn , status_msg = obj.create_connection()
        if not conn and status_msg:
            raise Exception(f"connectiuon is not established with postgress DB - {DB_NAME} .")
        
        logging.info(f"connectiuon established with postgress DB - {DB_NAME} .")
        
        query = """
        SELECT 
            COALESCE(MAX(brnz_prcl_prop_sales_dtl.brnz_prcl_prop_sales_dtl_sk),0) AS bnz_pk, 
            COALESCE(MAX(brnz_prcl_prop_sales_dtl.etl_nr),0) AS etl_nr
        FROM bronze.brnz_prcl_prop_sales_dtl;
        """
        bnz_pk,etl_nr= obj.return_query_res(query,conn)[0][0]
        logging.info(f"bnz_pk: {bnz_pk}")
        logging.info(f"etl_nr: {etl_nr}")

        insert_query = """
            INSERT INTO bronze.brnz_prcl_prop_sales_dtl(
	        brnz_prcl_prop_sales_dtl_sk, load_date_dt, etl_nr, etl_recorded_gmts, record_inserted_ts, investor_company_nm_txt, prop_sale_dt, prop_sale_amt, prop_attr_br_cnt, prop_attr_bth_cnt, prop_attr_sqft_nr, prop_yr_blt_nr, prop_address_line_txt, prop_city_nm, prop_state_nm, prop_cnty_nm, prop_zip_cd, prop_list_price_amt, prop_acty_status_cd, prop_acty_status_dc, prop_acty_sub_status_cd, prop_acty_sub_status_dc, prop_latitude_val, prop_longitude_val)
	        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """

        etl_reorded_gmts,etl_nr = api_info_extract_load_brnx_prc(obj,conn,bnz_pk,etl_nr,insert_query)
        obj.upd_lookup_tbl(conn,"brnz_prcl_prop_sales_dtl",etl_reorded_gmts,etl_nr)
        obj.end_process(conn)
    except Exception as err:
        logging.error(f"Error occure in process_bnz_prcl_dtl and the error is  - {str(err)}")
        raise Exception(err)
    




def getway(process_key,dic):
    try:
        if process_key:
            if process_key == "process_silver_int_inv_dtl":
                logging.info(f"executions started for process_silver_int_inv_dtl")
                process_slv_int_inv()
                logging.info('process_slv_int_inv function process succesfully.')
                return None
            
            elif process_key == "process_bnz_prcl_dtl":
                logging.info('calling process_bnz_prcl_dtl function.')
                process_bnz_prcl_dtl()
                logging.info('process_bnz_prcl_dtl function process succesfully.')
                return None
            
            elif process_key == "process_slv_int_prp":
                logging.info('calling process_slv_int_prp function.')
                process_slv_int_prp()
                logging.info('process_slv_int_prp function process succesfully.')
                return None
            
            elif process_key == "process_slv_pr_cmps":
                logging.info('calling process_slv_int_prp function.')
                process_slv_int_pr_cmps()
                logging.info('process_slv_int_prp function process succesfully.')
                return None

            elif process_key == "call_slvr_int_prp_dtl":
                logging.info('calling call_slvr_int_prp_dtl function.')
                DB_HOST = os.getenv("DB_HOST")
                DB_NAME = os.getenv("DB_NAME")
                DB_USER = os.getenv("DB_USER")
                DB_PASSWORD = os.getenv("DB_PASSWORD")
                DB_PORT = os.getenv("DB_PORT")

                obj = ExecPostgress(DB_HOST,DB_NAME,DB_USER,DB_PASSWORD,DB_PORT)
                conn , status_msg = obj.create_connection()

                if not conn and status_msg:
                    raise Exception(f"connectiuon is not established with postgress DB - {DB_NAME} .")
                
                logging.info(f"connectiuon established with postgress DB - {DB_NAME} .")

                query = """
                SELECT 
                    COALESCE(MAX(slvr_int_prop_dtl_sk),0) AS slvr_int_prop_dtl_sk, 
                    COALESCE(MAX(etl_nr),0) AS etl_nr
                FROM silver.slvr_int_prop_sales_dlt;
                """

                slvr_int_prop_dtl_sk,etl_nr= obj.return_query_res(query,conn)[0][0]

                etl_nr = int(etl_nr) +1
                load_date_dt = datetime.today().date()
                etl_recorded_gmts = datetime.now()
                logging.info('call_slvr_int_prp_dtl function process succesfully.')
                thread = threading.Thread(
                    target=call_slvr_int_prp_dtl,
                    args=(conn, obj, etl_nr, load_date_dt, etl_recorded_gmts, slvr_int_prop_dtl_sk),
                    daemon=True
                )
                thread.start()

                logging.info('call_slvr_int_prp_dtl function process succesfully.')
                return etl_nr

            elif process_key == "bnz_prps_upd":
                etl_recorded_gmts =  dic.get('etl_recorded_gmts',None)
                etl_nr = dic.get('etl_nr',None)
                logging.info('calling bnz_prps_upd function.')
                bnz_prps_upd(etl_recorded_gmts,etl_nr)
                logging.info('bnz_prps_upd function process succesfully.')
                return None
            else:
                logging.info(f"execution happened .{process_key} not deteced.")
                return None
 
    except Exception as err:
        logging.error("Error occured in getway and the error is -  ",str(err))
        raise Exception(err)

