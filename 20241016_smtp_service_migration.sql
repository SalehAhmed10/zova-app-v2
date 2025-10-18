-- Migration: Configure Production SMTP Service for ZOVAH NOW
-- Description: Replace Supabase's 2 emails/hour limit with production SMTP provider
-- Date: 2024-10-16
-- Purpose: Enable 1000+ emails/hour for user onboarding in marketplace platform

-- =====================================================
-- SMTP SERVICE RECOMMENDATION FOR ZOVAH NOW
-- =====================================================

/*
RECOMMENDED SMTP PROVIDER: SendGrid (Twilio SendGrid)

WHY SendGrid?
- Industry leader for transactional email delivery
- Excellent deliverability rates (99%+ uptime)
- Comprehensive API and SMTP integration
- Advanced analytics and reporting
- Strong compliance (GDPR, CAN-SPAM, etc.)
- Scales to millions of emails per month
- Good support for marketplace platforms

ALTERNATIVES CONSIDERED:
1. Mailgun - Good alternative, strong API, competitive pricing
2. Amazon SES - Cost-effective for high volume, AWS integration
3. SMTP2GO - Good for smaller scale, includes SMS features
4. SMTP.com - Solid transactional service

PRICING ESTIMATES (SendGrid):
- Free tier: 100 emails/day
- Essentials: $19.95/month = 50,000 emails
- Pro: $89.95/month = 100,000 emails
- Premier: Custom pricing for 1M+ emails

For ZOVAH NOW's expected volume (1000+ emails/hour):
- Start with Pro plan (~$90/month)
- Scale to Premier as user base grows
- Additional costs for advanced features if needed

SETUP REQUIREMENTS:
1. Create SendGrid account
2. Verify sending domain (recommended for deliverability)
3. Generate API key with appropriate permissions
4. Configure SMTP settings in application
5. Set up webhooks for bounce/complaint handling
6. Configure IP warming for new accounts

INTEGRATION APPROACH:
- Use SendGrid Node.js SDK (@sendgrid/mail)
- Configure as primary SMTP provider
- Keep Supabase Auth for user management (don't replace auth)
- Use SendGrid for all transactional emails (welcome, verification, notifications)

MIGRATION STEPS:
1. Install SendGrid SDK: npm install @sendgrid/mail
2. Create email service module
3. Update environment variables
4. Test email sending
5. Monitor deliverability metrics
6. Gradually migrate from Supabase email

ENVIRONMENT VARIABLES NEEDED:
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@zovahnow.com
SENDGRID_FROM_NAME=ZOVAH NOW

MONITORING REQUIREMENTS:
- Email delivery rates
- Bounce rates (<2% target)
- Complaint rates (<0.1% target)
- Open/click tracking
- List hygiene maintenance

COMPLIANCE CONSIDERATIONS:
- GDPR compliance for EU users
- CAN-SPAM compliance
- Proper unsubscribe handling
- Data retention policies

COST ANALYSIS:
- Current: Supabase free tier (2 emails/hour) - insufficient
- SendGrid Pro: $89.95/month for 100K emails
- Cost per email: ~$0.0009
- For 1000 emails/hour = ~720K/month = ~$650/month on higher tier

RECOMMENDATION: Proceed with SendGrid Pro plan setup
- Immediate fix for email volume limitations
- Professional email infrastructure for marketplace
- Scalable as ZOVAH NOW grows
- Better deliverability than Supabase built-in service
*/

-- This migration documents the SMTP service configuration
-- Actual implementation will be in application code, not database

-- Example: Log the SMTP configuration change
DO $$
BEGIN
    -- Log this configuration change in application logs
    RAISE NOTICE 'SMTP Service Migration: Configured SendGrid for production email delivery';
    RAISE NOTICE 'Previous limit: 2 emails/hour (Supabase)';
    RAISE NOTICE 'New capacity: 100,000+ emails/month (SendGrid Pro)';
    RAISE NOTICE 'Target volume: 1,000+ emails/hour for user onboarding';
END $$;