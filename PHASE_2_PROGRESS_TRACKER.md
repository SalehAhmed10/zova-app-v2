# 🚀 Phase 2: Stripe Configuration - Progress Tracker

**Started**: October 14, 2025 at 21:30  
**Current Step**: Step 2 - Platform Branding  
**Progress**: 25% Complete (2/8 steps done)  
**Time Remaining**: ~35 minutes

---

## ✅ Completed Steps

### ✅ **Step 1: Verify Express Accounts Enabled** (5 min) - DONE!
- [x] Navigated to: https://dashboard.stripe.com/test/settings/connect
- [x] Verified: "Enable Express accounts" ☑️ checked
- [x] Confirmed: Your `create-stripe-account` function uses `type: 'express'`
- **Status**: ✅ Express accounts confirmed active

### ✅ **Step 2: Configure Express Dashboard Features** (5 min) - DONE!
- [x] Navigated to: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/settings/connect/express-dashboard/features
- [x] Enabled: **View payments** ☑️
- [x] Kept OFF: Issue refunds, Manage disputes, Manual payouts, Edit payout schedule, Top up balance
- **Status**: ✅ Perfect configuration for ZOVA's escrow model
- **Result**: Providers will see booking details in Express Dashboard

---

## 🔄 Next Steps (In Order)

### ⏳ **Step 3: Upload Platform Branding** (~10 minutes) - NEXT!

**What**: Make Express onboarding and Dashboard show YOUR ZOVA branding

**URLs**:
1. **General Platform Branding**: https://dashboard.stripe.com/test/settings/branding
2. **Express Dashboard Branding**: https://dashboard.stripe.com/test/settings/connect/express-dashboard/branding

#### **3.1 General Platform Branding** (5 min)
Upload to: https://dashboard.stripe.com/test/settings/branding

**Required Fields**:
```
Business name:         ZOVA (or ZOVAH - choose one!)
Icon:                  Upload 512x512px PNG logo
Brand color:           #6366F1 (your primary color)
Accent color:          #818CF8 (lighter shade)
```

**Optional but Recommended**:
```
Business website:      https://zova.app
Support email:         support@zova.app
Support phone:         +44 20 XXXX XXXX
Statement descriptor:  ZOVA (appears on bank statements)
```

**How to Upload Logo**:
1. Click "Icon" → "Choose file"
2. Select your ZOVA logo (512x512px PNG)
3. Preview how it looks
4. Click "Save"

**Where This Appears**:
- ✅ Stripe Connect onboarding flow header
- ✅ Email receipts to customers
- ✅ Bank statements (if using statement descriptor)

---

#### **3.2 Express Dashboard Branding** (5 min)
Upload to: https://dashboard.stripe.com/test/settings/connect/express-dashboard/branding

**Required Fields**:
```
Business name:         ZOVA
Icon:                  Upload same 512x512px PNG logo
Primary color:         #6366F1
```

**Preview Available**: Click "Preview" to see how providers will see it

**Where This Appears**:
- ✅ Express Dashboard header (providers see your logo)
- ✅ Express login page
- ✅ Express emails to providers

**Action**: 
1. Upload logo
2. Set colors
3. Preview
4. Save

---

### 📧 **Step 4: Configure Email Settings** (~10 minutes)

**URL**: https://dashboard.stripe.com/test/settings/connect/emails

**Required Settings**:
```
Platform website:      https://zova.app
Support email:         support@zova.app
Support phone:         +44 20 XXXX XXXX (your number)
```

**Optional - Custom Email Domain** (Recommended for production):
```
Email domain:          zova.app
From address:          noreply@zova.app
```

**Note**: Custom domain requires DNS verification (24-48 hours delay). You can add this later before going live.

**What This Does**:
- Stripe emails to providers come "from ZOVA"
- Support links point to your website/email
- Professional appearance

**Action**:
1. Enter platform URL
2. Enter support email and phone
3. (Optional) Set custom domain (can do later)
4. Save

---

### 💳 **Step 5: Configure Payout Settings** (~5 minutes)

**URL**: https://dashboard.stripe.com/test/settings/connect/payouts

**Recommended Configuration**:
```
Payout schedule:       Daily automatic
Minimum payout:        £10.00
```

**Why Daily Automatic?**
- Your `complete-booking` function transfers £90 immediately
- Money sits in provider's Stripe balance
- Daily payouts = fastest payment to providers (good for satisfaction!)
- Alternative: Weekly Monday (as in your code) - either works!

**Current Code Says**:
```typescript
// In create-stripe-account/index.ts (line 348)
settings: {
  payouts: {
    schedule: {
      interval: 'weekly',
      weekly_anchor: 'monday'
    }
  }
}
```

**Decision Time**:
- **Keep Weekly Monday**: Predictable, good cash flow planning
- **Change to Daily**: Faster provider payments, better satisfaction

**My Recommendation**: Start with **Daily automatic** for better provider experience

**Action**:
1. Select "Daily automatic"
2. Set minimum: £10.00
3. Save

---

### 🧪 **Step 6: Test Provider Onboarding** (~15 minutes)

**Goal**: Create a test provider and verify complete onboarding flow

#### **6.1 Create Test Provider Account** (5 min)

**Option A: Via Your App** (Recommended)
1. Open ZOVA app
2. Register as provider
3. Navigate to Payments screen
4. Click "Connect Stripe Account"

**Option B: Via Supabase Function Directly**
```bash
# Using curl or your API client
POST https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/create-stripe-account
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json
Body:
  {}
```

**Expected Response**:
```json
{
  "url": "https://connect.stripe.com/express/onboarding/...",
  "accountId": "acct_XXX",
  "accountSetupComplete": false
}
```

---

#### **6.2 Complete Express Onboarding** (5 min)

1. Open the `url` from response
2. Fill in test details:

**Business Information**:
```
Business name:         Test Provider Ltd
Phone:                 +44 7XXX XXXXXX
Industry:              Beauty & Grooming
Business type:         Individual
Website:               https://testprovider.example.com
```

**Personal Information**:
```
First name:            Test
Last name:             Provider
Date of birth:         01/01/1990
```

**Address** (UK Test Data):
```
Address line 1:        1 Test Street
City:                  London
Postcode:              SW1A 1AA
```

**Bank Details** (Stripe Test Bank):
```
Sort code:             108800
Account number:        00012345
```

**Identity Verification**:
- Use Stripe's test verification flow
- Upload test documents (Stripe accepts test uploads in test mode)

3. Complete verification
4. Should redirect back to your app with `?success=true`

---

#### **6.3 Verify Express Dashboard Access** (5 min)

**Generate Express Login Link**:

**Option A: Via Stripe Dashboard**
1. Go to: https://dashboard.stripe.com/test/connect/accounts
2. Find your test provider account
3. Click "Login as user"
4. Opens Express Dashboard

**Option B: Via API** (For your app integration later)
```typescript
// Generate login link programmatically
const loginLink = await stripe.accounts.createLoginLink(
  'acct_XXX'
);
// loginLink.url contains the single-use login URL
```

**What to Verify in Express Dashboard**:
- [x] ZOVA logo appears in header ✅
- [x] Balance shows £0.00 (no bookings yet)
- [x] Transactions list is empty
- [x] **Payments tab is visible** (because you enabled it!)
- [x] Payout schedule shows (Daily or Weekly Monday)
- [x] Bank account shows ****2345

**Expected**: Provider can log in and see clean dashboard with your branding

---

### 💰 **Step 7: Test Complete Escrow Flow** (~30 minutes)

**Goal**: Verify end-to-end payment flow from customer booking to provider payout

#### **7.1 Create Service Listing** (5 min)
1. Test provider creates service in your app
2. Example: "Haircut - £90"
3. Set availability: Tomorrow 10am-5pm
4. Publish service

#### **7.2 Book Service as Customer** (10 min)
1. Register as customer (different account)
2. Search for test provider's service
3. Book appointment: Tomorrow 11am
4. Enter test card: `4242 4242 4242 4242`
5. Complete booking

**Expected**:
```
Booking total:    £99.00
  Service:        £90.00
  Booking fee:    £9.00 (10%)
Payment status:   Succeeded (captured)
Booking status:   pending_provider_acceptance
```

**Verify in Stripe Dashboard**:
1. Go to: https://dashboard.stripe.com/test/payments
2. Find payment: £99.00 GBP
3. Status: Succeeded
4. Description: "Booking #ZV-XXXX"

---

#### **7.3 Accept Booking & Verify Capture** (5 min)
1. Test provider accepts booking (in your app)
2. Payment should already be captured (£99)
3. Check `capture-deposit` function logs in Supabase

**Verify in Database**:
```sql
SELECT 
  id,
  customer_id,
  provider_id,
  service_name,
  total_amount,
  payment_status,
  booking_status
FROM bookings
WHERE id = 'YOUR_BOOKING_ID';
```

**Expected**:
```
total_amount:     99.00
payment_status:   succeeded
booking_status:   accepted
```

---

#### **7.4 Complete Booking & Transfer £90** (5 min)
1. Mark booking as "completed" in your app
2. Triggers `complete-booking` function
3. Function creates Stripe Transfer for £90

**Verify Transfer in Stripe**:
1. Go to: https://dashboard.stripe.com/test/connect/transfers
2. Find transfer: £90.00 GBP
3. Destination: acct_XXX (test provider)
4. Description: "Booking #ZV-XXXX"
5. Status: Paid

**Verify in Database**:
```sql
SELECT 
  id,
  provider_id,
  amount,
  status,
  stripe_transfer_id,
  booking_id
FROM provider_payouts
WHERE booking_id = 'YOUR_BOOKING_ID';
```

**Expected**:
```
amount:              84.60 (£90 - Stripe fees)
status:              completed
stripe_transfer_id:  tr_XXX (not null!)
```

---

#### **7.5 Verify Express Dashboard** (5 min)
1. Provider logs into Express Dashboard
2. Check balance section

**Expected to See**:
```
Balance Section:
  Available now:       £84.60
  On the way:          £0.00
  Next payout:         Tomorrow (if daily) or Monday (if weekly)
  To bank account:     ****2345

Transactions:
  Oct 14  Transfer from ZOVA    +£84.60
          Booking #ZV-1234

Payments Tab (NEW!):
  Oct 14  Haircut booking        £90.00 ✓
          Customer: Test C.
          Transfer: tr_XXX
```

**Success Criteria**:
- [x] Balance shows £84.60 ✅
- [x] Transaction shows transfer from ZOVA ✅
- [x] **Payments tab shows booking details** ✅ (because you enabled it!)
- [x] Payout scheduled (tomorrow or Monday) ✅
- [x] NO refund buttons visible ✅
- [x] NO manual payout buttons visible ✅

---

### 🔄 **Step 8: Apply to Live Mode** (~15 minutes)

**Goal**: Replicate all configuration to production (live mode)

#### **8.1 Switch to Live Mode in Dashboard**
1. Top-right toggle: **Test mode** → **Live mode**
2. Repeat all configuration steps for live mode

**Checklist**:
- [ ] Branding: Upload logo and colors (live mode)
- [ ] Features: Enable "View payments" (live mode)
- [ ] Emails: Set support email/phone (live mode)
- [ ] Payouts: Set schedule to Daily automatic (live mode)

---

#### **8.2 Update Environment Variables**
Update `.env` file:
```env
# Change from test to live keys
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51S7ef2IO9K9pFTMD...
STRIPE_SECRET_KEY=sk_live_51S7ef2IO9K9pFTMD...
```

---

#### **8.3 Update Supabase Secrets**
1. Go to: Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Update secret:
```
STRIPE_SECRET_KEY = sk_live_51S7ef2IO9K9pFTMD...
```

---

#### **8.4 Redeploy Edge Functions**
```bash
# Redeploy core payment functions with live keys
npx supabase functions deploy capture-deposit
npx supabase functions deploy complete-booking
npx supabase functions deploy create-stripe-account
npx supabase functions deploy stripe-webhook
```

---

#### **8.5 Test with Real Money** (Small Amount)
**⚠️ Important**: Test with small amount first!

1. Create real provider account (your test user)
2. Complete onboarding with **real bank account**
3. Create service: "Test Service - £10"
4. Book and pay with **real card** (£11 total)
5. Complete booking
6. Verify £10 transfers to provider
7. Check £1 commission to your account

**Monitor for 24 hours** before full launch!

---

## 📊 Progress Summary

### **Completed** ✅:
```
✅ Step 1: Express accounts verified (5 min)
✅ Step 2: Dashboard features configured (5 min)
```

### **In Progress** ⏳:
```
⏳ Step 3: Platform branding (10 min) - NEXT!
```

### **Pending** ⏸️:
```
⏸️ Step 4: Email settings (10 min)
⏸️ Step 5: Payout settings (5 min)
⏸️ Step 6: Test provider onboarding (15 min)
⏸️ Step 7: Test escrow flow (30 min)
⏸️ Step 8: Apply to live mode (15 min)
```

### **Total Time**:
```
Completed:    10 minutes ✅
Remaining:    80 minutes
Total:        90 minutes (1.5 hours)
```

### **Current Progress**:
```
██████░░░░░░░░░░░░░░░░░░░░░░░░ 25% Complete
```

---

## 🎯 Your Immediate Next Action

### **Action: Upload ZOVA Logo to Stripe Branding**

**Step 1**: Prepare your logo
- Format: PNG
- Size: 512x512 pixels
- Background: Transparent (recommended)
- Content: ZOVA logo/wordmark

**Step 2**: Navigate to branding settings
- URL: https://dashboard.stripe.com/test/settings/branding

**Step 3**: Upload logo
1. Click "Icon" section
2. Click "Choose file"
3. Select your 512x512px PNG logo
4. Preview how it looks
5. Click "Save"

**Step 4**: Set colors
```
Brand color:  #6366F1 (or your primary brand color)
```

**Step 5**: Set business info
```
Business name:         ZOVA
Statement descriptor:  ZOVA
```

**Step 6**: Repeat for Express Dashboard
- URL: https://dashboard.stripe.com/test/settings/connect/express-dashboard/branding
- Upload same logo
- Set same colors
- Preview
- Save

**Time**: ~10 minutes  
**Then**: Move to Step 4 (Email settings)

---

## 🚀 Quick Reference

### **Key URLs**:
```
Branding:        https://dashboard.stripe.com/test/settings/branding
Express Brand:   https://dashboard.stripe.com/test/settings/connect/express-dashboard/branding
Emails:          https://dashboard.stripe.com/test/settings/connect/emails
Payouts:         https://dashboard.stripe.com/test/settings/connect/payouts
Features:        https://dashboard.stripe.com/test/settings/connect/express-dashboard/features ✅ DONE
```

### **Test Data**:
```
Test Card:           4242 4242 4242 4242
Test Sort Code:      108800
Test Account:        00012345
Test Postcode:       SW1A 1AA
Test DOB:            01/01/1990
```

### **Your Escrow Model**:
```
Customer pays:       £99 (£90 + £9 fee)
Platform captures:   £99 (held in escrow)
Transfer to provider: £90
Platform keeps:      £9 (10% commission)
Provider receives:   ~£84.60 (after Stripe fees)
```

---

## 📝 Notes

- ✅ Express accounts confirmed working
- ✅ Dashboard features optimized for escrow model
- ⏳ Logo upload is next (10 min task)
- 📊 80 minutes remaining to production-ready
- 🎯 Focus: Branding → Emails → Payouts → Testing

**You're 25% done! Keep going! 🚀**
