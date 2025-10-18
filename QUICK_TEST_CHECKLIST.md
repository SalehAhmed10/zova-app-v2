# 🧪 Database Save Fix - Quick Test Checklist

## ⚡ Pre-Test Setup (30 seconds)

```powershell
# Clean build
npx expo start --clear

# Start Android
npm run android:clean
```

**Login**: artinsane00@gmail.com

---

## ✅ Test 1: Document Verification (2 minutes)

### Steps:
1. Go to Step 1 (Document Verification)
2. Click "Use Existing" button
3. Click "Continue" in alert

### Expected Console Logs:
```
✅ [DocumentSubmission] User confirmed using existing document
✅ [DocumentSubmission] Saving document verification data
✅ [VerificationMutation] Updating progress: {stepNumber: 1, nextStep: 2}
✅ [VerificationMutation] Progress saved successfully
✅ [DocumentSubmission] ✅ Document data saved to database
```

### Quick Database Check:
```sql
SELECT current_step, steps_completed->>'1' as step_1
FROM provider_onboarding_progress 
WHERE provider_id = '287f3c72-32a7-4446-a231-42df810a1e1c';
```

**Expected**: `current_step: 2`, `step_1: "true"` ✅

### 🔴 If Logs Missing:
- Mutation was not called
- Fix did not apply correctly
- Check browser console for errors

---

## ✅ Test 2: Selfie Verification (2 minutes)

### Steps:
1. Should auto-navigate to Step 2
2. Click "Upload Selfie"
3. Select image
4. Click "Continue" in success alert

### Expected Console Logs:
```
✅ [VerificationMutation] Saving selfie URL to database: https://...
✅ [VerificationMutation] Selfie URL saved successfully
✅ [VerificationMutation] Updating progress: {stepNumber: 2, nextStep: 3}
✅ [VerificationMutation] Progress saved successfully
✅ [Selfie] ✅ Completed step 2, navigating to business info
```

### Quick Database Check:
```sql
-- Check selfie URL saved
SELECT selfie_verification_url 
FROM profiles 
WHERE id = '287f3c72-32a7-4446-a231-42df810a1e1c';

-- Check progress
SELECT current_step, steps_completed->>'2' as step_2
FROM provider_onboarding_progress 
WHERE provider_id = '287f3c72-32a7-4446-a231-42df810a1e1c';
```

**Expected**: 
- `selfie_verification_url`: "https://..." (not NULL) ✅
- `current_step: 3`, `step_2: "true"` ✅

### 🔴 If Selfie URL is NULL:
- ❌ **CRITICAL BUG NOT FIXED**
- Mutation did not save selfie_verification_url
- Need to investigate mutation code

---

## ✅ Test 3: Business Info (3 minutes)

### Steps:
1. Should auto-navigate to Step 3
2. Fill form:
   - Business Name: "Test Salon"
   - Business Bio: "Professional services" (any text under 150 chars)
   - Phone: Select country code + enter number
   - Country: "United Kingdom"
   - City: "London"
   - Address: "123 Baker Street"
   - Postal Code: "NW1 6XE"
3. Click "Continue"
4. Wait for geocoding validation
5. Should see "Address verified ✓"

### Expected Console Logs:
```
✅ [VerificationMutation] Saving business info
✅ [VerificationMutation] Updating progress: {stepNumber: 3, nextStep: 4}
✅ [VerificationMutation] Progress saved successfully
```

### Quick Database Check:
```sql
SELECT 
  business_name, 
  business_bio, 
  phone_number,
  address,
  city,
  postal_code,
  latitude, 
  longitude,
  updated_at
FROM profiles 
WHERE id = '287f3c72-32a7-4446-a231-42df810a1e1c';
```

**Expected**:
- `business_name`: "Test Salon" ✅
- `business_bio`: "Professional services" ✅
- `phone_number`: "+44 1234567890" ✅
- `address`: "123 Baker Street" ✅
- `city`: "London" ✅
- `postal_code`: "NW1 6XE" ✅
- `latitude`: ~51.52 ✅
- `longitude`: ~-0.15 ✅
- `updated_at`: Recent timestamp ✅

### 🔴 If Any Field is NULL:
- ❌ **BUSINESS INFO NOT SAVING**
- Check mutation logs
- Verify form data structure

---

## ✅ Test 4: CRITICAL - Data Persistence (1 minute)

### Steps:
1. Complete Steps 1-3 above
2. **LOGOUT** from app
3. **LOGIN** again

### Expected Behavior:
✅ App redirects to **Step 4** (Category Selection)  
✅ NOT Step 1  
✅ Previous data still visible if you go back

### Database Check:
```sql
SELECT current_step, steps_completed 
FROM provider_onboarding_progress 
WHERE provider_id = '287f3c72-32a7-4446-a231-42df810a1e1c';
```

**Expected**:
```json
{
  "current_step": 4,
  "steps_completed": {
    "1": true,
    "2": true,
    "3": true,
    "4": false,
    "5": false,
    "6": false,
    "7": false,
    "8": false,
    "9": false
  }
}
```

### 🎉 If Test Passes:
**✨ BUG IS COMPLETELY FIXED! ✨**

### 🔴 If Test Fails:
**❌ STILL AN ISSUE**
- Check `provider_onboarding_progress` table
- Check console logs during logout/login
- Verify auth state synchronization

---

## 📊 Complete Database Verification

### Run This Query After All Tests:
```sql
-- Full verification check
SELECT 
  p.id,
  p.email,
  p.business_name,
  p.business_bio,
  p.selfie_verification_url,
  p.phone_number,
  p.address,
  p.city,
  p.postal_code,
  p.latitude,
  p.longitude,
  pop.current_step,
  pop.steps_completed
FROM profiles p
LEFT JOIN provider_onboarding_progress pop ON p.id = pop.provider_id
WHERE p.id = '287f3c72-32a7-4446-a231-42df810a1e1c';
```

### Expected Full Result:
```
id: 287f3c72-32a7-4446-a231-42df810a1e1c
email: artinsane00@gmail.com
business_name: "Test Salon" ← NOT NULL ✅
business_bio: "Professional services" ← NOT NULL ✅
selfie_verification_url: "https://..." ← NOT NULL ✅
phone_number: "+44 1234567890" ← NOT NULL ✅
address: "123 Baker Street" ← NOT NULL ✅
city: "London" ← NOT NULL ✅
postal_code: "NW1 6XE" ← NOT NULL ✅
latitude: 51.523762 ← NOT NULL ✅
longitude: -0.158495 ← NOT NULL ✅
current_step: 4 ← Should be 4 ✅
steps_completed: {"1":true,"2":true,"3":true,...} ← Steps 1-3 true ✅
```

### 🔴 If ANY Field is NULL That Should Have Data:
**❌ MUTATION DID NOT SAVE THAT SPECIFIC STEP**
- Review mutation code for that step
- Check console logs for errors
- Verify step number mapping

---

## 🎯 Pass/Fail Criteria

### ✅ **PASS** - All Must Be True:
- [ ] Document step: `current_step=2`, `steps_completed.1=true`
- [ ] Selfie step: `selfie_verification_url` populated, `current_step=3`, `steps_completed.2=true`
- [ ] Business step: All fields populated including coordinates, `current_step=4`, `steps_completed.3=true`
- [ ] Persistence: Logout/login returns to Step 4
- [ ] Console logs show mutation calls for ALL steps

### ❌ **FAIL** - If Any Is True:
- [ ] Any `current_step` stuck at 1
- [ ] Any `steps_completed` field is false after completing step
- [ ] `selfie_verification_url` is NULL after selfie upload
- [ ] Business info fields are NULL after form submission
- [ ] Logout/login returns to Step 1 instead of Step 4
- [ ] NO `[VerificationMutation]` logs in console

---

## 🐛 Debugging Commands

### If Tests Fail, Check:

**1. Check Console Logs**:
```
Filter by: [VerificationMutation]
Should see: "Updating progress", "Progress saved successfully"
```

**2. Check Database State**:
```sql
-- See exact state
SELECT * FROM provider_onboarding_progress 
WHERE provider_id = '287f3c72-32a7-4446-a231-42df810a1e1c';
```

**3. Check RLS Policies**:
```sql
-- Ensure user can update their own progress
SELECT * FROM pg_policies 
WHERE tablename='provider_onboarding_progress';
```

**4. Check Supabase Logs**:
- Go to Supabase Dashboard
- Navigate to Logs → Postgres Logs
- Filter by timestamp during test
- Look for errors

---

## ⏱️ Total Testing Time: ~8 minutes

- Test 1 (Documents): 2 min
- Test 2 (Selfie): 2 min  
- Test 3 (Business): 3 min
- Test 4 (Persistence): 1 min

**If all pass**: 🎉 **BUG FIXED!**  
**If any fail**: 🔴 **Need further investigation**

---

**Last Updated**: October 15, 2025  
**Status**: Ready for testing  
**Confidence**: 🔥 **HIGH** - Root cause fixed systematically
