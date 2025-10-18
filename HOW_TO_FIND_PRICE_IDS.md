# 🔍 HOW TO FIND PRICE IDs IN STRIPE DASHBOARD

## 📍 STEP-BY-STEP GUIDE

### **Method 1: From Product Page** (Easiest)

1. Go to: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/products

2. Click on a product (e.g., "Customer SOS Subscription")

3. Look at the **"Pricing"** section (it's a table/list)

4. You'll see something like:
   ```
   Price          Description                           Subscriptions  Created
   £5.99 GBP      Customer SOS - Monthly Subscription  0 active       Oct 14
   Per month
   ```

5. **Click on the price row** (click on "£5.99 GBP Per month")

6. You'll be taken to a page like:
   ```
   https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/prices/price_1SHvyvIO9K9pFTMD94e5xesf
   ```

7. **The Price ID is in the URL!** → `price_1SHvyvIO9K9pFTMD94e5xesf`

---

### **Method 2: From the Price Details Page**

Once you click on a price, look for:
- **"Price ID"** label on the page
- Usually in the top right or in a "Details" section
- It will show: `price_1SHvyvIO9K9pFTMD94e5xesf`

---

### **Method 3: From Events Log** (What I Used)

On the product page, scroll down to **"Events"** section:

You'll see entries like:
```
A new price called price_1SHvyvIO9K9pFTMD94e5xesf was created
10/14/25, 1:20:49 AM
```

The Price ID is right there! ✅

---

## ✅ YOUR PRICE IDs

Based on your product pages, here are your Price IDs:

### **Customer SOS Subscription**
- Product ID: `prod_TEOm4H74gest3i`
- **Price ID**: `price_1SHvyvIO9K9pFTMD94e5xesf` ⭐
- Price: £5.99/month

### **Provider Premium Subscription**
- Product ID: `prod_TEOlipgHg61iCr`
- **Price ID**: `price_1SHvxpIO9K9pFTMDPQgXV4xI` ⭐
- Price: £5.99/month

---

## 🔗 DIRECT LINKS TO VERIFY

**Customer SOS Price:**
https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/prices/price_1SHvyvIO9K9pFTMD94e5xesf

**Provider Premium Price:**
https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/prices/price_1SHvxpIO9K9pFTMDPQgXV4xI

Click these links to see the price details pages!

---

## 📊 VISUAL GUIDE

When you're on a product page, the layout looks like:

```
┌─────────────────────────────────────────┐
│ Customer SOS Subscription               │
│ Active  £5.99 GBP • Per month          │
├─────────────────────────────────────────┤
│ Pricing                                 │
├────────┬────────────┬──────────┬────────┤
│ Price  │Description │Subscript.│Created │
├────────┼────────────┼──────────┼────────┤
│£5.99   │Customer SOS│0 active  │Oct 14  │ ← CLICK THIS ROW
│Per mth │- Monthly   │          │        │
└────────┴────────────┴──────────┴────────┘
```

---

## ✅ CONFIRMATION

**I already have the correct Price IDs configured!**

In your `.env`:
```env
EXPO_PUBLIC_STRIPE_CUSTOMER_SOS_PRICE_ID=price_1SHvyvIO9K9pFTMD94e5xesf ✅
EXPO_PUBLIC_STRIPE_PROVIDER_PREMIUM_PRICE_ID=price_1SHvxpIO9K9pFTMDPQgXV4xI ✅
```

These are correct! ✅

---

## 🎯 NEXT STEP

Now that you understand the difference, let's create the webhook!

Go to: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/webhooks

Ready for webhook configuration? 🚀
