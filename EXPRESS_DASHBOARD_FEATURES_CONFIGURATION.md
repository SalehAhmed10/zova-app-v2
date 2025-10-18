# 🎯 Express Dashboard Features Configuration for ZOVA

**Current Status**: ❌ ALL FEATURES ARE OFF (Needs Configuration)  
**Your URL**: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/settings/connect/express-dashboard/features  
**Date**: October 14, 2025  
**Action Required**: Enable specific features for ZOVA's escrow payment model

---

## ⚠️ Current Problem

Your screenshot shows **ALL features are OFF**:
```
❌ View payments - OFF
❌ Issue refunds - OFF
❌ Manage disputes - OFF
❌ Manual payouts - OFF
❌ Edit payout schedule - OFF
❌ Top up refunds and disputes balance - OFF
```

**Impact**: Providers can't see their balance, payouts, or transaction history in Express Dashboard!

---

## ✅ Recommended Configuration for ZOVA

### **Your Payment Model** (ZOVAH_NOW_REQUIREMENTS.md):
```
Customer Books Service:
1. Customer pays £99 (£90 service + £9 fee)
2. Platform captures £99 into escrow
3. Service completed by provider
4. Platform transfers £90 to provider
5. Provider sees £90 in Express Dashboard
6. Automatic payout to provider's bank (weekly Monday)
```

### **Features You SHOULD Enable** ✅

#### **1. View Payments** - ✅ **ENABLE**
```
Setting: ON
Why: Providers need to see booking payments they received
What they see: 
  - "Haircut Booking #ZV-1234 - £90.00"
  - Transfer from ZOVA
  - Transaction date and status
```

**Benefit**: Transparency - providers track income from bookings

---

#### **2. Balance Component** - ✅ **ALWAYS VISIBLE** (Can't be disabled)
```
Setting: Always ON (default)
Why: Core feature - providers must see their balance
What they see:
  - Available balance: £90.00
  - Money on the way: £180.00 (2 pending bookings)
  - Next payout: Monday, Oct 21, 2025
  - Expected arrival date
```

**Benefit**: Providers know exactly when they'll get paid

---

#### **3. Transactions List** - ✅ **ALWAYS VISIBLE** (Can't be disabled)
```
Setting: Always ON (default)
Why: Core feature - providers must see transaction history
What they see:
  - Oct 14: Transfer from ZOVA - £90.00 (Haircut booking)
  - Oct 13: Transfer from ZOVA - £45.00 (Nail appointment)
  - Oct 10: Payout to bank ***1234 - £225.00
```

**Benefit**: Complete audit trail of all earnings

---

#### **4. Manage Disputes** - ⚠️ **OPTIONAL** (Consider your support model)
```
Setting: OFF (Recommended for ZOVA)
Why: Disputes are rare, and you want to handle them via support

Alternative Flow:
1. Customer disputes charge
2. Stripe notifies YOU (platform)
3. You contact provider for evidence
4. You submit evidence to Stripe on their behalf
5. Better control and consistent handling
```

**Recommendation**: **Keep OFF** - Handle disputes via your support team

**If you enable**:
- Providers respond directly to disputes
- Risk: Inconsistent responses, poor evidence
- Benefit: Faster response time

---

#### **5. Issue Refunds** - ❌ **DISABLE** (Important!)
```
Setting: OFF (Strongly recommended)
Why: Refunds affect YOUR escrow, not provider's balance

Your Escrow Model:
1. Customer pays £99 → Goes to YOUR platform account
2. You transfer £90 → Goes to provider
3. Customer requests refund → Comes from YOUR account (not provider)
4. Platform decision: Refund full £99? Partial £90?

Risk if enabled:
- Provider issues £90 refund
- But customer paid £99 (incl £9 fee)
- Creates accounting nightmare
- Provider can refund bookings they shouldn't
```

**Recommendation**: **Keep OFF** - All refunds through your app/support

**Your refund flow**:
1. Customer requests refund in ZOVA app
2. You review booking status (completed? cancelled?)
3. You decide refund amount via Stripe API
4. You issue refund from platform account
5. Clean accounting + policy enforcement

---

#### **6. Manual Payouts** - ❌ **DISABLE** (Recommended)
```
Setting: OFF (Recommended)
Why: You control payout schedule (weekly Monday)

Your model:
- Automatic weekly payouts every Monday
- Minimum payout: £10.00
- Providers get predictable payment schedule
- Reduces support queries ("When do I get paid?")

Risk if enabled:
- Provider requests daily manual payout
- Increases transfer fees
- Unpredictable cash flow
- More support burden
```

**Recommendation**: **Keep OFF** - Automatic payouts only

**Exception**: Enable if high-value providers demand it (£1000+ bookings)

---

#### **7. Edit Payout Schedule** - ❌ **DISABLE** (Recommended)
```
Setting: OFF (Recommended)
Why: Standardize payout schedule across all providers

Your schedule:
- Weekly automatic payouts
- Every Monday
- Minimum balance: £10.00

Benefits of standard schedule:
- Predictable cash flow for providers
- Easier financial planning
- Consistent support messaging
- Lower support volume

Risk if enabled:
- Provider changes to daily payouts → More fees
- Provider changes to manual → Forgets to pay out → Support ticket
- Inconsistent experience across providers
```

**Recommendation**: **Keep OFF** - Standard schedule for all

---

#### **8. Top Up Refunds and Disputes Balance** - ❌ **DISABLE**
```
Setting: OFF (Recommended)
Why: Only relevant if providers have negative balances

Your escrow model:
- Customer pays YOU (platform)
- YOU transfer to provider
- Refunds/disputes come from YOUR balance
- Providers never go negative

When this matters:
- Direct charges (customer pays provider directly)
- Provider can go negative from chargebacks
- Not relevant for ZOVA's transfer model
```

**Recommendation**: **Keep OFF** - Not needed for escrow model

---

## 🎯 **ZOVA's Final Configuration**

### **✅ Features to ENABLE**:
```
☑️ View payments          - YES (providers see booking income)
☑️ Balance component      - ON by default (can't disable)
☑️ Transactions list      - ON by default (can't disable)
```

### **❌ Features to KEEP OFF**:
```
☐ Issue refunds           - NO  (platform handles refunds)
☐ Manage disputes         - NO  (platform handles disputes via support)
☐ Manual payouts          - NO  (automatic weekly schedule only)
☐ Edit payout schedule    - NO  (standard Monday payouts for all)
☐ Top up balance          - NO  (not needed for escrow/transfer model)
```

---

## 📋 Step-by-Step Configuration

### **Step 1: Navigate to Express Dashboard Settings**
```
URL: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/settings/connect/express-dashboard/features
```

### **Step 2: Enable "View Payments"**
1. Find **"View payments"** section
2. Toggle switch: **OFF → ON**
3. Preview: Click "Preview" to see what providers will see
4. Description shown:
   ```
   Allow connected accounts to view the payments tab and 
   additional information such as payment method details and fees.
   ```

### **Step 3: Verify Other Features are OFF**
1. **Issue refunds**: Verify **OFF** ✅
2. **Manage disputes**: Verify **OFF** ✅
3. **Manual payouts**: Verify **OFF** ✅
4. **Edit payout schedule**: Verify **OFF** ✅
5. **Top up balance**: Verify **OFF** ✅

### **Step 4: Save Changes**
1. Scroll to bottom
2. Click **"Save"** button
3. Confirmation: "Settings updated successfully"

### **Step 5: Switch to Live Mode**
1. Top-right toggle: **Test mode → View live mode settings**
2. URL becomes: `https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/settings/connect/express-dashboard/features`
3. Note appears: **"Some settings are hidden"** (because you're in test mode)
4. Click **"View all settings"**
5. Repeat Step 2-4 for **live mode**

---

## 🎨 What Providers Will See (After Configuration)

### **Express Dashboard Overview**:
```
┌─────────────────────────────────────────────────────┐
│  ZOVA (Your Logo)                     [Profile] [?] │
├─────────────────────────────────────────────────────┤
│  Balance                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                      │
│  Available now           £90.00                     │
│  On the way             £180.00 (2 transfers)       │
│  ────────────────────────────────────────────────── │
│  Next payout            Monday, Oct 21              │
│  To bank account        ****1234                    │
│                                                      │
├─────────────────────────────────────────────────────┤
│  Transactions                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                      │
│  Oct 14  Transfer from ZOVA            +£90.00     │
│          Haircut booking #ZV-1234                   │
│                                                      │
│  Oct 13  Transfer from ZOVA            +£45.00     │
│          Nail appointment #ZV-1233                  │
│                                                      │
│  Oct 10  Payout to ****1234           -£225.00     │
│          Automatic payout                           │
│                                                      │
├─────────────────────────────────────────────────────┤
│  ✅ Payments (NEW - Because you enabled it!)        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                      │
│  Showing: All payments ▼                            │
│                                                      │
│  Oct 14  Haircut booking              £90.00  ✓    │
│          Customer: John D.                          │
│          Transfer ID: tr_xxx                        │
│                                                      │
│  Oct 13  Nail appointment             £45.00  ✓    │
│          Customer: Sarah M.                         │
│          Transfer ID: tr_yyy                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Key Points**:
- ✅ Providers see **ZOVA branding** (your logo)
- ✅ Clear balance display (£90 available)
- ✅ Next payout date (Monday, Oct 21)
- ✅ Transaction history (transfers from ZOVA)
- ✅ **NEW: Payments tab** (booking details) ← Because you enabled it!
- ❌ **NO refund button** (you handle refunds)
- ❌ **NO manual payout button** (automatic only)
- ❌ **NO payout schedule editor** (standard Monday schedule)

---

## 🧪 Testing Your Configuration

### **Test 1: Create Test Provider**
1. Use your `create-stripe-account` function
2. Complete Express onboarding
3. Provider completes verification

### **Test 2: Simulate Transfer**
```bash
# Via Stripe CLI or Dashboard
stripe transfers create \
  --amount 9000 \
  --currency gbp \
  --destination acct_TEST123 \
  --description "Test Haircut Booking #ZV-1234"
```

### **Test 3: Generate Express Login Link**
```bash
# Create login link for test provider
stripe account_sessions create \
  --account acct_TEST123 \
  --components[account_onboarding][enabled]=true
```

### **Test 4: View Express Dashboard**
1. Open login link in browser
2. Complete SMS authentication
3. Verify you see:
   - ✅ Balance: £90.00
   - ✅ Transactions: Transfer from ZOVA - £90.00
   - ✅ **Payments tab** (NEW - because enabled)
   - ✅ Next payout: Monday
   - ❌ NO refund buttons
   - ❌ NO manual payout buttons

**Expected**: Provider can view earnings but can't issue refunds or change schedule

---

## 📊 Comparison: What Changes After Enabling "View Payments"

### **Before (Current - All OFF)**:
```
Provider Express Dashboard shows:
  ✅ Balance (£90)
  ✅ Transactions (transfers)
  ❌ NO payment details
  ❌ NO customer names
  ❌ NO booking references
```

**Problem**: Providers see £90 transfer but don't know which booking it's from

### **After (View Payments = ON)**:
```
Provider Express Dashboard shows:
  ✅ Balance (£90)
  ✅ Transactions (transfers)
  ✅ Payments tab with details:
     - Booking reference: #ZV-1234
     - Customer: John D. (first name + initial)
     - Service: Haircut
     - Amount: £90.00
     - Status: Succeeded
     - Transfer ID: tr_xxx
```

**Benefit**: Providers can reconcile bookings with transfers

---

## 🚨 Common Mistakes to Avoid

### **❌ Mistake 1: Enabling "Issue Refunds"**
```
Provider issues £90 refund → But customer paid £99
→ Who refunds the £9 fee?
→ Accounting nightmare
→ Policy violations (refund window, service completed, etc.)
```

**Solution**: Keep OFF, handle refunds in your ZOVA app

### **❌ Mistake 2: Enabling "Manual Payouts"**
```
Provider clicks "Pay out now" every day
→ Increases Stripe transfer fees
→ Unpredictable cash flow
→ Support burden: "Why can't I pay out today?"
```

**Solution**: Keep OFF, automatic weekly payouts only

### **❌ Mistake 3: Enabling "Edit Payout Schedule"**
```
Provider A: Daily payouts
Provider B: Weekly payouts
Provider C: Manual payouts (forgets to pay out)
→ Inconsistent experience
→ More support queries
→ Complex financial reporting
```

**Solution**: Keep OFF, standard Monday schedule for all

### **❌ Mistake 4: Enabling "Manage Disputes"**
```
Provider uploads poor evidence for dispute
→ Chargeback won
→ You lose £99 (not provider)
→ Risk of policy violations
```

**Solution**: Keep OFF, handle disputes via support team with trained staff

---

## 📝 Configuration Checklist

### **Pre-Configuration** (Before Enabling Features):
- [ ] Understand your escrow payment flow
- [ ] Review ZOVAH_NOW_REQUIREMENTS.md
- [ ] Decide refund policy (who handles? app or provider?)
- [ ] Decide payout schedule (automatic weekly? manual? daily?)
- [ ] Train support team on dispute handling

### **Configuration** (Enable Correct Features):
- [ ] Navigate to Express Dashboard Features settings
- [ ] Enable: **View payments** ✅
- [ ] Verify OFF: **Issue refunds** ❌
- [ ] Verify OFF: **Manage disputes** ❌
- [ ] Verify OFF: **Manual payouts** ❌
- [ ] Verify OFF: **Edit payout schedule** ❌
- [ ] Verify OFF: **Top up balance** ❌
- [ ] Click **Save**

### **Post-Configuration** (Test & Verify):
- [ ] Create test Express account
- [ ] Simulate transfer (£90)
- [ ] Generate Express login link
- [ ] View Express Dashboard as provider
- [ ] Verify **Payments tab** visible
- [ ] Verify **NO refund buttons**
- [ ] Verify **NO manual payout buttons**
- [ ] Verify **Next payout: Monday**

### **Go Live** (Apply to Production):
- [ ] Switch to live mode in Stripe Dashboard
- [ ] Apply same configuration to live mode
- [ ] Test with real provider account (small amount)
- [ ] Monitor for 1 week
- [ ] Gather provider feedback
- [ ] Adjust if needed (rare)

---

## 🎯 Final Recommendation

### **For ZOVA's Escrow Model**:

**✅ Enable ONLY**:
1. **View payments** - Providers see booking details

**❌ Keep OFF**:
1. **Issue refunds** - Platform handles refunds
2. **Manage disputes** - Platform handles disputes
3. **Manual payouts** - Automatic schedule only
4. **Edit payout schedule** - Standard Monday schedule
5. **Top up balance** - Not needed for transfer model

**Why this works**:
- ✅ Providers see earnings and payout dates (transparency)
- ✅ Platform controls refunds (policy enforcement)
- ✅ Platform controls disputes (consistent responses)
- ✅ Standard payout schedule (predictable cash flow)
- ✅ Simple support model (fewer edge cases)

---

## 🚀 Next Steps

1. **Navigate to settings**:
   - URL: https://dashboard.stripe.com/acct_1S7ef2IO9K9pFTMD/test/settings/connect/express-dashboard/features

2. **Enable "View payments"**:
   - Toggle: OFF → ON
   - Click: Save

3. **Verify configuration**:
   - All other features: OFF
   - Payments: ON

4. **Test with provider**:
   - Create test account
   - Simulate transfer
   - View Express Dashboard
   - Verify payments tab visible

5. **Apply to live mode**:
   - Switch: Test mode → Live mode
   - Repeat configuration
   - Save changes

**Total time**: **5 minutes** (just toggle 1 switch!)

---

## 📚 Related Documentation

- **Express Dashboard Overview**: https://docs.stripe.com/connect/express-dashboard
- **Customize Features**: https://docs.stripe.com/connect/customize-express-dashboard#customize-features
- **Your Setup Guide**: STRIPE_CONNECT_EXPRESS_SETUP_GUIDE.md (Priority 3)
- **Complete Roadmap**: COMPLETE_NEXT_STEPS_TO_PRODUCTION.md

---

## ✅ Summary

**Current State**: ALL features OFF ❌  
**Target State**: View payments ON, all others OFF ✅  
**Action**: Toggle 1 switch, click Save  
**Time**: 5 minutes  
**Impact**: Providers see booking details in Express Dashboard  

**You're on the right track - just need to enable "View payments" and you're done!** 🚀
