# Authentication Architecture Fix

## 🔴 Critical Bug Identified

**Issue**: User `artinsane00@gmail.com` was logged in as a provider but routed to `/customer` dashboard.

### Root Cause Analysis

1. **Database Inconsistency**: 
   - `profiles.role` was set to `"customer"` ❌
   - `provider_onboarding_progress` table existed with `verification_status: "pending"` ✅
   - This mismatch caused routing to wrong dashboard

2. **Auth Flow Problem**:
   - When provider registers, the `handle_new_user` trigger should set `role: 'provider'` from `raw_user_meta_data`
   - BUT: The registration was completed before fixing the trigger, so role remained as default `'customer'`
   - **Auth listener** (`useAuthListener`) fetches `profiles.role` on login and sets `userRole` in app store
   - **Navigation logic** (`useAuthNavigation`) routes based on `userRole` from app store
   - **Result**: Provider user has wrong role → routed to customer dashboard

### Database Fix Applied

```sql
-- ✅ Fixed the role mismatch
UPDATE profiles 
SET role = 'provider'
WHERE id = 'c7fa7484-9609-49d1-af95-6508a739f4a2';
```

**Verification**:
```
Before: role = "customer"
After:  role = "provider" ✅
```

## Architecture Improvements Needed

### 1. Add Role Consistency Check

Create a database function to validate role consistency:

```sql
CREATE OR REPLACE FUNCTION check_provider_role_consistency()
RETURNS TABLE (
  user_id uuid,
  email text,
  current_role user_role,
  should_be_role user_role,
  has_provider_progress boolean,
  fix_sql text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.role,
    'provider'::user_role as should_be_role,
    true as has_provider_progress,
    format('UPDATE profiles SET role = ''provider'' WHERE id = ''%s'';', p.id) as fix_sql
  FROM profiles p
  INNER JOIN provider_onboarding_progress pop ON p.id = pop.provider_id
  WHERE p.role != 'provider';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Create Migration to Fix All Inconsistent Roles

```sql
-- Migration: fix_provider_role_inconsistencies.sql
DO $$
DECLARE
  fixed_count integer := 0;
BEGIN
  -- Update all profiles that have provider_onboarding_progress but wrong role
  WITH updates AS (
    UPDATE profiles p
    SET role = 'provider'
    FROM provider_onboarding_progress pop
    WHERE p.id = pop.provider_id
      AND p.role != 'provider'
    RETURNING p.id
  )
  SELECT COUNT(*) INTO fixed_count FROM updates;
  
  RAISE NOTICE 'Fixed % provider role inconsistencies', fixed_count;
END $$;
```

### 3. Improve Auth Listener Logic

Add a **role verification step** after fetching profile:

```typescript
// In useAuthListener.ts
const profile = await getUserProfile(session.user.id);

// ✅ ADD: Verify role consistency for providers
if (profile && profile.role === 'customer') {
  // Check if user has provider_onboarding_progress
  const { data: providerProgress } = await supabase
    .from('provider_onboarding_progress')
    .select('provider_id')
    .eq('provider_id', session.user.id)
    .maybeSingle();
  
  if (providerProgress) {
    console.warn('[AuthListener] Role mismatch detected - updating profile role to provider');
    // Fix the role in database
    await supabase
      .from('profiles')
      .update({ role: 'provider' })
      .eq('id', session.user.id);
    
    // Update local state
    setAuthenticated(true, 'provider');
    return;
  }
}

// Continue with existing logic
setAuthenticated(true, profile.role);
```

### 4. Add Provider Registration Validation

Ensure registration flow sets role correctly:

```typescript
// In register.tsx - after successful signup
if (userData.role === 'provider') {
  // Verify role was set correctly
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'provider') {
    console.error('[Register] Role mismatch detected, fixing...');
    await supabase
      .from('profiles')
      .update({ role: 'provider' })
      .eq('id', user.id);
  }
}
```

## Testing Checklist

- [x] Fix immediate issue (database role update)
- [ ] Apply migration to fix all inconsistent roles
- [ ] Add role consistency check function
- [ ] Improve auth listener with role verification
- [ ] Add validation in registration flow
- [ ] Test provider registration flow end-to-end
- [ ] Test provider login flow with correct routing
- [ ] Test customer registration (ensure no regression)
- [ ] Add integration tests for role consistency

## Files Modified

1. **Database**: 
   - `profiles` table (role column for artinsane00@gmail.com)

2. **Pending Changes**:
   - `useAuthListener.ts` - Add role verification logic
   - `register.tsx` - Add role validation after signup
   - Migration file - Fix all inconsistent roles
   - Database function - Role consistency checker

## Key Learnings

1. **Always validate critical state** (like user role) across multiple data sources
2. **Database triggers** need proper testing during registration
3. **Role consistency** should be checked on every login, not just registration
4. **Migration scripts** should fix historical data issues
5. **Defensive programming** - don't trust that database state is always consistent
