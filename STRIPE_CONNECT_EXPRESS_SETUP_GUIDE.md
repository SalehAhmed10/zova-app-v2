# 🎯 Stripe Connect Express Setup & Verification Guide

**Generated**: October 14, 2025  
**Purpose**: Complete guide for verifying and configuring Stripe Connect Express for ZOVA platform  
**Account**: `acct_1S7ef2IO9K9pFTMD` (Test Mode)

---

## 📊 Quick Reference

| Setting | Location | Status | Action Required |
|---------|----------|--------|-----------------|
| **Express Accounts** | Dashboard → Connect → Settings | ⏳ **VERIFY** | Check if enabled |
| **Platform Branding** | Dashboard → Settings → Branding | ⏳ **CONFIGURE** | Upload logo & colors |
| **Express Dashboard** | Dashboard → Connect → Express Dashboard | ⏳ **CUSTOMIZE** | Configure features |
| **Email Domain** | Dashboard → Connect → Emails | ⏳ **CONFIGURE** | Set custom domain |
| **Statement Descriptor** | Dashboard → Settings → Public Details | ⏳ **SET** | "ZOVA" or "ZOVAH" |

---

## ✅ PRIORITY 1: Verify Express Accounts Enabled

### Step 1: Navigate to Stripe Connect Settings
**URL**: https://dashboard.stripe.com/test/settings/connect

**What to Look For**:
```
☑️ Enable Express accounts
   Allow your users to create Express accounts and access the Express Dashboard.
   Express accounts give users limited access to the Stripe Dashboard.
```

**Expected State**: ✅ Checkbox should be **CHECKED**

**If NOT Enabled**:
1. Click the checkbox to enable
2. Read the modal: "Enable Express accounts"
3. Confirm: Click **"Enable Express accounts"** button
4. Wait for confirmation: "Express accounts enabled"

### Step 2: Verify Account Type in Your Integration
Check your `create-stripe-account` edge function:

```typescript
// File: supabase/functions/create-stripe-account/index.ts
// Should contain:
const account = await stripe.accounts.create({
  type: 'express',  // ✅ Correct: Express account
  country: countryCode,
  email: email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  business_profile: {
    url: 'https://zova.app', // Your platform URL
  },
});
```

**Verification Command**:
```bash
# Check if your function creates Express accounts
grep -n "type: 'express'" supabase/functions/create-stripe-account/index.ts
```

---

## 🎨 PRIORITY 2: Configure Platform Branding

### Step 1: Upload Platform Logo & Colors
**URL**: https://dashboard.stripe.com/test/settings/branding

**Required Information**:
- **Business name**: `ZOVA` or `ZOVAH` (choose one - consistency matters!)
- **Icon**: Upload your ZOVA logo (PNG, 512x512px recommended)
- **Brand color**: Your primary brand color (hex code, e.g., `#6366F1`)
- **Accent color**: Secondary color (optional)

**Where This Appears**:
- ✅ Stripe Connect onboarding flow
- ✅ Express Dashboard header
- ✅ Emails to connected accounts
- ✅ Payment receipts

### Step 2: Configure Statement Descriptor
**URL**: https://dashboard.stripe.com/test/settings/public

**Set Statement Descriptor**:
```
Statement descriptor: ZOVA
(Appears on customers' bank statements)
```

**Important**:
- Max 22 characters
- Only letters, numbers, spaces, dashes
- Avoid special characters
- Example: Customer sees "ZOVA HAIRCUT" on their bank statement

### Step 3: Customize Express Dashboard
**URL**: https://dashboard.stripe.com/test/settings/connect/express-dashboard/branding

**Configure**:
```
☑️ Business name: ZOVA
☑️ Icon: [Upload your logo - 512x512px PNG]
☑️ Theme settings:
   - Primary color: #6366F1 (or your brand color)
   - Use default theme: ☑️ (or customize)
```

**Preview**: Click "Preview" button to see how it looks to providers

---

## 🎯 PRIORITY 3: Configure Express Dashboard Features

### Step 1: Enable Required Features
**URL**: https://dashboard.stripe.com/test/settings/connect/express-dashboard/features

**Recommended Configuration for ZOVA**:

| Feature | Enable? | Reason |
|---------|---------|--------|
| **Payouts** | ✅ YES | Providers need to see their £90 payments |
| **Balance** | ✅ YES | Show pending balance before payout |
| **Transactions** | ✅ YES | Show booking payment history |
| **Customer list** | ❌ NO | ZOVA handles customer data in app |
| **Disputes** | ✅ YES | Providers can respond to disputes |
| **Tax forms** | ✅ YES | Required for UK/US tax compliance |

**Click "Save" after configuring**

### Step 2: Set Custom Transaction Descriptions
Your current implementation uses **Separate Charges and Transfers** model:

```typescript
// In complete-booking/index.ts
const transfer = await stripe.transfers.create({
  amount: providerAmount, // £90 in pence
  currency: 'gbp',
  destination: providerStripeAccountId,
  description: `Payment for booking ${bookingId}`, // ✅ This appears in Express Dashboard
  metadata: {
    booking_id: bookingId,
    platform: 'ZOVA',
  },
});
```

**Enhance Description** (optional):
```typescript
// Better description with service details
const transfer = await stripe.transfers.create({
  amount: providerAmount,
  currency: 'gbp',
  destination: providerStripeAccountId,
  description: `${serviceName} booking #${bookingRef}`, // e.g., "Haircut booking #ZV-1234"
  metadata: {
    booking_id: bookingId,
    service_name: serviceName,
    customer_name: customerName, // For provider reference
    platform: 'ZOVA',
  },
});
```

---

## 📧 PRIORITY 4: Configure Email Settings

### Step 1: Set Up Custom Email Domain (Optional but Recommended)
**URL**: https://dashboard.stripe.com/test/settings/connect/emails

**Why Configure**:
- Emails from Stripe to providers appear from **your domain**
- Example: `noreply@zova.app` instead of `noreply@stripe.com`
- Increases trust and brand consistency

**How to Configure**:
1. Click **"Set up custom email domain"**
2. Enter your domain: `zova.app`
3. Add DNS records to your domain (Stripe provides the records)
4. Verify domain (takes 24-48 hours)

**Email Types Sent to Providers**:
- ✅ Verification requests (ID, bank account)
- ✅ Payout notifications (£90 transferred)
- ✅ Compliance notifications (additional info needed)
- ✅ Risk notifications (account review)

### Step 2: Customize Email Templates
**URL**: https://dashboard.stripe.com/test/settings/connect/emails

**Configure Site Links** (CRITICAL):
These links appear in emails to providers:
```
Platform website: https://zova.app
Support email: support@zova.app
Support phone: +44 20 XXXX XXXX (your support number)
```

**Set Component URLs** (for emails linking to actions):
```
Account management: https://zova.app/provider/account
Payments: https://zova.app/provider/payments
Payouts: https://zova.app/provider/payouts
```

**Note**: These URLs must be live in your app before creating live accounts

---

## 🔧 PRIORITY 5: Configure Payout Settings

### Step 1: Set Default Payout Schedule
**URL**: https://dashboard.stripe.com/test/settings/connect/payouts

**Recommended for ZOVA** (based on escrow model):
```
☑️ Manual payouts enabled
   - You control when providers get paid (after booking completion)
   - Aligns with your £90 transfer on service completion

OR

☑️ Automatic payouts: Daily
   - Stripe automatically pays out available balance
   - Faster for providers (balance → bank within 2 days)
```

**For Your Escrow Model**:
Since you transfer £90 immediately after booking completion, **manual payouts are NOT needed**. The £90 goes into provider's Stripe balance, then Stripe pays them out based on schedule.

**Recommended**: Set to **"Daily automatic payouts"**

### Step 2: Minimum Payout Amount
```
Minimum payout amount: £10.00
(Stripe holds balance until it reaches £10)
```

**For ZOVA**: Since bookings are typically £90+, this is rarely an issue.

---

## 🧪 PRIORITY 6: Test Express Account Flow

### Complete Test Checklist

#### Test 1: Create Provider Express Account
```bash
# Use your create-stripe-account edge function
curl -X POST https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/create-stripe-account \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-provider-123",
    "email": "testprovider@example.com",
    "country": "GB"
  }'
```

**Expected Response**:
```json
{
  "account_id": "acct_XXX",
  "onboarding_url": "https://connect.stripe.com/express/onboarding/XXX"
}
```

#### Test 2: Complete Onboarding Flow
1. Open `onboarding_url` in browser
2. Fill in provider details:
   - Business name: "Test Provider"
   - Phone: +44 7XXX XXXXXX
   - Bank account: Use Stripe test bank (sort code: 108800, account: 00012345)
   - Business type: Individual
   - DOB: 01/01/1990
3. Complete ID verification (use Stripe test docs)
4. **Check**: Redirected to your app with `?success=true`

#### Test 3: Verify Express Dashboard Access
1. Provider receives email: "Welcome to Stripe Express"
2. Click link in email → Claims account
3. Sets up password
4. Logs in → Sees ZOVA branding ✅
5. Navigates to:
   - **Balance**: Shows £0.00 (no bookings yet)
   - **Payouts**: Shows payout schedule
   - **Transactions**: Empty (no transfers yet)

#### Test 4: Complete Test Booking & Payout
```bash
# Step 1: Create booking with £99 payment (your existing flow)
# Step 2: Capture £99 into escrow (capture-deposit function)
# Step 3: Complete booking (complete-booking function)

# complete-booking transfers £90 to provider
curl -X POST https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/complete-booking \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "booking-uuid-here"
  }'
```

**Expected Result**:
```json
{
  "success": true,
  "transfer_id": "tr_XXX",
  "amount_transferred": 9000,  // £90.00 in pence
  "provider_account": "acct_XXX"
}
```

#### Test 5: Verify in Express Dashboard
1. Provider logs into Express Dashboard
2. **Balance** page shows:
   - Available: £90.00
   - Pending: £0.00
3. **Transactions** page shows:
   - Transfer from ZOVA: £90.00
   - Description: "Payment for booking [ID]"
   - Date: Today
4. **Payouts** page shows:
   - Next payout: Tomorrow (if daily schedule)
   - Amount: £90.00
   - Destination: Bank account ending in 2345

---

## 🔒 PRIORITY 7: Security & Compliance

### Step 1: Review RLS Policies
**Critical**: Ensure your database protects Stripe account IDs

```sql
-- Check profiles RLS policy
SELECT * FROM profiles WHERE role = 'provider';
-- Should NOT expose stripe_account_id to other users

-- Verify bookings RLS
SELECT * FROM bookings WHERE customer_id = 'user-123';
-- Should only show user's own bookings
```

### Step 2: Verify Webhook Security
**URL**: https://dashboard.stripe.com/test/webhooks

**Check**:
```
☑️ Endpoint: https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhook
☑️ Status: Active ✅
☑️ Events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - account.updated
   - payout.paid
   - payout.failed
```

**Verify Webhook Secret**:
```bash
# Check .env file
cat .env | grep STRIPE_WEBHOOK_SECRET
# Should show: whsec_XXX
```

### Step 3: Test Account Restrictions
**Simulate**: Provider tries to access another provider's data

```bash
# Should FAIL (403 Forbidden)
curl -X GET https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/get-provider-schedule \
  -H "Authorization: Bearer PROVIDER_A_TOKEN" \
  -d '{ "provider_id": "PROVIDER_B_ID" }'
```

---

## 📊 PRIORITY 8: Monitoring & Analytics

### Step 1: Set Up Stripe Dashboard Monitoring
**URL**: https://dashboard.stripe.com/test/connect/accounts

**Monitor Daily**:
- ✅ New Express accounts created
- ✅ Onboarding completion rate (should be >80%)
- ✅ Average time to complete onboarding
- ✅ Failed verification attempts

### Step 2: Set Up Alerts
**URL**: https://dashboard.stripe.com/test/settings/notifications

**Configure Email Alerts**:
```
☑️ Notify me about: All payment failures
☑️ Notify me about: All payouts that fail
☑️ Notify me about: Disputes opened
☑️ Notify me about: Connected account risk actions
```

**Send alerts to**: `admin@zova.app` or your support email

### Step 3: Review Payout Reports
**URL**: https://dashboard.stripe.com/test/connect/transfers

**Weekly Review**:
- Total transferred to providers: £XXX
- Number of payouts: XXX
- Average payout amount: £90 (should match booking average)
- Failed payouts: Should be 0 (investigate if >0)

---

## 🚨 Common Issues & Solutions

### Issue 1: "Express accounts not enabled"
**Solution**: Go to [Connect Settings](https://dashboard.stripe.com/test/settings/connect) → Check "Enable Express accounts"

### Issue 2: Provider can't complete onboarding
**Symptoms**: Stuck on ID verification screen
**Solutions**:
1. Check Stripe Dashboard → Account → "Requirements" tab
2. Look for missing fields (DOB, address, etc.)
3. Use Stripe test data: DOB: 01/01/1990, Postcode: SW1A 1AA

### Issue 3: Payout fails to provider
**Symptoms**: Transfer succeeds but payout to bank fails
**Solutions**:
1. Check bank account details in Express Dashboard
2. Verify sort code and account number are valid
3. For test mode: Use Stripe test bank (108800 / 00012345)
4. For live mode: Contact Stripe support

### Issue 4: Provider doesn't receive emails
**Symptoms**: No welcome email or payout notifications
**Solutions**:
1. Check email in Stripe account: Dashboard → Accounts → [Account] → "Email"
2. Update email via API: `stripe.accounts.update('acct_XXX', { email: 'new@email.com' })`
3. Check spam folder
4. Verify email domain is not blacklisted

### Issue 5: Branding doesn't appear
**Symptoms**: Provider sees generic Stripe branding
**Solutions**:
1. Wait 24 hours after uploading (cache delay)
2. Check branding settings: [Branding page](https://dashboard.stripe.com/test/settings/branding)
3. Re-upload logo (PNG, min 512x512px)
4. Clear browser cache and test in incognito mode

---

## ✅ Final Verification Checklist

Before going live, verify ALL of the following:

### Express Accounts Configuration
- [ ] Express accounts enabled in Connect settings
- [ ] Platform name and logo uploaded to branding settings
- [ ] Statement descriptor set to "ZOVA" or "ZOVAH"
- [ ] Express Dashboard features configured (payouts, balance, transactions)
- [ ] Email domain configured and verified (optional but recommended)
- [ ] Site links configured in email settings
- [ ] Default payout schedule set (daily automatic recommended)

### Test Account Verification
- [ ] Created test Express account successfully
- [ ] Completed onboarding flow with test data
- [ ] Provider received welcome email
- [ ] Provider can log into Express Dashboard
- [ ] Provider sees ZOVA branding in dashboard
- [ ] Created test booking and captured £99 payment
- [ ] Transferred £90 to provider via complete-booking function
- [ ] Transfer appears in provider's Express Dashboard
- [ ] Payout scheduled and processed to bank account

### Edge Functions Verification
- [ ] create-stripe-account creates Express accounts (type: 'express')
- [ ] capture-deposit captures full £99 into escrow
- [ ] complete-booking transfers £90 to provider
- [ ] stripe-webhook handles all payment events
- [ ] All functions use new Stripe credentials (acct_1S7ef2IO9K9pFTMD)

### Security & Compliance
- [ ] RLS policies prevent unauthorized access to Stripe account IDs
- [ ] Webhook endpoint is secure (validates signature)
- [ ] Webhook secret stored in Supabase Edge Function secrets
- [ ] Email alerts configured for payment failures and disputes
- [ ] Provider data is encrypted at rest and in transit

### Documentation
- [ ] README updated with Express account setup instructions
- [ ] API documentation includes create-stripe-account endpoint
- [ ] Support team trained on Express Dashboard access for providers
- [ ] Provider onboarding guide created (how to complete verification)

---

## 📚 Additional Resources

### Stripe Documentation
- [Express Accounts Guide](https://docs.stripe.com/connect/express-accounts)
- [Customize Express Dashboard](https://docs.stripe.com/connect/customize-express-dashboard)
- [Separate Charges and Transfers](https://docs.stripe.com/connect/separate-charges-and-transfers)
- [Connect Webhooks](https://docs.stripe.com/connect/webhooks)

### ZOVA Implementation Files
- `supabase/functions/create-stripe-account/index.ts` - Creates Express accounts
- `supabase/functions/capture-deposit/index.ts` - Captures £99 into escrow
- `supabase/functions/complete-booking/index.ts` - Transfers £90 to provider
- `supabase/functions/stripe-webhook/index.ts` - Handles Stripe events
- `.env` - Stripe credentials (publishable & secret keys)

### Support Contacts
- **Stripe Support**: https://support.stripe.com/contact
- **ZOVA Tech Support**: [Your support email]
- **Stripe Connect Slack**: [If you have access]

---

## 🎯 Next Steps After This Guide

1. **Complete Stripe Dashboard Configuration** (30 minutes)
   - Enable Express accounts ✅
   - Upload branding ✅
   - Configure email settings ✅
   - Set payout schedule ✅

2. **Test Complete Flow End-to-End** (1 hour)
   - Create test provider account
   - Complete onboarding
   - Create test booking
   - Capture payment
   - Complete booking
   - Verify payout in Express Dashboard

3. **Delete Legacy Edge Functions** (10 minutes)
   - Run deletion commands from `LOCAL_SUPABASE_FUNCTIONS_AUDIT.md`
   - Verify 28 functions remain (down from 36)

4. **Production Readiness** (2 hours)
   - Switch to live Stripe keys
   - Update webhook URLs to live endpoints
   - Test with real bank accounts (small amounts)
   - Monitor for 24 hours
   - Launch to real users 🚀

---

**Status**: Ready for Stripe Dashboard configuration ✅  
**Estimated Time**: 45 minutes to complete all priorities  
**Next Action**: Navigate to https://dashboard.stripe.com/test/settings/connect and verify Express accounts are enabled!

🎊 **Let's get your Stripe Connect Express fully configured!** 🎊
