# Selfie Verification Database Fix

## Issue Summary
**Error**: `PGRST204 - Could not find the 'selfie_verification_url' column of 'profiles' in the schema cache`

**Location**: `src/app/(provider-verification)/selfie.tsx`

**Root Cause**: The `profiles` table was missing the `selfie_verification_url` column needed to store selfie verification images.

## Solution Applied

### Database Migration
Created migration: `add_selfie_verification_url_to_profiles`

```sql
-- Add selfie_verification_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS selfie_verification_url TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN profiles.selfie_verification_url IS 'Signed URL to the selfie image used for identity verification';

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_selfie_verification_url 
ON profiles(selfie_verification_url) 
WHERE selfie_verification_url IS NOT NULL;
```

### Migration Details
- **Column**: `selfie_verification_url`
- **Type**: `TEXT`
- **Nullable**: `YES` (allows null for users who haven't uploaded yet)
- **Purpose**: Store signed URLs to selfie images in Supabase Storage
- **Index**: Created partial index for faster lookups when selfie exists

## RLS Policies
Existing RLS policies on `profiles` table already handle the new column:
- ✅ **"Users can update their own profile"** - Allows providers to update their `selfie_verification_url`
- ✅ **"Users can view their own profile"** - Allows providers to read their own selfie URL
- ✅ **"service_role_full_access"** - Allows server-side operations

No additional RLS policies needed.

## Code Flow (selfie.tsx)

### Upload Process
1. **Capture selfie** → `ImagePicker.launchCameraAsync()`
2. **Upload to storage** → `storageService.uploadSelfie(uri)`
3. **Get signed URL** → `storageService.getSignedUrl(filePath)`
4. **Save to profiles** → Update `selfie_verification_url` column
5. **Update store** → `updateSelfieData({ selfieUrl: signedUrl })`

### Fetch Process
1. **Query profiles table** → Check for existing `selfie_verification_url`
2. **Extract file path** → `StoragePathUtils.extractFilePathFromUrl()`
3. **Get fresh signed URL** → Prevent expired URL issues
4. **Display in UI** → Show selfie preview to user

## Testing Checklist
- [x] Database column added successfully
- [x] Migration applied without errors
- [x] Index created for performance
- [ ] Test selfie upload flow
- [ ] Test selfie retrieval after logout/login
- [ ] Verify signed URL refresh works
- [ ] Test on both Android and iOS

## Storage Structure
```
verification-images/
└── providers/
    └── {provider_id}/
        └── selfie/
            └── selfie_{timestamp}.jpeg
```

## Related Files
- **Database**: `profiles` table, `selfie_verification_url` column
- **Frontend**: `src/app/(provider-verification)/selfie.tsx`
- **Store**: `src/stores/verification/provider-verification.ts`
- **Storage**: `src/lib/storage/organized-storage.ts`
- **Utils**: `src/lib/storage/storage-paths.ts`

## Next Steps
1. ✅ **Database migration applied**
2. 🔄 **Restart Metro bundler** to clear schema cache
3. 🔄 **Test selfie upload** on device
4. 🔄 **Verify data persistence** after logout/login
5. ⏭️ **Proceed to business information step** (Step 3)

## Success Criteria
✅ Selfie upload completes without database errors  
✅ Selfie URL saved to `profiles.selfie_verification_url`  
✅ Selfie displays correctly after re-login  
✅ Navigation proceeds to Step 3 (business information)  

---

**Migration Applied**: ${new Date().toISOString()}  
**Status**: ✅ Ready for testing
