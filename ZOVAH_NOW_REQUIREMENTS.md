# Zovah Now - Complete Functionality Requirements

## 📋 Project Overview
Transform ZOVA into **Zovah Now** - a comprehensive service marketplace connecting customers with verified service providers. Phase 1 focuses on perfecting 2 main categories with future expansion planned.

**Key Differentiators:**
- 10% booking fee (competitive rate)
- Mandatory verification for all providers
- SOS Mode for urgent bookings
- Comprehensive service categories
- Real-time availability management

---

## 🔐 A. Authentication & Registration System

### Sign-Up / Log-In Requirements

#### Customer Registration Flow
```
1. Email + Password → 2. Email Verification (OTP) → 3. Profile Complete
```

**Implementation Details:**
- Email validation with OTP
- Profile completion (name, location preferences)
- Phone number verification with SMS OTP (Future Phase)
- Country code selector (Future Phase)

#### Service Provider Registration Flow
```
1. Basic Registration → 2. Identity Verification → 3. Business Setup → 4. Service Listings → 5. Payment Setup
```

**Detailed Provider Onboarding:**

**Step 1: Register & Verify Account**
- Provider personal details (name, email, phone)
- Upload valid passport OR driving licence
- Take live selfie for identity verification
- Quick verification process (< 24 hours)
- Verification badge displayed on profile

**Step 2: Business Information**
- Add business name (marketplace display name)
- Business bio (150 characters max)
- Professional, no vulgar language
- Example: *"Nails by Joe B – Hybrid lash and nail specialist. 5 years experience, helping clients look their best."*

**Step 3: Service Category Selection**
- Select main category from dropdown (2 categories available in Phase 1)
- Select specific service from subcategory dropdown
- Multi-category providers can create separate listings

**Step 4: Service Portfolio**
- Upload up to 5 high-quality images per service
- Image verification (no offensive content)
- Professional work showcase only

**Step 5: Service Terms & Conditions**
- Set deposit amount (20%, 50%, or custom percentage)
- Define cancellation policy and fees
- Toggle house call option availability
- Set service area radius

**Step 6: Multiple Service Listings**
- Providers can list services in different categories
- Example: Joe B → Nail tech listing + MC entertainer listing (separate)
- Each service has independent portfolio and terms

**Step 7: Calendar & Availability**
- Set working hours and days
- Block unavailable periods
- Real-time availability updates

**Step 8: Payment Configuration**
- Add bank details for payouts
- Stripe Connect account setup
- Payment verification

**Step 9: Business Visibility Control**
- Toggle business visibility (take breaks)
- Automatic confirmation vs manual booking approval
- Notification preferences

---

## 🛍️ B. Booking / Buying Process

### For Customers

#### Booking Mode Selection
**Normal Mode (Future Booking):**
- Browse services at leisure
- Book appointments in advance
- Standard search and filtering

**SOS Mode (Urgent/Immediate Booking):**
- Premium feature (£5.99/month subscription)
- Immediate availability search
- Priority provider matching
- Same-day or emergency bookings

#### Service Discovery Flow
```
1. Select Mode → 2. Search Service → 3. Apply Filters → 4. Select Provider → 5. View Profile → 6. Book Service
```

**Search & Filtering Options:**
- **5-star providers only** toggle
- **House call option** (service-dependent)
- **Price range** slider
- **Availability** (today, this week, custom dates)
- **Location radius** (distance from customer)
- **Service type** within category

#### Booking Process

**Normal Mode Booking:**
1. Select provider from search results
2. View provider profile (bio, reviews, images, price list)
3. Choose available date & time from calendar
4. Select exact service (e.g., infills, manicure, pedicure)
5. Add special requests/notes
6. Review booking details and total cost

**SOS Mode Booking:**
1. Define urgent requirement
2. Set maximum budget
3. Preferred time window
4. System matches available providers
5. Auto-confirmation for SOS bookings

#### Payment Flow
1. Booking request sent to provider
2. Provider accepts (auto or manual confirmation)
3. Customer pays deposit (provider-defined percentage)
4. 10% booking fee applied at checkout
5. Booking confirmed once payment processed
6. Remaining balance due on service completion

### For Service Providers

#### Booking Management
```
1. Receive Notification → 2. Review Request → 3. Accept/Decline → 4. Automatic Calendar Update
```

**Booking Request Handling:**
- **Automatic Confirmation:** Instant booking for regular customers
- **Manual Confirmation:** Review each request individually
- **Decline Options:** Unavailable, outside service area, other reasons

**Business Operations:**
- **Visibility Toggle:** Make business invisible during breaks
- **Calendar Management:** Real-time availability updates
- **Booking Analytics:** Track performance metrics (Premium feature)

---

## 💳 C. Payment Methods & Processing

### Accepted Payment Methods
- **Card Payments:** Debit/Credit cards (Visa, Mastercard, Amex)
- **Digital Wallets:** Apple Pay, Google Pay
- **Split Payments:** Multiple payment sources for single booking
- **No Cash Payments:** Digital-only platform

### Payment Structure
```
Service Price: £100
├── Customer Pays: £110 (£100 + £10 booking fee)
├── Platform Takes: £10 (10% commission)
└── Provider Receives: £100 (full service price)
```

**Deposit System:**
- Provider sets deposit percentage (20%, 50%, custom)
- Deposit charged immediately upon booking confirmation
- Remaining balance due on service completion
- Deposit refund policy based on cancellation terms

---

## 🔔 D. Notification System

### Customer Notifications
- **Booking Lifecycle:**
  - Booking request sent
  - Booking confirmed/declined
  - Payment processed
  - Appointment reminder (24h, 2h before)
  - Service completion confirmation
  - Review request

### Service Provider Notifications
- **Business Operations:**
  - New booking requests
  - Booking confirmations
  - Payment received notifications
  - Customer messages
  - Calendar conflicts/updates
  - Performance insights (Premium)

**Notification Channels:**
- Push notifications (primary)
- Email notifications (backup)
- SMS for critical updates (payment, cancellations)

---

## 💰 2. Monetisation Model

### Revenue Streams

#### 1. Transaction Commission (Primary Revenue)
```
10% booking fee on all transactions
Example: £450 bridal makeup → £45 to Zovah Now, £405 to provider
Example: £50 cake order → £5 to Zovah Now, £45 to provider
```

#### 2. Provider Subscriptions
**Basic (Free):**
- List services and receive bookings
- Standard search placement
- Basic profile features

**Freemium (£5.99/month):**
- Priority placement in search results
- Analytics dashboard for business performance
- Advanced profile customization
- Customer insights and trends
- Marketing tools and promotions
- Priority customer support

#### 3. Customer SOS Access
**SOS Mode Subscription (£5.99/month):**
- Access to urgent/immediate bookings
- Priority provider matching
- Same-day service availability
- Emergency booking notifications
- Premium customer support

### Pricing Strategy
- **Competitive 10% commission** (lower than many platforms)
- **Affordable subscriptions** (£5.99/month for both customer and provider tiers)
- **Free basic tier** for providers to encourage adoption
- **Value-added premium features** to drive subscription revenue

---

## 🎯 3. Technical Requirements & Extra Notes

### Search Optimization
**Keyword Matching System:**
- Advanced search algorithm with synonym matching
- Example: "nail tech" matches "manicure", "gel nails", "nail artist"
- Category and service cross-referencing
- Location-based search with radius filtering
- Trending services and popular searches

### Content Standards
**Provider Bios:**
- 150 character limit
- Professional language only
- Automated content moderation
- Example formatting guidelines

**Service Images:**
- High-quality requirement (minimum resolution)
- Content verification (no offensive images)
- Professional work showcase only
- Image optimization for mobile viewing

### Verification System
**Mandatory for All Providers:**
- Identity document verification (passport/driving licence)
- Live selfie verification
- Business registration verification (optional for sole traders)
- Ongoing compliance monitoring
- Trust badge display for verified providers

### Calendar System
**Real-time Availability:**
- Live calendar synchronization
- Double-booking prevention
- Availability windows (15-minute slots)
- Buffer time between appointments
- Recurring availability patterns
- Holiday and break management

---

## 📊 4. Service Categories & Structure

### Main Categories (Phase 1: 2 Categories Focus)

#### 1. Beauty & Grooming
- Hair (braids, cuts, colouring, wigs, barbering)
- Nails (manicure, pedicure, acrylics, gels)
- Makeup (MUA, bridal, photoshoot)
- Lashes & Brows (extensions, tinting, lamination)
- Skincare & Facials
- Spa & Massage Therapy

#### 2. Events & Entertainment
- DJs & Music Entertainment
- Hosts/MCs
- Photographers & Videographers
- Event Planners
- Caterers & Private Chefs
- Decorators & Florists

### Future Phase Categories (Planned Expansion)

#### 3. Health & Wellness (Future)
- Personal Trainers & Fitness Coaches
- Physiotherapy & Sports Therapy
- Nutritionists & Dieticians
- Mental Health & Life Coaching

#### 4. Home & Lifestyle Services (Future)
- Cleaning (home, deep clean, office, after-party)
- Handyman & Repairs
- Gardening & Landscaping
- Moving & Packing Services
- Furniture Assembly
- Pest Control

#### 5. Professional Services (Future)
- Tutors (academic, music, languages, mathematics)
- Business Consultants & Coaches
- Financial Advisors
- Legal Services
- Marketing & Branding Specialists
- Admin & Virtual Assistants

#### 6. Transport & Errands (Future)
- Errand Runners
- Car Valeting & Detailing
- Car Washing

#### 7. Home Health & Personal (Future)
- Babysitters & Childcare
- Pet Services (walking, grooming, training, sitting)
- Personal Assistants

#### 8. SOS & Emergency Services (Future)
- Emergency Beauty (last-minute hair/nails/makeup)
- Emergency Repairs (locksmith, boiler, plumbing, electrician)

---

## 🚀 5. Platform Principles

### User Experience Goals
- **Quick & Simple:** Streamlined booking process
- **Easy Access:** Intuitive navigation and search
- **Reliable Tracking:** Clear booking status and updates
- **Trust & Safety:** Verified providers and secure payments
- **Flexible Options:** Multiple booking modes and payment methods

### Technical Excellence
- **Mobile-First Design:** Optimized for smartphone usage
- **Real-time Updates:** Live availability and notifications
- **Secure Payments:** PCI-compliant payment processing
- **Scalable Architecture:** Support for rapid user growth
- **Performance Optimization:** Fast loading and smooth interactions

### Business Success Metrics
- **User Acquisition:** Customer and provider growth rates
- **Transaction Volume:** Booking frequency and value
- **User Retention:** Monthly active users and churn rates
- **Revenue Growth:** Commission and subscription income
- **Customer Satisfaction:** Reviews, ratings, and NPS scores

---

## 📅 Implementation Priority

### Phase 1: Core Platform (Current Focus - 2 Categories)
- ✅ User registration and verification system (COMPLETED)
- ✅ Service categories (2 categories - Beauty & Grooming, Events & Entertainment) (COMPLETED)
- ✅ Basic booking flow enhancement (COMPLETED)
- ✅ Payment processing optimization (COMPLETED)
- ✅ SOS Mode implementation (COMPLETED - EXCEEDS REQUIREMENTS)
- ✅ Provider subscription tiers (COMPLETED)
- ✅ Advanced search and filtering (COMPLETED)
- ✅ Real-time calendar management (COMPLETED)

### Phase 2: Platform Optimization (Weeks 1-4)
- Analytics dashboard enhancements
- Business visibility controls optimization
- Advanced notification system improvements
- Performance optimization
- Marketing tools and promotions

### Phase 3: Service Expansion (Future)
- Phone verification with SMS OTP
- Country code selector for international support
- Service category expansion (2 → 8 categories)
- Additional category-specific features

### Phase 4: Platform Growth (Future)
- Customer retention features
- Partner integrations
- International expansion preparation
- Advanced marketplace features

---

*This document serves as the comprehensive technical specification for transforming ZOVA into Zovah Now. All features should be implemented following the existing React Query + Zustand architecture patterns established in the current codebase.*