# 🔔 WEBHOOK CREATION GUIDE - COPY & PASTE

## 🎯 STEP-BY-STEP

### **Step 1: Go to Webhooks Page**
https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/webhooks

### **Step 2: Click "Add endpoint"**

---

## 📋 CONFIGURATION (Copy These Values)

### **Endpoint URL:**
```
https://wezgwqqdlwybadtvripr.supabase.co/functions/v1/stripe-webhook
```

### **Description:**
```
ZOVA Marketplace & Subscriptions (Test Mode)
```

### **Events to send:** Select "Your account" (NOT "Connected accounts")

---

## ✅ SELECT THESE 18 EVENTS

### **Subscriptions (4 events):**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `customer.subscription.trial_will_end`

### **Invoices (5 events):**
- ✅ `invoice.created`
- ✅ `invoice.finalized`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `invoice.payment_action_required`

### **Payment Intents (4 events):**
- ✅ `payment_intent.created`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `payment_intent.canceled`

### **Connect Accounts (3 events):**
- ✅ `account.updated`
- ✅ `account.external_account.created`
- ✅ `account.external_account.updated`

### **Transfers (2 events):**
- ✅ `transfer.created`
- ✅ `transfer.updated`

---

## 🔐 AFTER CREATING WEBHOOK

1. Click **"Reveal"** to see the signing secret
2. Copy the secret (starts with `whsec_`)
3. Share it with me

---

## 📊 QUICK CHECKLIST

Before clicking "Add endpoint":
- [ ] Endpoint URL is correct (contains `stripe-webhook`)
- [ ] Description added
- [ ] "Your account" is selected (not "Connected accounts")
- [ ] All 18 events are checked
- [ ] API version is latest (should auto-select)

---

## ⚡ CREATE IT NOW!

Go create the webhook, then share the signing secret with me! 🚀
