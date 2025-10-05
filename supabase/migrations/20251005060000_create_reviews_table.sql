-- Create reviews table
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  provider_response TEXT,
  provider_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can view their own reviews
CREATE POLICY "Customers can view their own reviews" ON reviews
  FOR SELECT USING (auth.uid() = customer_id);

-- Customers can create their own reviews
CREATE POLICY "Customers can create their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own reviews (for editing)
CREATE POLICY "Customers can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = customer_id);

-- Providers can view reviews for their services
CREATE POLICY "Providers can view reviews for their services" ON reviews
  FOR SELECT USING (auth.uid() = provider_id);

-- Providers can respond to reviews for their services
CREATE POLICY "Providers can respond to reviews for their services" ON reviews
  FOR UPDATE USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Public can view non-anonymous reviews
CREATE POLICY "Public can view non-anonymous reviews" ON reviews
  FOR SELECT USING (NOT is_anonymous);