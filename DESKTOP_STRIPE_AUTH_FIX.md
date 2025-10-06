# Desktop Stripe Onboarding Authentication Fix

## Problem
The "Copy Link & Use Desktop" feature in the provider payment setup screen was failing with a 401 "Missing authorization header" error when users tried to access the desktop Stripe onboarding URL directly in their browser.

## Root Cause
The `stripe-redirect` Supabase Edge Function had JWT verification enabled by default, but desktop onboarding URLs are meant to be accessed directly in browsers without authentication headers.

## Solution
Created a `config.toml` file for the `stripe-redirect` function to disable JWT verification:

```toml
[functions.stripe-redirect]
verify_jwt = false
```

## Files Changed
- `supabase/functions/stripe-redirect/config.toml` (created)

## Testing
- Verified that desktop URLs now return 200 status instead of 401
- Confirmed HTML response is served for desktop onboarding pages
- Mobile app flows remain unaffected (they use authenticated API calls)

## Result
✅ Desktop Stripe onboarding URLs now work when copied and pasted into browsers
✅ No authentication errors for direct browser access
✅ Mobile app authentication flows preserved