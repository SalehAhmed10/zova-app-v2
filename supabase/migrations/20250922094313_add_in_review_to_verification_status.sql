-- Add 'in_review' to verification_status enum
-- Note: PostgreSQL doesn't support direct ALTER ENUM ADD VALUE in a transaction
-- So we need to use a more complex approach

-- First, rename the existing enum
ALTER TYPE verification_status RENAME TO verification_status_old;

-- Create the new enum with the additional value
CREATE TYPE verification_status AS ENUM ('pending', 'in_review', 'approved', 'rejected');

-- Update the table to use the new enum
ALTER TABLE profiles ALTER COLUMN verification_status TYPE verification_status USING verification_status::text::verification_status;

-- Drop the old enum
DROP TYPE verification_status_old;