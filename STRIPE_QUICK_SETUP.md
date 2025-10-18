# 🚀 STRIPE SETUP - QUICK REFERENCE

## ✅ COMPLETED
- [x] API keys updated in `.env`
- [x] Supabase secrets updated
- [x] **Webhook created and configured** ✅
- [x] **Webhook secret updated** ✅
- [x] Development server restarted
- [x] Phone info card working

---

## 📋 YOUR IMMEDIATE TODO (7 minutes)

### 1️⃣ **Create Products** (REQUIRED)

**Go to**: https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/products

**Create Product 1**: Customer SOS
- Name: Customer SOS Subscription
- Price: £5.99/month
- Billing: Monthly
- Currency: GBP
- **Copy the Price ID** (starts with `price_`)

**Create Product 2**: Provider Premium
- Name: Provider Premium Subscription
- Price: £5.99/month
- Billing: Monthly
- Currency: GBP
- **Copy the Price ID** (starts with `price_`)

**Update .env**:
```env
EXPO_PUBLIC_STRIPE_CUSTOMER_SOS_PRICE_ID=price_YOUR_NEW_ID_HERE
EXPO_PUBLIC_STRIPE_PROVIDER_PREMIUM_PRICE_ID=price_YOUR_NEW_ID_HERE
```

**Then restart dev server**:
```powershell
# Stop current server (Ctrl+C)
npm start
```

---

### 2️⃣ **Test Provider Onboarding**

1. Open ZOVA app
2. Login as provider: `artinsane00@gmail.com`
3. Go to Payments screen
4. Tap "Connect Stripe Account"
5. Complete onboarding with **TEST data**:
   - Phone: Any valid UK number
   - Bank: Sort code `10-88-00`, Account `00012345`
   - Business: Any test data

---

## 🔗 Quick Links

- **Webhooks**: https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/webhooks
- **Products**: https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/products
- **Connected Accounts**: https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/connect/accounts/overview
- **API Keys**: https://dashboard.stripe.com/acct_1S7efRILA2CYnzre/test/apikeys

---

## 🆘 Need Help?

See full guide: `STRIPE_COMPLETE_SETUP_GUIDE.md`

**Common Issues**:
- Webhook fails → Check signing secret
- Account creation fails → Check edge function logs
- Phone not prefilling → This is normal (Stripe limitation)

---

## 📞 Support

If you get stuck, check:
1. Stripe Dashboard → Webhooks → Attempts (for webhook issues)
2. `npx supabase functions logs create-stripe-account` (for account creation)
3. `npx supabase functions logs stripe-webhooks-subscription` (for webhook processing)
