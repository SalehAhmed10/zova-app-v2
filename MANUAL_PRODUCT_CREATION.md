# 🚀 MANUAL PRODUCT CREATION GUIDE

Since Stripe MCP isn't loaded yet, create products manually (takes 3 minutes):

---

## 📋 PRODUCT 1: Customer SOS Subscription

### Step-by-Step:
1. Go to: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/products
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `Customer SOS Subscription`
   - **Description**: `Priority support and urgent booking access for customers`
4. Click **"Add pricing"**:
   - **Pricing model**: Standard pricing
   - **Price**: `5.99`
   - **Currency**: `GBP`
   - **Billing period**: `Recurring` → `Monthly`
   - **Price description**: `Customer SOS - Monthly Subscription`
   - **Lookup key**: `customer_sos_monthly`
5. Click **"Add product"**
6. **Copy the Price ID** (starts with `price_`)

---

## 📋 PRODUCT 2: Provider Premium Subscription

### Step-by-Step:
1. Still on: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/products
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `Provider Premium Subscription`
   - **Description**: `Advanced features and analytics for service providers`
4. Click **"Add pricing"**:
   - **Pricing model**: Standard pricing
   - **Price**: `5.99`
   - **Currency**: `GBP`
   - **Billing period**: `Recurring` → `Monthly`
   - **Price description**: `Provider Premium - Monthly Subscription`
   - **Lookup key**: `provider_premium_monthly`
5. Click **"Add product"**
6. **Copy the Price ID** (starts with `price_`)

---

## 📝 AFTER CREATING BOTH PRODUCTS

Share both Price IDs with me, they'll look like:
```
Customer SOS Price ID: price_1ABC...
Provider Premium Price ID: price_1XYZ...
```

Then I'll:
1. ✅ Update your `.env` file
2. ✅ Update the webhook function
3. ✅ Redeploy to Supabase

---

**Go create them now!** Takes 3 minutes total. 🚀
