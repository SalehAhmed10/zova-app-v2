-- Drop the confusing provider_availability table
-- It was designed for weekly overrides but caused code confusion
-- Weekly overrides can be handled within provider_schedules JSON structure

DROP TABLE IF EXISTS public.provider_availability;