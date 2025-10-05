-- Add customer_review_submitted column to bookings table
ALTER TABLE bookings ADD COLUMN customer_review_submitted BOOLEAN DEFAULT FALSE;