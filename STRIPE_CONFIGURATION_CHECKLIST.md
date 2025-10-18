# ✅ STRIPE MAIN ACCOUNT CONFIGURATION CHECKLIST

**Account**: Zovah (acct_1S7ef2IO9K9pFTMD)  
**Mode**: Test Mode  
**Date**: October 14, 2025

---

## 🔧 WHAT NEEDS TO BE CONFIGURED

### ✅ ALREADY DONE
- [x] API Keys updated in `.env`
- [x] API Keys updated in `mcp.json`
- [x] Supabase `STRIPE_SECRET_KEY` updated

---

## 📋 CONFIGURATION NEEDED (IN ORDER)

### **1. Reload VS Code** ⚡ (30 seconds)
**CRITICAL**: Reload VS Code so Stripe MCP connects to the new account
- Press `Ctrl+Shift+P`
- Type "Reload Window"
- Press Enter

**Why?** The Stripe MCP is still connected to the old sandbox account until you reload.

---

### **2. Create Products** 🛍️ (5 minutes)
After reloading, I'll create two subscription products:

**Product 1: Customer SOS Subscription**
- Description: Priority support and urgent booking access for customers
- Price: £5.99/month
- Currency: GBP
- Billing: Monthly recurring
- Lookup Key: `customer_sos_monthly`

**Product 2: Provider Premium Subscription**
- Description: Advanced features and analytics for service providers
- Price: £5.99/month
- Currency: GBP
- Billing: Monthly recurring
- Lookup Key: `provider_premium_monthly`

---

### **3. Update Price IDs in .env** 📝 (1 minute)
After creating products, I'll update your `.env` with the new Price IDs:
```env
EXPO_PUBLIC_STRIPE_CUSTOMER_SOS_PRICE_ID=price_...
EXPO_PUBLIC_STRIPE_PROVIDER_PREMIUM_PRICE_ID=price_...
```

---

### **4. Create Webhook Endpoint** 🔔 (5 minutes)
You'll need to manually create the webhook in Stripe Dashboard.

**Go to**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/webhooks

**Configuration**:
```
Endpoint URL: https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhook
Description: ZOVA Marketplace & Subscriptions (Test Mode)
API Version: 2025-08-27.basil (or latest)
Events from: Your account
```

**Select These 18 Events**:

**Subscriptions (4 events)**:
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `customer.subscription.trial_will_end`

**Invoices (5 events)**:
- ✅ `invoice.created`
- ✅ `invoice.finalized`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `invoice.payment_action_required`

**Payment Intents (4 events)**:
- ✅ `payment_intent.created`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `payment_intent.canceled`

**Connect Accounts (3 events)**:
- ✅ `account.updated`
- ✅ `account.external_account.created`
- ✅ `account.external_account.updated`

**Transfers (2 events)**:
- ✅ `transfer.created`
- ✅ `transfer.updated`

**After creating**:
1. Click "Reveal" to see the webhook signing secret
2. Copy it (starts with `whsec_`)
3. Share it with me

---

### **5. Update Webhook Secret** 🔐 (2 minutes)
I'll update the webhook secret in two places:
```powershell
# Update .env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET

# Update Supabase
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET
```

---

### **6. Update Webhook Function** 📝 (2 minutes)
I'll update the `stripe-webhooks-subscription` function with the new Price IDs:
- File: `supabase/functions/stripe-webhooks-subscription/index.ts`
- Function: `getSubscriptionType()`
- Replace old Price IDs with new ones

---

### **7. Redeploy Edge Functions** 🚀 (1 minute)
```powershell
npx supabase functions deploy stripe-webhooks-subscription
```

---

### **8. Restart Development Server** 🔄 (1 minute)
```powershell
# Stop current server (Ctrl+C)
npm start
```

---

## 🔍 OPTIONAL CONFIGURATIONS

### **Connect Platform Settings** (Optional - Can Do Later)
Configure Connect platform profile:
1. Go to: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/settings/connect
2. Set platform name: "ZOVA"
3. Set platform URL: Your app URL
4. Configure payout settings
5. Set default currency: GBP

### **Branding** (Optional - Can Do Later)
Add your logo and brand colors:
1. Go to: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/settings/branding
2. Upload logo
3. Set brand color
4. Set icon

### **Business Profile** (Required for Live Mode)
Before going live, you'll need to complete:
1. Go to: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/settings/public
2. Fill in business details
3. Add support email
4. Add privacy policy URL
5. Add terms of service URL

---

## 📊 CONFIGURATION SUMMARY

| Step | What | Who | Time | Status |
|------|------|-----|------|--------|
| 1 | Reload VS Code | You | 30s | ⏳ Pending |
| 2 | Create Products | Me (Automated) | 5m | ⏳ Pending |
| 3 | Update Price IDs | Me (Automated) | 1m | ⏳ Pending |
| 4 | Create Webhook | You (Manual) | 5m | ⏳ Pending |
| 5 | Update Webhook Secret | Me (Automated) | 2m | ⏳ Pending |
| 6 | Update Webhook Function | Me (Automated) | 2m | ⏳ Pending |
| 7 | Redeploy Functions | Me (Automated) | 1m | ⏳ Pending |
| 8 | Restart Server | You | 1m | ⏳ Pending |

**Total Time**: ~17 minutes

---

## 🎯 MIGRATION ADVANTAGES

### What You Get:
✅ Main production account configured (not sandbox)
✅ Test Mode for safe development
✅ Easy switch to Live Mode (just API keys)
✅ Administrator access
✅ All configurations carry over to production
✅ Standard Stripe workflow

### What You Avoid:
❌ No future migration needed
❌ No recreating everything for production
❌ No managing two separate accounts

---

## 🚀 LET'S START!

**Your Next Action**:
1. **Reload VS Code** (Ctrl+Shift+P → "Reload Window")
2. Come back and say **"reloaded"**
3. I'll immediately start creating products
4. 17 minutes later: Complete setup! ✅

---

## 🔗 QUICK LINKS

- **Dashboard**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/dashboard
- **Products**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/products
- **Webhooks**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/webhooks
- **API Keys**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/apikeys
- **Connect Settings**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/settings/connect
- **Connected Accounts**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/connect/accounts/overview

---

**Ready? Reload VS Code now!** ⚡
