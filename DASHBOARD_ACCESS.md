# Dashboard Access Information

## Current Credentials

**Dashboard URL**: `http://localhost:3000/dashboard` (development)  
**Production URL**: `https://mjkprints.store/dashboard`

**Passcode**: `MJKAdmin2024SecurePassword`

## Security Notes

- Passcode is stored in `.env.local` (gitignored)
- Authentication uses secure HTTP-only cookies
- Session expires after 2 hours of activity
- Rate limited to 10 attempts per 15 minutes
- Connection secured via HTTPS in production

## Changing the Password

To change the dashboard password:

1. Open `.env.local`
2. Update the `DASHBOARD_PASSCODE` value
3. Restart the development server: `npm run dev`

Example:
```bash
DASHBOARD_PASSCODE="YourNewSecurePassword123"
```

**Important**: For production deployment, set this as an environment variable in your hosting platform (Vercel, Netlify, etc.)

## Troubleshooting

If you see "Invalid passcode":
- Verify the password matches exactly (case-sensitive)
- Check that `.env.local` file exists and has the correct value
- Restart the server to reload environment variables

If you're locked out (rate limited):
- Wait 15 minutes for the lockout to expire
- Or restart the development server (clears in-memory rate limit)

---

**Last Updated**: November 29, 2024
