-- ALTER TABLE script to add user activity tracking to bronze.brnz_goog_prop_add_dtl
-- This adds user search tracking functionality without recreating the table

-- Add user activity tracking columns
ALTER TABLE bronze.brnz_goog_prop_add_dtl
ADD COLUMN searched_by_user_id BIGINT,
ADD COLUMN search_session_id VARCHAR(255),
ADD COLUMN searched_at TIMESTAMPTZ,
ADD COLUMN search_type VARCHAR(50),
ADD COLUMN search_source VARCHAR(50),
ADD COLUMN results_found BOOLEAN DEFAULT TRUE;

-- Add foreign key constraint for user tracking
ALTER TABLE bronze.brnz_goog_prop_add_dtl
ADD CONSTRAINT fk_brnz_goog_prop_add_dtl_user
    FOREIGN KEY (searched_by_user_id)
    REFERENCES users(user_id)
    ON DELETE SET NULL;

-- Add indexes for user activity tracking
CREATE INDEX IF NOT EXISTS idx_brnz_goog_prop_add_dtl_user_search 
    ON bronze.brnz_goog_prop_add_dtl(searched_by_user_id, searched_at);
    
CREATE INDEX IF NOT EXISTS idx_brnz_goog_prop_add_dtl_session 
    ON bronze.brnz_goog_prop_add_dtl(search_session_id);
    
CREATE INDEX IF NOT EXISTS idx_brnz_goog_prop_add_dtl_search_type 
    ON bronze.brnz_goog_prop_add_dtl(search_type);
    
CREATE INDEX IF NOT EXISTS idx_brnz_goog_prop_add_dtl_user_activity 
    ON bronze.brnz_goog_prop_add_dtl(searched_by_user_id) 
    WHERE searched_by_user_id IS NOT NULL;
    