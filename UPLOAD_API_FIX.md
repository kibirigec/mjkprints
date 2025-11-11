# Upload API Issue Analysis & Fix

## Issue Found

Your upload API was failing due to a **cookie parsing issue** in the authentication middleware.

### Root Cause

The `verifyAdminSession` function in `/pages/api/admin/auth.js` was trying to access `req.cookies['mjk-admin-session']`, but **Next.js API routes do not automatically parse cookies into a `req.cookies` object**. 

The Cookie header exists as a raw string in `req.headers.cookie`, but it needs to be manually parsed.

### Symptoms

- Upload API returning 401 "No session cookie found" error
- Authentication appears to work in the dashboard, but file uploads fail
- Session cookie is correctly set by the login endpoint, but not read by the upload endpoints

## Fix Applied

Added a `parseCookies()` helper function to manually parse the Cookie header:

```javascript
// Helper function to parse cookies from request
function parseCookies(req) {
  const cookies = {}
  const cookieHeader = req.headers.cookie
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=')
      const value = rest.join('=').trim()
      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value)
      }
    })
  }
  
  return cookies
}
```

Then updated `verifyAdminSession` to use this parser:

```javascript
export function verifyAdminSession(req, res, next) {
  try {
    // SECURITY: Read session token from HTTP-only cookie
    const cookies = parseCookies(req)
    const sessionToken = cookies['mjk-admin-session']
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session cookie found' })
    }
    // ... rest of the function
  }
}
```

## Files Modified

1. `/pages/api/admin/auth.js` - Added cookie parsing helper and updated `verifyAdminSession`

## Testing

To verify the fix is working:

1. **Quick Test**: 
   ```bash
   curl -X POST http://localhost:3000/api/upload/image
   ```
   Should return: `{"error":"No session cookie found"}`
   
2. **Full Authentication Flow Test**:
   ```bash
   node test-upload-api.js
   ```
   This will test the complete login → cookie → upload flow

## Why This Happened

Next.js deliberately doesn't parse cookies automatically in API routes to:
- Reduce overhead for routes that don't need cookies
- Give developers control over cookie parsing
- Avoid dependency on specific cookie parsing libraries

## Prevention

If you need cookie parsing in other API routes, you can:

1. **Use the same helper function** - Copy the `parseCookies()` function
2. **Install a cookie parsing library** - Use `cookie` package (already installed)
3. **Create a middleware** - Centralize cookie parsing for all protected routes

## Related Code

The upload APIs that depend on this fix:
- `/pages/api/upload/image.js` - Image upload endpoint
- `/pages/api/upload/pdf.js` - PDF upload endpoint

Both use `verifyAdminSession()` for authentication, so they're now fixed.

## Next Steps

1. Test the upload functionality in your dashboard
2. If you see any new errors, check the browser console and network tab
3. Common issues to watch for:
   - CORS errors (if uploading from a different domain)
   - File size limits (10MB for images, 500MB for PDFs)
   - Storage bucket permissions in Supabase
   - MIME type validation failures

## Additional Notes

Your upload API has excellent error handling and logging. If you still see issues after this fix, check:

1. **Browser Console**: Look for JavaScript errors
2. **Network Tab**: Check the actual request/response
3. **Server Logs**: The APIs log detailed information with request IDs
4. **Supabase Dashboard**: Check storage bucket exists and has correct permissions

The fix ensures that the authentication cookie is properly read from requests, which should resolve the upload API failures.
