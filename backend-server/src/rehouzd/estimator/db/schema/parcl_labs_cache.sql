-- Create table to cache Parcl Labs API responses
CREATE TABLE IF NOT EXISTS parcl_labs_cache (
    id SERIAL PRIMARY KEY,
    address_hash VARCHAR(64) NOT NULL, -- Hash of the search address for quick lookup
    search_address TEXT NOT NULL, -- Original search address
    address_response JSONB, -- Response from searchAddress API
    events_response JSONB, -- Response from searchPropertiesWithEvents API
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for quick lookups
    UNIQUE(address_hash)
);

-- Create index on address_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_parcl_labs_cache_address_hash ON parcl_labs_cache(address_hash);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_parcl_labs_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_parcl_labs_cache_updated_at
    BEFORE UPDATE ON parcl_labs_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_parcl_labs_cache_updated_at();
