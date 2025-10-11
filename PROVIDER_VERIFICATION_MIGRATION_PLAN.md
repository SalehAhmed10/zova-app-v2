# Provider Verification Status Migration Plan

## Overview
This document outlines the plan to move `verification_status` from the `profiles` table to a dedicated `provider_verification_status` table. This improves data integrity by ensuring verification status only exists for providers.

## Current State
- `verification_status` field exists in `profiles` table for all users
- Only providers functionally use this field
- Customers should always have `null` verification status
- Field is used for provider filtering in search and SOS functions

## Proposed Schema Changes

### New Table: `provider_verification_status`
```sql
CREATE TABLE public.provider_verification_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status verification_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(provider_id),
  CONSTRAINT provider_verification_status_provider_check
    CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = provider_id AND role = 'provider'))
);
```

### Benefits
1. **Data Integrity**: Verification status only exists for providers
2. **Better Tracking**: Separate timestamps for submission/review
3. **Audit Trail**: Track who reviewed and when
4. **Rejection Reasons**: Store detailed rejection feedback
5. **Notes**: Admin notes for verification decisions

## Migration Steps

### Phase 1: Create New Table
1. Create `provider_verification_status` table
2. Migrate existing provider verification statuses
3. Create backward compatibility view

### Phase 2: Update Application Code
1. Update customer provider search hooks
2. Update SOS provider search function
3. Update admin verification management
4. Update provider verification UI

### Phase 3: Remove Old Column
1. Drop `verification_status` from `profiles` table
2. Remove backward compatibility view
3. Update TypeScript types

## Code Changes Required

### Customer Provider Search
```typescript
// OLD: Filter on profiles.verification_status
.from('profiles')
.eq('verification_status', 'approved')

// NEW: Join with provider_verification_status
.from('profiles')
.select('*, provider_verification_status!inner(status)')
.eq('provider_verification_status.status', 'approved')
```

### SOS Provider Function
```typescript
// OLD: Direct field access
.eq('verification_status', 'approved')

// NEW: Join with verification table
.select('*, provider_verification_status!inner(status)')
.eq('provider_verification_status.status', 'approved')
```

### Admin Verification Management
```typescript
// NEW: Dedicated table operations
const { data, error } = await supabase
  .from('provider_verification_status')
  .upsert({
    provider_id: providerId,
    status: newStatus,
    reviewed_by: adminId,
    rejection_reason: reason,
    notes: adminNotes
  });
```

## Testing Strategy

### Unit Tests
- Verify provider search returns only approved providers
- Verify SOS search filters correctly
- Verify admin status updates work

### Integration Tests
- End-to-end provider verification flow
- Customer provider discovery
- Admin verification management

### Data Migration Tests
- Verify all existing provider statuses migrated
- Verify no data loss
- Verify RLS policies work correctly

## Rollback Plan
1. Restore `verification_status` column to `profiles`
2. Migrate data back from `provider_verification_status`
3. Drop new table
4. Revert application code changes

## Benefits After Migration
- **Cleaner Schema**: Verification status properly scoped to providers
- **Better Performance**: Smaller indexes, more targeted queries
- **Enhanced Tracking**: Detailed audit trail for verification decisions
- **Improved Security**: RLS policies specific to provider verification
- **Future-Proof**: Easy to extend with additional verification metadata

## Implementation Timeline
1. **Week 1**: Create new table and migrate data
2. **Week 2**: Update application code and test
3. **Week 3**: Remove old column and final testing
4. **Week 4**: Deploy to production with monitoring