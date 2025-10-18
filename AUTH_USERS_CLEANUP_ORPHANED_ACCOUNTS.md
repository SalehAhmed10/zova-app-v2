# 🧹 Auth Users Cleanup - Orphaned Accounts Removal

**Date**: October 14, 2025  
**Issue**: Deleted profiles from database but forgot to delete corresponding auth.users  
**Impact**: 13 orphaned auth accounts exist without profiles  
**Action**: Delete orphaned auth users, keep 3 admins

---

## 📊 Current State Analysis

### **Total Auth Users**: 16
- **Orphaned (no profile)**: 13 ❌ (need deletion)
- **Admins (with profile)**: 3 ✅ (keep these)

### **Orphaned Auth Users to Delete**:
```
1. pimemog974@gamegta.com           (028d75ea-5725-4267-81dc-f6186bbc54cb)
2. wawayow281@ampdial.com           (2e3d2484-959a-4c8b-9fd6-ec18cc3b5e02)
3. focepi1107@ampdial.com           (b7d2cfbe-6bfb-4dcf-b7f6-6e2f650c70f4)
4. veleje2541@aiwanlab.com          (5fba9928-789f-4d02-aa68-c57b3ccd858b)
5. sameerstg@outlook.com            (600a3fa7-e0e7-4690-b020-13a731eab31d)
6. slm.ahmed1010@gmail.com          (f83a5ba0-ace1-4877-bc1a-ca51359954b4)
7. lm.ahmed1010@gmail.com           (605cc653-0f7e-40aa-95bc-1396b99f6390)
8. artinsane00@gmail.com            (c7fa7484-9609-49d1-af95-6508a739f4a2) ⚠️ Your test account
9. im.csstrike3@gmail.com           (f1afc319-951e-465a-b951-6c4425a9b3f0)
10. im.csstrike4@gmail.com          (63478ae4-b6d8-4e30-9c9a-ad0beb364cab)
11. im.csstrike2@gmail.com          (f6fd3f06-567a-4c55-a36c-044a22f8b8c5)
12. im.cstrike1@gmail.com           (3f8c47ea-df2d-4a5d-b9b8-9a021d837dd2)
13. myworkxpace@gmail.com           (5742f770-cfbb-488b-8615-232b39897343)
```

### **Admin Accounts to KEEP** ✅:
```
1. dev.salehahmed@gmail.com (super-admin) - Dev Saleh Ahmed
2. admin@zova.com (admin) - Admin Zova
3. gyles@admin.com (admin) - Gyles Admin
```

---

## ⚠️ Why This Happened

### **Your Previous Cleanup** (Ultimate Clean Slate Migration):
```sql
-- You deleted profiles from public.profiles
DELETE FROM profiles WHERE role NOT IN ('admin', 'super-admin');
-- Result: 12 non-admin profiles deleted ✅
```

### **What Was Missed**:
```sql
-- Auth users in auth.users schema were NOT deleted ❌
-- Supabase auth.users is separate from public.profiles
-- Result: 13 orphaned auth accounts still exist
```

**Impact**:
- ❌ Orphaned auth users can still log in (but get errors because no profile)
- ❌ Clutters auth dashboard
- ❌ Potential security issue (zombie accounts)
- ❌ Not a true "clean slate"

---

## 🔧 Solution: Delete Orphaned Auth Users

### **Method 1: Via Supabase Dashboard** (Recommended - Manual but Safe)

#### **Step 1**: Navigate to Auth Users
```
URL: https://supabase.com/dashboard/project/wezgwqqdlwybadtvripr/auth/users
```

#### **Step 2**: Identify Orphaned Users
Look for users **WITHOUT** profile data (no role, no name)

#### **Step 3**: Delete Each Orphaned User
1. Click on user email
2. Click "Delete User" button
3. Confirm deletion
4. Repeat for all 13 orphaned users

**Time**: ~5 minutes (13 users × 20 seconds each)

---

### **Method 2: Via SQL** (Faster but Requires Caution)

⚠️ **WARNING**: This deletes auth users permanently. Cannot be undone!

#### **Step 1: Verify Query (Safe - Read Only)**
```sql
-- Preview which auth users will be deleted
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE 
    WHEN p.id IS NULL THEN 'WILL BE DELETED'
    WHEN p.role IN ('admin', 'super-admin') THEN 'KEEP (ADMIN)'
    ELSE 'KEEP (HAS PROFILE)'
  END as action
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY 
  CASE 
    WHEN p.id IS NULL THEN 1
    ELSE 2
  END,
  au.created_at DESC;
```

**Expected Result**: Should show 13 users marked "WILL BE DELETED"

---

#### **Step 2: Delete Orphaned Auth Users (DESTRUCTIVE)**

⚠️ **CRITICAL**: Run this ONLY if Step 1 results look correct!

```sql
-- Delete auth users that don't have matching profiles
DELETE FROM auth.users
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL
);

-- Verify deletion count
-- Expected: 13 rows deleted
```

---

#### **Step 3: Verify Final State**
```sql
-- Should show only 3 admin users remaining
SELECT 
  au.id,
  au.email,
  p.role,
  p.first_name,
  p.last_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at ASC;
```

**Expected Result**:
```
Total auth users: 3
1. dev.salehahmed@gmail.com - super-admin - Dev Saleh Ahmed
2. admin@zova.com - admin - Admin Zova
3. gyles@admin.com - admin - Gyles Admin
```

---

### **Method 3: Via Supabase Management API** (Programmatic)

If you have Supabase Management API access:

```bash
# Get your service role key first
SERVICE_ROLE_KEY="your_supabase_service_role_key"
PROJECT_REF="wezgwqqdlwybadtvripr"

# Delete each orphaned user by ID
curl -X DELETE \
  "https://${PROJECT_REF}.supabase.co/auth/v1/admin/users/028d75ea-5725-4267-81dc-f6186bbc54cb" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"

# Repeat for all 13 orphaned user IDs
```

---

## 🎯 Recommended Approach

### **My Recommendation**: Use **Method 1 (Dashboard)**

**Why**:
- ✅ Visual confirmation (see exactly what you're deleting)
- ✅ Safe (delete one at a time)
- ✅ No SQL errors possible
- ✅ Built-in confirmation dialogs
- ⚠️ Slightly slower (5 minutes vs 30 seconds)

**When to use Method 2 (SQL)**:
- ✅ You're comfortable with SQL
- ✅ You've verified the preview query results
- ✅ You want to delete all 13 at once
- ⚠️ Risk: If query is wrong, could delete admins (BACKUP FIRST!)

---

## 📋 Step-by-Step: Dashboard Method (Safest)

### **Step 1: Open Auth Users**
```
https://supabase.com/dashboard/project/wezgwqqdlwybadtvripr/auth/users
```

### **Step 2: Filter or Search**
- Use search box to find orphaned users
- Or scroll through list (only 16 users)

### **Step 3: Identify Admin Accounts to KEEP**
**DO NOT DELETE THESE**:
- ✅ dev.salehahmed@gmail.com (super-admin)
- ✅ admin@zova.com (admin)
- ✅ gyles@admin.com (admin)

### **Step 4: Delete Orphaned Users One by One**

**Delete these 13 users**:
1. Click on: **pimemog974@gamegta.com**
   - Click "Delete User"
   - Confirm

2. Click on: **wawayow281@ampdial.com**
   - Click "Delete User"
   - Confirm

3. Click on: **focepi1107@ampdial.com**
   - Click "Delete User"
   - Confirm

4. Click on: **veleje2541@aiwanlab.com**
   - Click "Delete User"
   - Confirm

5. Click on: **sameerstg@outlook.com**
   - Click "Delete User"
   - Confirm

6. Click on: **slm.ahmed1010@gmail.com**
   - Click "Delete User"
   - Confirm

7. Click on: **lm.ahmed1010@gmail.com**
   - Click "Delete User"
   - Confirm

8. ⚠️ Click on: **artinsane00@gmail.com** (Your test account)
   - Click "Delete User"
   - Confirm

9. Click on: **im.csstrike3@gmail.com**
   - Click "Delete User"
   - Confirm

10. Click on: **im.csstrike4@gmail.com**
    - Click "Delete User"
    - Confirm

11. Click on: **im.csstrike2@gmail.com**
    - Click "Delete User"
    - Confirm

12. Click on: **im.cstrike1@gmail.com**
    - Click "Delete User"
    - Confirm

13. Click on: **myworkxpace@gmail.com**
    - Click "Delete User"
    - Confirm

### **Step 5: Verify Final State**
- Refresh page
- Should show **only 3 users**:
  1. dev.salehahmed@gmail.com
  2. admin@zova.com
  3. gyles@admin.com

---

## ✅ Verification After Cleanup

### **Check 1: Auth Users Count**
```sql
SELECT COUNT(*) as total_auth_users
FROM auth.users;
-- Expected: 3
```

### **Check 2: All Auth Users Have Profiles**
```sql
SELECT 
  COUNT(*) as users_without_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
-- Expected: 0 (no orphaned users)
```

### **Check 3: Admin Accounts Intact**
```sql
SELECT 
  au.email,
  p.role,
  p.first_name || ' ' || p.last_name as full_name
FROM auth.users au
INNER JOIN public.profiles p ON au.id = p.id
WHERE p.role IN ('admin', 'super-admin')
ORDER BY p.role DESC;
-- Expected: 3 rows (1 super-admin, 2 admins)
```

---

## 📊 Before vs After

### **Before Cleanup**:
```
Auth Users:        16 total
├── Admins:        3 (with profiles) ✅
└── Orphaned:      13 (no profiles) ❌

Database:
├── Profiles:      3 (admins only) ✅
└── Auth Users:    16 (13 orphaned) ❌

Status:            ❌ NOT CLEAN
```

### **After Cleanup**:
```
Auth Users:        3 total
└── Admins:        3 (with profiles) ✅

Database:
├── Profiles:      3 (admins only) ✅
└── Auth Users:    3 (all have profiles) ✅

Status:            ✅ COMPLETELY CLEAN!
```

---

## 🚨 Important Notes

### **About artinsane00@gmail.com**:
This appears to be your test provider account. It's orphaned (no profile), so it will be deleted. If you need this account:
- **Option 1**: Delete it now, create fresh test account later
- **Option 2**: Keep it (but it's orphaned and won't work anyway)

**Recommendation**: Delete it. You'll create proper test accounts during Phase 2 testing.

---

### **Why Auth Users Weren't Auto-Deleted**:

Supabase **does NOT** cascade delete auth users when you delete profiles because:
1. Auth (`auth.users`) and Profiles (`public.profiles`) are separate schemas
2. No foreign key constraint from auth → profiles
3. Designed to prevent accidental auth deletion
4. Manual cleanup required (what we're doing now)

**This is intentional Supabase behavior for safety!**

---

## 🔄 Future Prevention

### **When Deleting Profiles in Future**:

Always delete in this order:
```sql
-- Step 1: Identify user IDs to delete
WITH users_to_delete AS (
  SELECT id FROM profiles WHERE role = 'customer' AND email LIKE '%test%'
)

-- Step 2: Delete from auth.users FIRST (if you have permission)
DELETE FROM auth.users
WHERE id IN (SELECT id FROM users_to_delete);

-- Step 3: Then delete from profiles
DELETE FROM profiles
WHERE id IN (SELECT id FROM users_to_delete);
```

**Or** (if no auth.users permission):
1. Delete profiles via SQL
2. Manually delete auth users via Dashboard
3. Much safer!

---

## 🎯 Your Action Plan

### **Immediate (Next 5 Minutes)**:
1. Open: https://supabase.com/dashboard/project/wezgwqqdlwybadtvripr/auth/users
2. Delete 13 orphaned users (one by one via Dashboard)
3. Verify: Only 3 admin users remain

### **Then Continue Phase 2**:
- ✅ Database: Clean (3 profiles, 0 test data)
- ✅ Auth: Clean (3 users, 0 orphans) ← After you delete
- ✅ Functions: Clean (27 production, 0 legacy)
- ⏳ Stripe: Configure branding (next step)

**Total cleanup time**: 5 minutes  
**Then back to**: Stripe branding → Production launch

---

## 📝 Cleanup Checklist

### **Pre-Cleanup**:
- [ ] Opened Supabase Auth Users dashboard
- [ ] Identified 13 orphaned users
- [ ] Confirmed 3 admin users to KEEP
- [ ] Ready to delete orphaned users

### **During Cleanup**:
- [ ] Deleted: pimemog974@gamegta.com
- [ ] Deleted: wawayow281@ampdial.com
- [ ] Deleted: focepi1107@ampdial.com
- [ ] Deleted: veleje2541@aiwanlab.com
- [ ] Deleted: sameerstg@outlook.com
- [ ] Deleted: slm.ahmed1010@gmail.com
- [ ] Deleted: lm.ahmed1010@gmail.com
- [ ] Deleted: artinsane00@gmail.com
- [ ] Deleted: im.csstrike3@gmail.com
- [ ] Deleted: im.csstrike4@gmail.com
- [ ] Deleted: im.csstrike2@gmail.com
- [ ] Deleted: im.cstrike1@gmail.com
- [ ] Deleted: myworkxpace@gmail.com

### **Post-Cleanup Verification**:
- [ ] Refreshed Auth Users page
- [ ] Count shows: 3 users only
- [ ] Verified: dev.salehahmed@gmail.com present
- [ ] Verified: admin@zova.com present
- [ ] Verified: gyles@admin.com present
- [ ] Ran SQL verification queries (all pass)

---

## ✅ Summary

**Problem**: 13 orphaned auth users exist without profiles  
**Solution**: Delete via Dashboard (safest method)  
**Time**: 5 minutes  
**Result**: True clean slate - 3 admins only  

**After this cleanup**:
- ✅ Database: 3 profiles (admins)
- ✅ Auth: 3 users (matching profiles)
- ✅ Edge Functions: 27 production
- ✅ Stripe: Ready for configuration

**You'll have a PERFECT clean slate! 🎉**

---

**Open the dashboard and start deleting those 13 orphaned users! Let me know when done!** 🚀
