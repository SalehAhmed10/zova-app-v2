# 🔒 Stripe Account Disconnect Functionality - REMOVED

**Date**: October 14, 2025  
**Status**: ✅ COMPLETED  
**Type**: Security & Financial Protection Enhancement

---

## 📋 Executive Summary

Removed self-service Stripe account disconnection functionality from the provider payments screen. Users must now contact support for account disconnection to prevent accidental financial data loss.

---

## 🎯 Problem Statement

### User's Situation (artinsane00@gmail.com)
```sql
Provider ID: c7fa7484-9609-49d1-af95-6508a739f4a2
Stripe Account: acct_1SHpKtCXEzM5o0X3
Status: pending (incomplete onboarding)
Charges Enabled: false
Details Submitted: false

Historical Data:
- 11 completed bookings
- $572.00 total earnings
- 5 pending payouts totaling $402.80
- 3.0 average rating (3 reviews)
```

### Critical Risk
**If disconnected before onboarding completion:**
- ❌ $402.80 in pending payouts PERMANENTLY LOST
- ❌ Cannot transfer funds without active Stripe account
- ❌ Orphaned payout records with no `stripe_transfer_id`
- ❌ Accounting reconciliation nightmare

---

## 🏗️ What Was Changed

### **1. Removed from `payments.tsx`**

#### Deleted Code (Lines 129-147):
```typescript
// ❌ REMOVED: deleteAccountMutation
const deleteAccountMutation = useMutation({
  mutationFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('delete-stripe-account');
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['stripe-status'] });
    setStripeAccountId(null);
    setAccountSetupComplete(false);
  },
});
```

#### Deleted Code (Lines 168-178):
```typescript
// ❌ REMOVED: handleDeleteAccount
const handleDeleteAccount = () => {
  Alert.alert(
    'Delete Stripe Account',
    'Are you sure you want to delete your Stripe account?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAccountMutation.mutate() },
    ]
  );
};
```

#### Deleted UI (Lines 365-376):
```tsx
{/* ❌ REMOVED: Disconnect Account Button */}
<Button
  variant="outline"
  onPress={handleDeleteAccount}
  disabled={deleteAccountMutation.isPending}
  style={{ borderColor: colors.destructive + '40' }}
>
  <Text style={{ color: colors.destructive }}>
    {deleteAccountMutation.isPending ? 'Disconnecting...' : 'Disconnect Account'}
  </Text>
</Button>
```

### **2. Added Support Contact UI**

```tsx
{/* ✅ NEW: Support Contact for Disconnection */}
<View className="pt-4 border-t border-border bg-muted/30 rounded-lg p-4">
  <View className="flex-row items-start">
    <Ionicons name="information-circle-outline" size={20} color={colors.muted} />
    <View className="flex-1 ml-3">
      <Text className="text-foreground font-medium mb-1">
        Need to Disconnect?
      </Text>
      <Text className="text-muted-foreground text-sm">
        For account disconnection, please contact our support team at support@zova.com. 
        This ensures your pending earnings are properly handled.
      </Text>
    </View>
  </View>
</View>
```

### **3. Edge Function Status**

**`delete-stripe-account`** edge function:
- ✅ **KEPT** for admin use via Supabase dashboard
- ⚠️ **NOT accessible** to users through app UI
- 🔒 Requires JWT authentication
- 🗑️ Actually deletes Stripe account using `stripe.accounts.del()`

---

## 💡 Why This Change?

### **1. Financial Protection**
```typescript
// Pending payouts structure
{
  id: "uuid",
  provider_id: "c7fa7484-9609-49d1-af95-6508a739f4a2",
  amount: "84.60",
  status: "pending",
  stripe_transfer_id: null,  // ⚠️ NULL until onboarding complete
  booking_id: "uuid"
}
```

**Transfer Process Requires:**
1. ✅ Complete Stripe onboarding
2. ✅ `charges_enabled: true`
3. ✅ `details_submitted: true`
4. ✅ Valid `stripe_account_id`
5. Then: `stripe.transfers.create()` populates `stripe_transfer_id`

**If disconnected early:**
- Can't execute `stripe.transfers.create()` (no destination)
- Funds collected from customers but never transferred
- Provider loses money they rightfully earned

### **2. Industry Standards**

**Major Platforms Don't Allow Self-Service Disconnect:**
- ✅ **Uber/Lyft**: Contact support to change payout account
- ✅ **Stripe Dashboard**: No "delete account" button for Connect accounts
- ✅ **Shopify**: Admin approval required for payment processor changes
- ✅ **DoorDash**: Support ticket required for account changes

### **3. Business Logic**

Stripe accounts are **permanent business infrastructure**, not temporary settings:
- Bank account numbers don't change
- Tax IDs don't change
- Business entities don't change frequently
- Payment history must be traceable for accounting

Disconnection should only happen for:
- Business entity changes (LLC → Corporation)
- Fraud detection
- Legal/compliance requirements
- Business closure

All require **admin oversight and proper reconciliation**.

---

## 🔄 Data Migration Behavior (Reference)

### **Option A: Complete Existing Onboarding** ✅ RECOMMENDED
```typescript
// User keeps: acct_1SHpKtCXEzM5o0X3
✅ All 11 bookings linked to provider_id
✅ All stats remain (11 bookings, $572, 3.0 rating)
✅ Pending $402.80 can be transferred after onboarding
✅ Historical continuity preserved
```

### **Option B: Create New Stripe Account** ⚠️ NOT RECOMMENDED
```typescript
// New stripe_account_id overwrites old one
✅ Historical bookings STAY (linked by provider_id)
✅ Stats still show (not tied to Stripe account)
❌ OLD $402.80 payouts become ORPHANED forever
⚠️ Future bookings use NEW Stripe account
⚠️ Accounting split across two Stripe accounts
```

---

## 🎯 Support Process (To Be Implemented)

### **When User Contacts Support:**

1. **Verify Identity**
   - Confirm email matches account
   - Verify phone number

2. **Check Pending Payouts**
   ```sql
   SELECT COUNT(*), SUM(amount)
   FROM provider_payouts
   WHERE provider_id = '[user_id]'
   AND status = 'pending'
   AND stripe_transfer_id IS NULL;
   ```

3. **If Pending Payouts Exist:**
   - ⚠️ **BLOCK disconnection until resolved**
   - Options:
     a. Complete onboarding → transfer funds → then disconnect
     b. Refund customers → cancel payouts → then disconnect
     c. Admin manual payout via bank transfer → then disconnect

4. **Execute Disconnection (Admin Only)**
   ```typescript
   // Via Supabase Dashboard or Admin Panel
   await supabase.functions.invoke('delete-stripe-account', {
     headers: { Authorization: `Bearer ${adminJWT}` }
   });
   ```

5. **Document Reason**
   - Log in support ticket system
   - Update provider notes in database

---

## 📊 Database Schema Reference

### **`provider_payouts` Table**
```sql
CREATE TABLE provider_payouts (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES profiles(id),
  booking_id UUID REFERENCES bookings(id),
  stripe_transfer_id TEXT,           -- NULL until transfer executed
  amount NUMERIC,
  currency TEXT,
  status payout_status,              -- pending | processing | paid | failed
  failure_reason TEXT,
  expected_payout_date DATE,
  actual_payout_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### **`profiles` Table (Stripe Fields)**
```sql
stripe_account_id TEXT,              -- acct_1SHpKtCXEzM5o0X3
stripe_charges_enabled BOOLEAN,      -- false (incomplete)
stripe_details_submitted BOOLEAN,    -- false (incomplete)
stripe_account_status TEXT           -- pending | active | inactive
```

---

## ✅ Testing Checklist

- [x] Remove disconnect button from UI
- [x] Remove `deleteAccountMutation` code
- [x] Remove `handleDeleteAccount` function
- [x] Add support contact information UI
- [x] Verify no TypeScript errors
- [x] Keep `delete-stripe-account` edge function for admin use
- [ ] Test payment screen loads correctly
- [ ] Verify support message displays properly
- [ ] Test on iOS and Android
- [ ] Update admin documentation for manual disconnect process

---

## 📝 Future Enhancements

### **Admin Dashboard Features (Recommended)**
1. **Pending Payout Alert System**
   ```typescript
   // Alert admin when disconnect requested with pending payouts
   if (pendingPayouts > 0) {
     sendAdminAlert({
       type: 'DISCONNECT_REQUEST_WITH_PENDING_PAYOUTS',
       providerId,
       amount: pendingPayouts,
       urgency: 'HIGH'
     });
   }
   ```

2. **Safe Disconnect Workflow**
   - Check for pending payouts
   - Process all transfers
   - Wait for completion
   - Then execute disconnect

3. **Database Constraint**
   ```sql
   -- Prevent stripe_account_id deletion if pending payouts exist
   CREATE OR REPLACE FUNCTION prevent_stripe_disconnect_with_pending_payouts()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.stripe_account_id IS NULL AND OLD.stripe_account_id IS NOT NULL THEN
       IF EXISTS (
         SELECT 1 FROM provider_payouts
         WHERE provider_id = OLD.id
         AND status = 'pending'
         AND stripe_transfer_id IS NULL
       ) THEN
         RAISE EXCEPTION 'Cannot disconnect Stripe account with pending payouts';
       END IF;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

---

## 🔗 Related Files

- **Modified**: `src/app/(provider)/profile/payments.tsx` (lines 129-147, 168-178, 365-376)
- **Kept**: `supabase/functions/delete-stripe-account/index.ts` (admin use only)
- **Reference**: Previous fixes in `STRIPE_ONBOARDING_URL_BUG_FIX.md`

---

## 💬 Support Email Template

**Subject**: Stripe Account Disconnection Request  
**Email**: support@zova.com

```
Hello ZOVA Support,

I need to disconnect my Stripe account from my provider profile.

Account Email: [your_email]
Provider Name: [business_name]
Reason for Disconnection: [explain]

Please let me know the next steps.

Thank you,
[Name]
```

---

## 🎓 Key Learnings

1. **Payment platforms require admin oversight** for disconnection operations
2. **Pending payouts are fragile** - no stripe_account_id = no transfer
3. **Historical data ≠ payment infrastructure** - stats persist, but payment fails
4. **Industry standard: support-based disconnect** for financial operations
5. **User protection > user control** for destructive financial actions

---

## ✅ Conclusion

Removing self-service Stripe disconnection:
- ✅ Protects user's pending earnings ($402.80 in this case)
- ✅ Prevents accidental financial data loss
- ✅ Aligns with industry best practices
- ✅ Reduces support burden from confused users
- ✅ Maintains accounting integrity
- ✅ Requires admin oversight for sensitive operations

**Status**: Feature successfully removed. Users must contact support@zova.com for Stripe account disconnection.
