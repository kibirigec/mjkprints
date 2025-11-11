# Large PDF Upload Troubleshooting Guide

## Issue: 25MB PDF Upload Errors

### Changes Made to Fix Large File Uploads

1. **Added upload progress tracking** - Now logs progress every 10% for large files
2. **Increased timeout** - Set 10-minute timeout for upload parsing
3. **Enhanced formidable config** - Added explicit size limits and field sizes
4. **API route configuration** - Added response limit and execution time settings

### Configuration Summary

- **Max File Size**: 500MB (PDFs)
- **Upload Timeout**: 10 minutes
- **Progress Logging**: Every 10% for files over 1MB
- **Execution Time**: 5 minutes (where supported)

### Common Errors and Solutions

#### 1. "Request Entity Too Large" (413)
**Cause**: Next.js body size limit or reverse proxy (nginx/Apache)
**Solution**: 
- Check if you're behind a reverse proxy
- For nginx: Add `client_max_body_size 500M;` to nginx config
- For Apache: Add `LimitRequestBody 524288000` to .htaccess

#### 2. "Upload timeout" or "ETIMEDOUT"
**Cause**: Network timeout or slow connection
**Solution**:
- Check network speed (25MB should upload in ~10-60 seconds on decent connection)
- Increase timeout in client-side upload code
- Check if firewall/antivirus is interfering

#### 3. "Payload Too Large"
**Cause**: Supabase storage policy or bucket limit
**Solution**:
```sql
-- Check and update storage policies in Supabase SQL Editor
ALTER POLICY "Allow authenticated uploads to mjk-prints-storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mjk-prints-storage' 
  AND auth.role() = 'authenticated'
  -- Remove any size restrictions here
);
```

#### 4. "Failed to upload file to storage"
**Cause**: Supabase storage error or MIME type issue
**Solution**:
- Check Supabase dashboard for storage errors
- Verify bucket exists and is accessible
- Check storage quota hasn't been exceeded
- Verify MIME type is allowed: `application/pdf`

#### 5. "ENOENT" or "no such file"
**Cause**: Temporary file deleted before upload completes
**Solution**:
- Check /tmp directory has sufficient space: `df -h /tmp`
- Ensure no process is cleaning /tmp aggressively

### How to Debug Your Specific Error

1. **Check Browser Console**:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for error messages during upload

2. **Check Network Tab**:
   - Open DevTools (F12) → Network tab
   - Filter by "upload"
   - Click on the failed request
   - Check:
     - Status code (400, 413, 500, 504, etc.)
     - Response body (contains error details)
     - Request payload size

3. **Check Server Logs**:
   The upload API now logs detailed information. In your terminal where `npm run dev` is running, look for:
   ```
   [PDF-UPLOAD-INFO] Upload progress: {"progress":"10%","received":"2.50MB","expected":"25.00MB"}
   [PDF-UPLOAD-ERROR] Form parsing failed: {...}
   [PDF-UPLOAD-ERROR] Storage upload failed: {...}
   ```

4. **Test with smaller PDFs**:
   - Try 5MB PDF - works? ✓
   - Try 10MB PDF - works? ✓
   - Try 25MB PDF - fails? ✗
   - This helps identify the threshold

### Quick Test Commands

```bash
# Test API endpoint is accessible
curl -X POST http://localhost:3000/api/upload/pdf

# Check /tmp space
df -h /tmp

# Monitor upload in real-time (in separate terminal)
tail -f ~/.pm2/logs/*.log  # if using PM2
# OR just watch the npm run dev output
```

### Expected Flow for 25MB PDF

1. **0-5s**: Authentication check passes
2. **5-60s**: File upload to server (depends on network)
   - Progress logs appear every 2-5 seconds
3. **60-75s**: File validation (PDF structure check)
4. **75-90s**: Checksum generation
5. **90-120s**: Upload to Supabase storage (depends on Supabase connection)
6. **120-125s**: Database record creation
7. **125-130s**: Success response

**Total expected time: 2-3 minutes for 25MB on decent connection**

### Restart Dev Server

After these changes, you **must restart** your dev server:
```bash
# Stop the current dev server (Ctrl+C)
# Then restart
npm run dev
```

### If Still Not Working

Please check and report:

1. **Exact error message** from browser console
2. **Status code** from Network tab
3. **Server logs** from terminal during upload attempt
4. **File size** that fails (is it exactly 25MB or approximate?)
5. **Network speed** (run a speed test)
6. **Supabase storage quota** (check dashboard)

This information will help identify the exact cause of the failure.
