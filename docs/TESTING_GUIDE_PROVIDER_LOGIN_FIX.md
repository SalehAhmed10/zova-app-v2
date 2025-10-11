# 🧪 Testing Guide: Provider Login Fix

## Pre-Test Verification

✅ **Database Status**:
```
Email: artinsane00@gmail.com
Role: provider ✅
Provider Progress: Yes ✅
Verification Status: pending ✅
```

✅ **Code Changes**:
- Auth listener with role verification ✅
- Migration applied successfully ✅
- TypeScript: 0 errors ✅

## Test Procedure

### Test 1: Provider Login Flow ⭐ PRIMARY TEST

**Objective**: Verify provider is routed correctly after login

**Steps**:
1. **Clear app cache** (important!):
   ```bash
   # In terminal
   npm start -- --reset-cache
   ```

2. **Close and reopen the app** on your device/emulator

3. **Login as provider**:
   - Email: `artinsane00@gmail.com`
   - Password: [your password]

4. **Observe logs**:
   ```
   Expected logs:
   [AuthListener] Fetching profile for user: c7fa7484-9609...
   [AuthListener] Profile loaded, setting authenticated with role: provider ✅
   [RootNavigator] User authenticated, navigating to: /provider-verification/verification-status
   [AuthNavigation] → /provider-verification/verification-status (provider-pending-waiting-approval)
   ```

5. **Verify screen**:
   - Should see: **Verification Status Screen** ✅
   - Hero icon: Clock icon (yellow/warning) ✅
   - Title: "Verification Pending" ✅
   - Timeline showing 3 steps ✅
   - NOT customer dashboard ✅

**Expected Result**: ✅ Provider routed to `/provider-verification/verification-status`

**If Failed**: Check logs for error messages

---

### Test 2: Role Mismatch Auto-Fix (Optional)

**Objective**: Verify self-healing system works

**Steps**:
1. **Manually create mismatch** (only for testing):
   ```sql
   UPDATE profiles 
   SET role = 'customer' 
   WHERE email = 'artinsane00@gmail.com';
   ```

2. **Login as provider** (same credentials)

3. **Observe logs**:
   ```
   Expected logs:
   [AuthListener] Fetching profile for user: c7fa7484-9609...
   [AuthListener] 🔴 Role mismatch detected! ⚠️
   [AuthListener] 🔧 Fixing role to provider in database...
   [AuthListener] ✅ Role fixed to provider
   [RootNavigator] User authenticated, navigating to: /provider-verification/verification-status
   ```

4. **Verify outcome**:
   - Should still route to provider verification ✅
   - Database should be automatically fixed ✅
   - Check database:
     ```sql
     SELECT role FROM profiles WHERE email = 'artinsane00@gmail.com';
     -- Should return: provider ✅
     ```

**Expected Result**: ✅ System auto-fixes mismatch and routes correctly

---

### Test 3: Customer Login (Regression Test)

**Objective**: Ensure customer flow still works

**Steps**:
1. **Logout** from provider account

2. **Login as customer**:
   - Use any existing customer account
   - Or create new customer account

3. **Observe routing**:
   - Should route to `/customer` dashboard ✅
   - NOT provider verification ✅

**Expected Result**: ✅ Customer flow unchanged

---

## Log Monitoring

Watch for these key log patterns:

### ✅ Success Logs
```
[AuthListener] Profile loaded, setting authenticated with role: provider
[RootNavigator] User authenticated, navigating to: /provider-verification/verification-status
[VerificationStatus] Config for status pending
```

### ⚠️ Auto-Fix Logs (Expected if mismatch found)
```
[AuthListener] 🔴 Role mismatch detected!
[AuthListener] 🔧 Fixing role to provider in database...
[AuthListener] ✅ Role fixed to provider
```

### ❌ Error Logs (Investigate if seen)
```
[AuthListener] ❌ Failed to fix role: <error>
[AuthListener] Error fetching profile: <error>
```

## Success Criteria

- [ ] Provider login routes to `/provider-verification/verification-status`
- [ ] Verification status screen displays correctly
- [ ] No "Text strings must be rendered" error
- [ ] Timeline shows 3 steps with proper icons
- [ ] Customer login still routes to `/customer` (no regression)
- [ ] Logs show correct role being set

## Troubleshooting

### Issue: Still routing to /customer

**Possible Causes**:
1. **Cache not cleared**: Clear metro cache and restart
2. **Old session**: Logout completely and login again
3. **Database not updated**: Check database role manually

**Solution**:
```bash
# Clear cache
npm start -- --reset-cache

# Check database
psql> SELECT role FROM profiles WHERE email = 'artinsane00@gmail.com';
```

### Issue: Role mismatch warning every login

**Cause**: Database not being updated properly

**Solution**: Check database permissions for profiles table update

### Issue: App crashes on login

**Cause**: Possible TypeScript error or database query issue

**Solution**: 
1. Check terminal for error logs
2. Verify migration applied successfully:
   ```sql
   SELECT * FROM check_provider_role_consistency();
   -- Should return empty []
   ```

## Post-Test Actions

### If All Tests Pass ✅
1. Mark as completed in tracking doc
2. Monitor production for any role mismatch warnings
3. Consider adding integration tests

### If Tests Fail ❌
1. Collect error logs
2. Check database state
3. Verify migration status
4. Report issue with logs

## Monitoring Query

Run this periodically to check for role inconsistencies:

```sql
-- Check for any provider role mismatches
SELECT * FROM check_provider_role_consistency();

-- Expected: Empty result []
```

## Rollback Plan (Emergency Only)

If critical issues arise:

```sql
-- Rollback user to customer (emergency only)
UPDATE profiles 
SET role = 'customer' 
WHERE email = 'artinsane00@gmail.com';
```

**Note**: Only use if provider flow is completely broken. The fix should work correctly.
