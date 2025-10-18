# 🚀 STRIPE MAIN ACCOUNT MIGRATION - QUICK SETUP

**Date**: October 14, 2025  
**From**: Sandbox Account (acct_1S7efRILA2CYnzre)  
**To**: Main Account (acct_1S7ef2IO9K9pFTMD)  
**Status**: ✅ API Keys Updated - Products & Webhook Pending

---

## ✅ COMPLETED STEPS

### 1. **API Keys Updated** ✅
- ✅ `.env` file updated with main account Test keys
- ✅ MCP config already has correct key
- ✅ Supabase secrets updated

**New Keys (Main Account - Test Mode)**:
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51S7ef2IO9K9pFTMD...
STRIPE_SECRET_KEY=sk_test_51S7ef2IO9K9pFTMD...
```

---

## 📋 NEXT STEPS (15 minutes)

### Step 1: Reload VS Code ⚡
**IMPORTANT**: Reload VS Code to refresh Stripe MCP connection
1. Press `Ctrl+Shift+P`
2. Type "Reload Window"
3. Press Enter

### Step 2: Create Products 🛍️
After reload, I'll create products using Stripe MCP:

**Product 1: Customer SOS Subscription**
- Price: £5.99/month
- Lookup Key: customer_sos_monthly

**Product 2: Provider Premium Subscription**
- Price: £5.99/month
- Lookup Key: provider_premium_monthly

### Step 3: Create Webhook 🔔
Go to: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/webhooks

**Webhook Configuration**:
```
Endpoint URL: https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhook
Description: ZOVA Marketplace & Subscriptions
```

**Events to Select** (18 total):
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- customer.subscription.trial_will_end
- invoice.created
- invoice.finalized
- invoice.payment_succeeded
- invoice.payment_failed
- invoice.payment_action_required
- payment_intent.created
- payment_intent.succeeded
- payment_intent.payment_failed
- payment_intent.canceled
- account.updated
- account.external_account.created
- account.external_account.updated
- transfer.created
- transfer.updated

### Step 4: Update Webhook Secret 🔐
After creating webhook:
1. Copy webhook signing secret (starts with `whsec_`)
2. Update `.env`: `STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET`
3. Update Supabase: `npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET`

### Step 5: Update Webhook Function 📝
Update Price IDs in webhook function with new prices from Step 2

### Step 6: Redeploy Functions 🚀
```powershell
npx supabase functions deploy stripe-webhooks-subscription
```

### Step 7: Restart Dev Server 🔄
```powershell
npm start
```

---

## 🔗 QUICK LINKS (Main Account)

- **Dashboard**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/dashboard
- **Products**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/products
- **Webhooks**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/webhooks
- **API Keys**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/apikeys
- **Connected Accounts**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/connect/accounts/overview

---

## 📊 MIGRATION CHECKLIST

- [x] Update `.env` with main account keys
- [x] Update MCP config (already correct)
- [x] Update Supabase STRIPE_SECRET_KEY
- [ ] **Reload VS Code** ← DO THIS NOW
- [ ] Create Customer SOS product
- [ ] Create Provider Premium product
- [ ] Update `.env` with new Price IDs
- [ ] Create webhook endpoint
- [ ] Update `.env` with webhook secret
- [ ] Update Supabase webhook secret
- [ ] Update webhook function with new Price IDs
- [ ] Redeploy webhook function
- [ ] Restart dev server
- [ ] Test provider onboarding

---

## 💡 WHY THIS IS BETTER

### Main Account Benefits:
✅ This IS the production account (not a separate sandbox)
✅ You have Administrator access
✅ Everything configured in Test Mode carries to Live Mode
✅ One account to manage (Test + Live together)
✅ No future migration needed
✅ Standard Stripe workflow

### Old Sandbox Account:
❌ Separate account from production
❌ Would need to recreate everything when going live
❌ Two accounts to manage
❌ Not the standard workflow

---

## 🎯 AFTER MIGRATION

Once complete, you'll have:
- ✅ Main production account configured
- ✅ Test Mode for safe development
- ✅ Easy switch to Live Mode (just change API keys)
- ✅ Products ready
- ✅ Webhooks ready
- ✅ Ready to test provider onboarding

---

**Next Action**: Reload VS Code, then ping me to continue! 🚀
