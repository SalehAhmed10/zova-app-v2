-- Add terms-related fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deposit_percentage numeric,
ADD COLUMN IF NOT EXISTS cancellation_fee_percentage numeric,
ADD COLUMN IF NOT EXISTS cancellation_policy text;