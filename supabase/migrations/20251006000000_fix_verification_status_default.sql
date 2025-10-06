-- Fix verification_status default for new providers
-- This migration ensures new providers start with null verification_status
-- instead of 'approved', allowing them to go through the proper verification flow

-- First, update any existing providers who shouldn't be approved
UPDATE profiles
SET verification_status = null
WHERE role = 'provider'
  AND verification_status = 'approved'
  AND id NOT IN (
    SELECT DISTINCT provider_id
    FROM provider_verification_documents
    WHERE verification_status = 'approved'
  )
  AND id NOT IN (
    SELECT DISTINCT provider_id
    FROM provider_services
  );

-- Update the column default to null (this prevents new providers from getting 'approved' status)
-- Note: This ALTER COLUMN will only affect future inserts, not existing rows
ALTER TABLE profiles
ALTER COLUMN verification_status SET DEFAULT null;

-- Add a comment to document this change
COMMENT ON COLUMN profiles.verification_status IS 'Verification status: null (not started), pending, in_review, approved, rejected';