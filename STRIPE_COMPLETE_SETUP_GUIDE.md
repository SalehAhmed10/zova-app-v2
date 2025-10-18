# 🎉 Stripe Complete Setup Guide - ZOVA Marketplace

**Date**: January 14, 2025  
**Account**: Client's Production Account (Test Mode)  
**Account ID**: `acct_1S7efRILA2CYnzre`  
**Business Model**: Marketplace (Separate Charges and Transfers)

---

## ✅ What's Already Done

### 1. **API Keys Updated**
- ✅ `.env` file updated with new keys
- ✅ Supabase secrets updated (`STRIPE_SECRET_KEY`)
- ✅ Publishable key: `pk_test_51S7efRILA2CYnzre...`
- ✅ Secret key: `sk_test_51S7efRILA2CYnzre...`

### 2. **Edge Functions Configured**
- ✅ `create-stripe-account` (v105) - Creates Connect Express accounts
- ✅ `stripe-webhooks-subscription` - Handles subscription events
- ✅ Both functions have correct secret keys

### 3. **Phone Info Card Enhancement**
- ✅ Blue info card displays user's phone number
- ✅ Cache fix applied (useAuthSync now fetches phone fields)
- ✅ UX guidance for Stripe onboarding phone verification

---

## 🚀 Next Steps: Stripe Dashboard Configuration

### **Step 1: Set Up Webhooks** (CRITICAL)

#### **1.1 Get Your Webhook Endpoint URL**
```
https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhooks-subscription
```

#### **1.2 Configure Webhook in Stripe Dashboard**

Go to: [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/webhooks)

**Click "Add endpoint"** and configure:

**Endpoint URL:**
```
https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhooks-subscription
```

**Description:**
```
ZOVA Subscription Events (Test Mode)
```

**Listen to events:**
Select these specific events:

**Subscriptions (Customer/Provider Premium):**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

**Invoices (Payment Processing):**
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `invoice.finalized`

**Payment Intents (Marketplace Payments):**
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `payment_intent.created`

**Connect (Provider Account Management):**
- ✅ `account.updated`
- ✅ `account.external_account.created`
- ✅ `account.external_account.updated`

**Transfers (Provider Payouts):**
- ✅ `transfer.created`
- ✅ `transfer.updated`
- ✅ `transfer.reversed`
- ✅ `transfer.paid`

**Click "Add endpoint"**

#### **1.3 Get Webhook Signing Secret**

After creating the endpoint:
1. Click on the webhook you just created
2. Click "Reveal" under "Signing secret"
3. Copy the secret (starts with `whsec_`)

#### **1.4 Update Webhook Secret in Supabase**

Run this command with your NEW webhook secret:
```powershell
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET_HERE
```

#### **1.5 Update .env File**

Update the webhook secret in your `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET_HERE
```

---

### **Step 2: Test Webhook Connection**

#### **2.1 Use Stripe CLI (Recommended for Testing)**

Install Stripe CLI:
```powershell
# Download from: https://stripe.com/docs/stripe-cli
# Or use Scoop:
scoop install stripe
```

Login to Stripe:
```powershell
stripe login --project-name=zova
```

Forward webhooks to your local development:
```powershell
stripe listen --forward-to https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhooks-subscription
```

Trigger test events:
```powershell
# Test subscription created
stripe trigger customer.subscription.created

# Test payment succeeded
stripe trigger payment_intent.succeeded

# Test account updated
stripe trigger account.updated
```

#### **2.2 Check Webhook Logs**

In Stripe Dashboard:
- Go to **Developers → Webhooks**
- Click your endpoint
- Check "Attempts" tab for delivery status

In Supabase:
```powershell
npx supabase functions logs stripe-webhooks-subscription
```

---

### **Step 3: Configure Connect Settings**

Go to: [Connect Settings](https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/connect/accounts/settings)

#### **3.1 Branding (Recommended)**

- **Platform name**: ZOVA
- **Platform icon**: Upload your logo (512x512 PNG)
- **Primary color**: Your brand color (e.g., `#3B82F6` for blue)
- **Privacy policy URL**: Your privacy policy URL
- **Terms of service URL**: Your terms URL

#### **3.2 Account Capabilities**

Enable these for your connected accounts:
- ✅ **Card payments** (Required)
- ✅ **Transfers** (Required for payouts)
- ✅ **UK bank account payments** (If supporting UK bank transfers)

#### **3.3 Payout Schedule**

For connected accounts (service providers):
- **Standard**: Daily automatic payouts
- **Minimum**: £10 (or adjust based on your needs)
- **Delay**: 2 business days (Stripe default)

#### **3.4 Account Statement Descriptor**

What appears on customer bank statements:
- **Prefix**: `ZOVA*` (max 10 characters)
- **Full descriptor**: `ZOVA*SERVICE_NAME` (dynamically set per charge)

---

### **Step 4: Set Up Price IDs (If Creating New Products)**

#### **Current Products (Already Configured)**

From your `.env`:
```env
EXPO_PUBLIC_STRIPE_CUSTOMER_SOS_PRICE_ID=price_1SBWW4ENAHMeamEYNObfzeCr
EXPO_PUBLIC_STRIPE_PROVIDER_PREMIUM_PRICE_ID=price_1SBWaVENAHMeamEYAi2o6NQg
```

**⚠️ IMPORTANT**: These price IDs are from the OLD account. You need to create NEW products in the new account!

#### **4.1 Create Customer SOS Subscription**

Go to: [Products](https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/products)

**Click "Create product":**
- **Name**: Customer SOS Subscription
- **Description**: Priority support and enhanced features for customers
- **Pricing model**: Recurring
- **Price**: £9.99 / month (or your pricing)
- **Currency**: GBP
- **Billing period**: Monthly

**After creation, copy the Price ID** (starts with `price_`)

#### **4.2 Create Provider Premium Subscription**

**Click "Create product":**
- **Name**: Provider Premium Subscription
- **Description**: Advanced features and increased visibility for service providers
- **Pricing model**: Recurring
- **Price**: £19.99 / month (or your pricing)
- **Currency**: GBP
- **Billing period**: Monthly

**After creation, copy the Price ID** (starts with `price_`)

#### **4.3 Update .env with New Price IDs**

```env
EXPO_PUBLIC_STRIPE_CUSTOMER_SOS_PRICE_ID=price_YOUR_NEW_CUSTOMER_PRICE_ID
EXPO_PUBLIC_STRIPE_PROVIDER_PREMIUM_PRICE_ID=price_YOUR_NEW_PROVIDER_PRICE_ID
```

#### **4.4 Update Webhook Function**

Update `getSubscriptionType()` function in:
`supabase/functions/stripe-webhooks-subscription/index.ts`

```typescript
function getSubscriptionType(priceId: string): string {
  // Match your NEW price IDs
  if (priceId === 'price_YOUR_NEW_CUSTOMER_PRICE_ID') {
    return 'customer_sos'
  } else if (priceId === 'price_YOUR_NEW_PROVIDER_PRICE_ID') {
    return 'provider_premium'
  } else {
    console.warn(`[WEBHOOK] ⚠️ Unknown price ID: ${priceId}`)
    return 'customer_sos' // Default fallback
  }
}
```

Then redeploy:
```powershell
npx supabase functions deploy stripe-webhooks-subscription
```

---

### **Step 5: Configure Business Details**

Go to: [Business Details](https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/settings/business)

Fill in:
- **Business name**: Your registered company name
- **Support email**: support@yourdomain.com
- **Support phone**: Your support phone number
- **Business address**: Your registered business address

---

## 🧪 Testing Your Setup

### **Test 1: Create a Test Provider Account**

1. Open your ZOVA app
2. Login as a provider (artinsane00@gmail.com)
3. Go to Payments screen
4. Tap "Connect Stripe Account"
5. Complete onboarding with test data:
   - Use **Test phone number**: Any valid format
   - Use **Test bank**: Sort code `10-88-00`, Account `00012345`
   - Use **Test business details**: Any valid data

### **Test 2: Verify Account Creation**

Check in Stripe Dashboard:
- [Connected Accounts](https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/connect/accounts/overview)
- Your test account should appear
- Status should be "Enabled" after onboarding

### **Test 3: Test Webhook Delivery**

1. Check webhook attempts in Stripe Dashboard
2. Look for `account.updated` event
3. Status should be "Succeeded"
4. Response code should be `200`

### **Test 4: Test Subscription Flow**

```powershell
# Trigger subscription creation
stripe trigger customer.subscription.created

# Check Supabase logs
npx supabase functions logs stripe-webhooks-subscription

# Verify database update
# Check user_subscriptions table in Supabase
```

---

## 📋 Checklist: Complete Setup

- [ ] **API Keys**
  - [x] Publishable key updated in `.env`
  - [x] Secret key updated in `.env`
  - [x] Secret key updated in Supabase

- [ ] **Webhooks**
  - [ ] Endpoint created in Stripe Dashboard
  - [ ] All required events selected
  - [ ] Signing secret copied
  - [ ] Signing secret updated in Supabase
  - [ ] Signing secret updated in `.env`
  - [ ] Test webhook sent successfully

- [ ] **Connect Settings**
  - [ ] Branding configured (logo, colors)
  - [ ] Privacy policy URL added
  - [ ] Terms of service URL added
  - [ ] Account capabilities enabled
  - [ ] Payout schedule configured
  - [ ] Statement descriptor set

- [ ] **Products & Prices**
  - [ ] Customer SOS product created
  - [ ] Provider Premium product created
  - [ ] Price IDs copied
  - [ ] `.env` updated with new price IDs
  - [ ] Webhook function updated with new price IDs
  - [ ] Webhook function redeployed

- [ ] **Business Details**
  - [ ] Business name set
  - [ ] Support email set
  - [ ] Support phone set
  - [ ] Business address set

- [ ] **Testing**
  - [ ] Test provider account created
  - [ ] Onboarding completed successfully
  - [ ] Webhook events received
  - [ ] Database updated correctly
  - [ ] App displays correct status

---

## 🔐 Security Best Practices

### **1. Webhook Signature Verification**
✅ Already implemented in your webhook function:
```typescript
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
```

### **2. Environment Variables**
✅ Never commit secrets to Git:
- `.env` is in `.gitignore`
- Use Supabase secrets for production

### **3. HTTPS Only**
✅ Supabase functions use HTTPS by default

### **4. Error Handling**
✅ Webhook function has try/catch blocks

---

## 🚨 Common Issues & Solutions

### **Issue 1: Webhook Signature Verification Failed**

**Cause**: Webhook secret mismatch

**Solution**:
1. Get the current webhook secret from Stripe Dashboard
2. Update in Supabase: `npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
3. Update in `.env`
4. Restart your dev server

### **Issue 2: Phone Number Not Pre-filling**

**Cause**: Stripe platform limitation (KYC/AML compliance)

**Solution**: ✅ Already implemented - Blue info card shows user's phone for reference

### **Issue 3: Connected Account Creation Fails**

**Cause**: Missing required fields or API key issues

**Solution**:
1. Check edge function logs: `npx supabase functions logs create-stripe-account`
2. Verify API keys are correct
3. Check if account country matches (`GB` for UK)

### **Issue 4: Subscription Not Updating in Database**

**Cause**: Webhook not receiving events or price ID mismatch

**Solution**:
1. Check webhook delivery in Stripe Dashboard
2. Verify price IDs in `getSubscriptionType()` function
3. Check Supabase logs for errors

---

## 📚 Resources

- **Stripe Connect Docs**: https://docs.stripe.com/connect
- **Stripe Webhooks**: https://docs.stripe.com/webhooks
- **Stripe Testing**: https://docs.stripe.com/testing
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

## 🎯 Next Features to Implement

### **Immediate (Required for Launch)**
1. [ ] **Create webhook endpoint for Connect account events**
   - Handle `account.updated` to sync provider status
   - Handle `account.external_account.created` for bank account verification

2. [ ] **Test marketplace payment flow**
   - Customer pays for service
   - Transfer funds to provider
   - Platform fee deduction

### **Short Term (1-2 weeks)**
3. [ ] **Payout management for providers**
   - View pending payouts
   - View payout history
   - Payout status tracking

4. [ ] **Dispute handling**
   - Webhook for `charge.dispute.created`
   - Provider notification system
   - Evidence submission flow

### **Medium Term (1 month)**
5. [ ] **Analytics dashboard**
   - Total revenue
   - Platform fees collected
   - Provider payouts
   - Transaction volume

6. [ ] **Refund system**
   - Customer refund requests
   - Partial/full refunds
   - Automatic reversal of transfers

---

## ✅ Summary

**Current Status**:
- ✅ API keys updated (local + Supabase)
- ✅ Edge functions configured
- ✅ Phone info card working
- ⏳ Webhook endpoint needs configuration in Stripe Dashboard
- ⏳ Products/prices need to be created in new account

**Next Immediate Action**:
1. Set up webhook endpoint in Stripe Dashboard
2. Create Customer SOS and Provider Premium products
3. Update `.env` with new price IDs
4. Test the full onboarding flow

**Estimated Time to Complete**: 30-45 minutes

---

**Created**: January 14, 2025  
**Last Updated**: January 14, 2025  
**Status**: Setup in Progress  
**Test Account**: acct_1S7efRILA2CYnzre
