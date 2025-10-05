-- Create payouts table to track provider payments
CREATE TABLE public.payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stripe_transfer_id TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'gbp',
    commission_amount INTEGER NOT NULL, -- Commission in cents (10%)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_payouts_booking_id ON public.payouts(booking_id);
CREATE INDEX idx_payouts_provider_id ON public.payouts(provider_id);
CREATE INDEX idx_payouts_status ON public.payouts(status);
CREATE INDEX idx_payouts_created_at ON public.payouts(created_at);

-- Add RLS policies
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Providers can view their own payouts
CREATE POLICY "Providers can view their own payouts" ON public.payouts
    FOR SELECT USING (auth.uid() = provider_id);

-- Admins can view all payouts
CREATE POLICY "Admins can view all payouts" ON public.payouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Add trigger for updated_at
CREATE TRIGGER update_payouts_updated_at
    BEFORE UPDATE ON public.payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();