# Skip Trace Cache Clearing Guide

This guide helps you clear cached skip trace results for testing purposes.

## Important: Column Names & Normalization
- The cache uses `input_owner_name_normalized` (for buyer/owner name) and `input_address_normalized` (for property address).
- **Always use lowercase and trimmed values** for matching (the system normalizes these fields).
- Clear `skip_trace_user_access` first, then `skip_trace_results`.

## 🧹 **Quick Cache Clear Commands**

### 1. Clear Cache for Specific Buyer (Owner Name)
```sql
-- Replace with your normalized owner name (case-insensitive)
DELETE FROM skip_trace_user_access 
WHERE lookup_id IN (
    SELECT lookup_id FROM skip_trace_results 
    WHERE LOWER(TRIM(input_owner_name_normalized)) = LOWER(TRIM('jc restoration co llc'))
);

DELETE FROM skip_trace_results 
WHERE LOWER(TRIM(input_owner_name_normalized)) = LOWER(TRIM('jc restoration co llc'));
```

### 2. Clear Cache for Specific Property Address
```sql
-- Replace with your normalized address (case-insensitive, partial match allowed)
DELETE FROM skip_trace_user_access 
WHERE lookup_id IN (
    SELECT lookup_id FROM skip_trace_results 
    WHERE LOWER(TRIM(input_address_normalized)) LIKE LOWER('%690 oasis cv%')
);

DELETE FROM skip_trace_results 
WHERE LOWER(TRIM(input_address_normalized)) LIKE LOWER('%690 oasis cv%');
```

### 3. Clear Cache for Buyer + Address Combination
```sql
DELETE FROM skip_trace_user_access 
WHERE lookup_id IN (
    SELECT lookup_id FROM skip_trace_results 
    WHERE LOWER(TRIM(input_owner_name_normalized)) = LOWER(TRIM('jc restoration co llc'))
      AND LOWER(TRIM(input_address_normalized)) LIKE LOWER('%690 oasis cv%')
);

DELETE FROM skip_trace_results 
WHERE LOWER(TRIM(input_owner_name_normalized)) = LOWER(TRIM('jc restoration co llc'))
  AND LOWER(TRIM(input_address_normalized)) LIKE LOWER('%690 oasis cv%');
```

### 4. Clear All Recent Cache (Last 24 Hours)
```sql
DELETE FROM skip_trace_user_access 
WHERE lookup_id IN (
    SELECT lookup_id FROM skip_trace_results 
    WHERE created_at > NOW() - INTERVAL '24 hours'
);

DELETE FROM skip_trace_results 
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### 5. View Current Cache Before Clearing
```sql
SELECT 
    lookup_id,
    input_owner_name_normalized,
    input_address_normalized,
    found_email_addresses,
    found_phone_numbers,
    api_response_status,
    created_at,
    first_lookup_date
FROM skip_trace_results 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔄 **Testing Workflow**

### For Provider Switching Tests:
1. **Before Testing**: Clear cache for your test owner
   ```sql
   DELETE FROM skip_trace_user_access WHERE lookup_id IN (
       SELECT lookup_id FROM skip_trace_results WHERE LOWER(TRIM(input_owner_name_normalized)) = LOWER(TRIM('jc restoration co llc'))
   );
   DELETE FROM skip_trace_results WHERE LOWER(TRIM(input_owner_name_normalized)) = LOWER(TRIM('jc restoration co llc'));
   ```

2. **Test with BatchData**: Run skip trace request
3. **Verify**: Check logs for `🚀 Provider Selection Debug` showing BatchData
4. **Clear Again**: Repeat step 1 to test fallback or Lead Sherpa

### For Contact Info Extraction Tests:
1. **Clear Cache**: Use owner-specific clear command
2. **Test**: Run skip trace with business entity (like LLC)
3. **Check Logs**: Look for `🏢 Business Entity Contact Extraction` debug logs
4. **Verify Results**: Should show non-zero emails and phones

## 🎯 **Environment-Specific Commands**

### Development/Local Testing
```sql
-- Safe for dev - clears only your test data
DELETE FROM skip_trace_user_access WHERE lookup_id IN (
    SELECT lookup_id FROM skip_trace_results 
    WHERE input_owner_name_normalized IN ('jc restoration co llc', 'test buyer llc', 'demo company')
);
DELETE FROM skip_trace_results 
WHERE input_owner_name_normalized IN ('jc restoration co llc', 'test buyer llc', 'demo company');
```

### Production (⚠️ BE CAREFUL)
```sql
-- Only clear specific problematic entries
DELETE FROM skip_trace_user_access WHERE lookup_id = 'SPECIFIC_LOOKUP_ID';
DELETE FROM skip_trace_results WHERE lookup_id = 'SPECIFIC_LOOKUP_ID';
```

## 🔍 **Debug Cache Status**

### Check if Result is Cached
```sql
SELECT 
    'CACHED' as status,
    input_owner_name_normalized,
    input_address_normalized,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as age_hours
FROM skip_trace_results 
WHERE LOWER(TRIM(input_owner_name_normalized)) = LOWER(TRIM('jc restoration co llc'))
ORDER BY created_at DESC;
```

### Verify Cache Clearing
```sql
-- Should return 0 rows after clearing
SELECT COUNT(*) as cached_results 
FROM skip_trace_results 
WHERE LOWER(TRIM(input_owner_name_normalized)) = LOWER(TRIM('jc restoration co llc'));
```

## 📝 **Notes**
- **Always clear `skip_trace_user_access` first** to maintain referential integrity
- **Use exact normalized owner names and addresses** as they appear in your tests
- **Cache expiry** is configurable via `SKIP_TRACE_CACHE_EXPIRY_DAYS` environment variable
- **Address matching** uses LIKE with wildcard for flexibility
- **Test in dev environment first** before running on production 