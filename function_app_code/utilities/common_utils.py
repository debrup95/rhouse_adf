import psycopg2
import logging


class ExecPostgress:
    def __init__(self,DB_HOST,DB_NAME,DB_USER,DB_PASSWORD,DB_PORT):
        self.DB_HOST = DB_HOST
        self.DB_NAME = DB_NAME
        self.DB_USER = DB_USER
        self.DB_PASSWORD = DB_PASSWORD
        self.DB_PORT = DB_PORT

    def create_connection(self):
        try:
            conn = psycopg2.connect(
                host=self.DB_HOST,
                database=self.DB_NAME,
                user=self.DB_USER,
                password=self.DB_PASSWORD,
                port=self.DB_PORT,
                sslmode="require"
            )  
            return conn,None
        except Exception as err:
            logging.error("Error occured in create_connection and the error is -  ",str(err))
            return False,str(err)

    def return_query_res(self,query,conn):
        try:
            cur = conn.cursor()
            cur.execute(query)
            result = cur.fetchall()
            return result,None
        except Exception as err:
            logging.error("Error occured in query_tbl and the error is -  ",str(err))
            raise Exception(err)
        
    def upd_lookup_tbl(self,conn,pipeline_nm,etl_reorded_gmts,etl_nr):
        try:
            logging.info("upd_lookup_tbl process started")
            query = '''
                    select max(tbl_id) as mx_id
                    from lookups.adf_load_tracker;
                    '''
            mx_id,msg = self.return_query_res(query,conn)

            if msg:
                raise Exception(f"Error  - {msg} .")
            
            mx_id = mx_id[0][0]
            if mx_id is None:
                mx_id = 0

            mx_id = int(mx_id) + 1
            logging.info(mx_id)

            query = '''
                    insert into lookups.adf_load_tracker(tbl_id,tbl_nm,last_loaded_ts,etl_nr)
                    values(%s, %s, %s, %s)
                    '''
            cursor = conn.cursor()
            cursor.execute(query,(mx_id,pipeline_nm,etl_reorded_gmts,etl_nr))
            conn.commit()
            logging.info("upd_lookup_tbl process completed")
        except Exception as err:
            logging.error(f"upd_lookup_tbl error occured - {str(err)}")
            raise Exception(err)
        
    def end_process(self,conn):
        try:
            logging.info("closing connection.")
            conn.close()
            logging.info("connection closed")
        except Exception as err:
            logging.error("Error occured in end_process and the error is -  ",str(err))
            raise Exception(err)
          
def get_last_etl_ts(conn,tbl_name):
    try:
        logging.info("get_last_etl_ts")
        cursor = conn.cursor()
        query = """
            SELECT 
                COALESCE(MAX(last_loaded_ts), '1970-01-01'::timestamp) AS slv_lst_ts, 
                COALESCE(MAX(etl_nr), 0) AS slv_etl_nr
            FROM lookups.adf_load_tracker
            WHERE tbl_nm = %s;
        """
        cursor.execute(query, (tbl_name,))
        result = cursor.fetchone()  
        lst_ts, etl_nr = result
        return lst_ts,etl_nr
    except Exception as err:
        logging.error("Error occured in end_process and the error is -  ",str(err))
        raise Exception(err)
