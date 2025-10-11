# ZOVA Supabase Database Documentation

## Overview
ZOVA is a modern Expo React Native application that connects users with trusted service providers in an Uber-style experience. This document provides comprehensive documentation of the Supabase database setup, including all tables, functions, secrets, and their purposes.

## Database Schema

### Core Tables (39 total)

#### User Management
- **profiles** (11 rows): User profiles with role-based access (customer/provider/admin). Contains personal info, business details, coordinates for location-based services, verification status, and subscription flags.
- **notification_settings**: User preferences for push/email notifications
- **user_addresses**: Multiple addresses per user with default address management

#### Service Management
- **service_categories** (2 rows): Top-level service categories (e.g., "Home Services", "Professional Services")
- **service_subcategories**: Subcategories under main categories
- **provider_services** (8 rows): Individual services offered by providers with pricing, availability, and SOS booking options

#### Booking System
- **bookings** (16 rows): Service booking records with status tracking, payment integration, and provider response deadlines
- **booking_attachments**: Files/images attached to bookings
- **booking_messages**: Communication between customers and providers

#### Payment System
- **payments** (9 rows): Stripe payment records with status tracking
- **payment_intents**: Stripe payment intent management with expiration cleanup
- **provider_payouts**: Automated payout processing for completed services

#### Review & Rating System
- **reviews** (4 rows): Customer reviews with ratings and optional anonymity
- **review_responses**: Provider responses to reviews

#### Provider Verification
- **provider_verification_sessions**: Multi-step verification workflow sessions
- **provider_verification_step_progress**: Progress tracking for verification steps
- **provider_verification_notifications**: Notification system for verification process
- **provider_verification_documents**: Document uploads for verification
- **provider_verification_business_info**: Business information for verification
- **provider_verification_portfolio**: Portfolio images for service verification
- **provider_onboarding_progress**: Overall onboarding progress tracking

#### Communication
- **notifications** (54 rows): In-app notifications with push/email support
- **conversations**: Chat conversations between users
- **conversation_participants**: Users in conversations
- **messages**: Individual messages in conversations

#### Analytics & Tracking
- **profile_views**: Track profile view analytics
- **service_views**: Track service view analytics
- **user_subscriptions**: Subscription management (SOS, Premium)
- **subscription_payments**: Payment records for subscriptions

#### Geographic Features
- **user_locations**: Real-time location tracking for SOS services
- **provider_availability**: Provider availability schedules
- **provider_blackouts**: Unavailable time periods for providers

## Database Functions

### Payment & Booking Functions
- **calculate_booking_amounts**: Calculates platform fees (15%) and total amounts for bookings
- **calculate_deposit_amount**: Calculates deposit amounts based on service settings (default 20%)
- **calculate_platform_fee**: Returns 10% platform fee for services
- **calculate_provider_payout**: Returns 85% payout for providers after platform fee
- **calculate_provider_rating**: Calculates average rating from reviews
- **create_provider_payout**: Trigger function to create payout records when bookings complete
- **handle_booking_completion**: Updates payout status when bookings are completed
- **process_pending_payouts**: Retrieves payouts ready for processing
- **update_booking_amounts**: Updated trigger for booking amount calculations

### Notification Functions
- **create_booking_notification**: Creates notifications for booking status changes
- **create_default_notification_settings**: Creates default notification preferences for new users
- **create_notification_secure**: Secure notification creation with proper validation
- **create_verification_notification**: Creates notifications for verification process

### Provider Search & Discovery
- **get_providers_with_coordinates**: Main provider search function with location filtering, service categories, price ranges, and coordinate-based distance calculations
- **get_nearby_sos_providers**: Finds providers offering SOS services within distance radius
- **fetch_profiles_for_app**: Retrieves basic profile information for app display

### Verification & Onboarding
- **acquire_step_lock**: Manages concurrent access to verification steps
- **release_step_lock**: Releases verification step locks
- **cleanup_expired_step_locks**: Removes expired verification step locks
- **cleanup_expired_verification_sessions**: Cleans up expired verification sessions
- **is_step_locked_by_other_session**: Checks if verification step is locked by another session
- **update_onboarding_session_activity**: Updates onboarding session activity timestamps
- **update_verification_session_activity**: Updates verification session activity
- **update_stripe_validation_status**: Updates Stripe account validation status
- **increment_cross_device_access**: Tracks cross-device access for security

### Utility Functions
- **can_view_customer_in_reviews**: Checks if customer can be viewed in reviews (non-anonymous)
- **cleanup_expired_payment_intents**: Cleans up expired Stripe payment intents
- **ensure_single_default_address**: Ensures only one default address per user
- **get_current_user_role**: Retrieves user role from JWT
- **get_customers_with_booking_stats**: Gets customer list with booking statistics
- **get_portfolio_signed_urls**: Generates signed URLs for portfolio images
- **get_provider_total_bookings**: Counts total completed bookings for provider
- **handle_new_user**: Trigger function for new user profile creation
- **mark_notification_read**: Marks verification notifications as read
- **mark_notification_sent**: Marks verification notifications as sent
- **set_booking_response_deadline**: Sets 24-hour response deadline for bookings
- **set_updated_at**: Generic updated_at timestamp trigger
- **update_profile_subscription_status**: Updates subscription status flags on profiles
- **update_updated_at**: Updated_at trigger (multiple variants)
- **update_updated_at_column**: Updated_at trigger for specific columns
- **update_updated_at_zova**: ZOVA-specific updated_at trigger

## Edge Functions (Supabase)

### Payment Processing
- **stripe-webhook**: Handles Stripe webhook events for payment processing
- **stripe-webhooks-enhanced**: Enhanced webhook processing with better error handling
- **stripe-webhooks-subscription**: Handles subscription-related webhook events
- **create-payment-intent**: Creates Stripe payment intents for bookings
- **capture-deposit**: Captures deposit payments for bookings
- **capture-remaining-payment**: Captures remaining payment after service completion
- **debug-payment**: Debug utility for payment issues

### Booking Management
- **create-booking**: Creates new service bookings
- **accept-booking**: Provider accepts booking requests
- **decline-booking**: Provider declines booking requests
- **complete-service**: Marks services as completed
- **submit-provider-response**: Handles provider responses to booking requests
- **create-sos-booking**: Creates emergency SOS service bookings

### Subscription Management
- **create-subscription**: Creates new user subscriptions
- **cancel-subscription**: Cancels active subscriptions
- **reactivate-subscription**: Reactivates cancelled subscriptions
- **stripe-redirect**: Handles Stripe redirect URLs for subscription flows

### Provider Management
- **create-stripe-account**: Creates Stripe Connect accounts for providers
- **check-stripe-account-status**: Verifies Stripe account status
- **manage-services**: Provider service management
- **get-provider-availability**: Retrieves provider availability schedules
- **get-provider-blackouts**: Gets provider unavailable time periods
- **get-provider-schedule**: Retrieves provider scheduling information

### Search & Discovery
- **smart-provider-search**: Advanced provider search with filters
- **find-sos-providers**: Finds providers for SOS services

### Review System
- **submit-review**: Handles customer review submissions

### Administrative
- **get-booking-customers**: Retrieves customer information for bookings
- **seed-categories**: Seeds initial service categories and subcategories

## Secrets & API Keys

### Supabase Configuration
- **SUPABASE_URL**: Supabase project URL for API access
- **SUPABASE_ANON_KEY**: Anonymous/public API key for client-side operations
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key for server-side operations with elevated permissions

### Stripe Integration
- **STRIPE_PUBLISHABLE_KEY**: Stripe publishable key for client-side payment processing
- **STRIPE_SECRET_KEY**: Stripe secret key for server-side payment processing
- **STRIPE_WEBHOOK_SECRET**: Webhook secret for verifying Stripe webhook authenticity

### External Services
- **OPENSTREETMAP_NOMINATIM_API**: OpenStreetMap Nominatim API for geocoding services (no key required)
- **COUNTRY_STATE_CITY_API**: External API for geographic data validation (if used)

## Database Relationships

### Core Relationships
- **profiles** → **provider_services** (one-to-many): Providers offer multiple services
- **provider_services** → **service_subcategories** → **service_categories** (many-to-one): Hierarchical service categorization
- **profiles** → **bookings** (one-to-many): Users create bookings
- **bookings** → **payments** (one-to-one): Each booking has a payment
- **bookings** → **provider_payouts** (one-to-one): Successful bookings generate payouts
- **bookings** → **reviews** (one-to-many): Customers can review completed services
- **profiles** → **notifications** (one-to-many): Users receive notifications
- **profiles** → **user_subscriptions** (one-to-many): Users can have multiple subscriptions

### Verification Workflow
- **profiles** → **provider_verification_sessions** (one-to-many): Providers go through verification
- **provider_verification_sessions** → **provider_verification_step_progress** (one-to-many): Multi-step verification process
- **provider_verification_sessions** → **provider_verification_notifications** (one-to-many): Verification notifications

### Communication
- **profiles** → **conversations** → **messages** (many-to-many through conversation_participants): User messaging system

## Security Features

### Row Level Security (RLS)
- All tables implement RLS policies
- Users can only access their own data or data they're authorized to view
- Providers can view their bookings, customers, and reviews
- Customers can view their bookings and provider information

### JWT Verification
- Most edge functions disable JWT verification for better error handling
- Payment functions handle authentication manually
- Webhook functions skip JWT for Stripe processing

### Data Validation
- Geographic coordinates validated using PostGIS
- Payment amounts validated before Stripe processing
- User roles enforced at database level
- Verification steps locked to prevent concurrent access

## Performance Optimizations

### Indexing
- Geographic indexes on coordinates using PostGIS
- Composite indexes on frequently queried columns
- Partial indexes for active records

### Query Optimization
- Provider search uses efficient distance calculations
- Pagination implemented on large result sets
- Background cleanup functions for expired data

### Caching Strategy
- React Query used for client-side caching
- Supabase real-time subscriptions for live updates
- Notification caching for performance

## Monitoring & Maintenance

### Cleanup Functions
- **cleanup_expired_payment_intents**: Removes expired payment intents (30min timeout)
- **cleanup_expired_step_locks**: Removes expired verification step locks
- **cleanup_expired_verification_sessions**: Cleans up inactive verification sessions (24hr timeout)

### Analytics
- Profile and service view tracking
- Booking statistics and revenue tracking
- User subscription analytics

### Error Handling
- Comprehensive logging in edge functions
- Payment error tracking and recovery
- Verification process error handling

## Development Notes

### Migration History
- Database uses Supabase migrations for version control
- Recent migrations include provider search functions and coordinate handling
- Verification status defaults and provider onboarding improvements

### Testing
- Payment flows tested with Stripe test mode
- Geocoding validated with international addresses
- Provider search tested with coordinate-based filtering

### Deployment
- Edge functions deployed automatically via Supabase CLI
- Database migrations applied in order
- Environment-specific configuration management

This documentation provides a complete overview of the ZOVA Supabase database architecture, enabling developers to understand the system components and their interactions for effective development and maintenance.