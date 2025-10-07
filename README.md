# ZOVA - Service Provider Marketplace

ZOVA is a modern React Native application that connects users with trusted service providers in an Uber-style experience. Users can book appointments, manage services, and experience seamless professional connections all in one place.

## 🚀 Features

- **Service Booking**: Complete booking flow with Stripe payment processing
- **Provider Management**: Comprehensive provider profiles with verification system
- **Real-time Communication**: In-app messaging and notifications
- **Payment Processing**: Secure Stripe integration with authorization & capture flow
- **Calendar Integration**: Booking scheduling and availability management
- **Expo Router**: File-based routing system with deep linking
- **NativeWind**: Tailwind CSS for React Native styling
- **TypeScript**: Full type safety throughout the application
- **Dark Mode**: Built-in theme switching
- **Responsive Design**: Mobile-first approach for all screen sizes

## 🏗️ Architecture

- **State Management**: Zustand for global state + TanStack React Query for server state
- **Backend**: Supabase with Edge Functions, RLS policies, and real-time subscriptions
- **Payments**: Stripe Connect with authorization & capture flow (10% platform fee)
- **Authentication**: Supabase Auth with email/password and social login
- **UI Components**: React Native Reusables (shadcn/ui inspired)
- **Animations**: React Native Reanimated v4 with smooth interactions
- **Performance**: Flash List for optimized scrolling and lazy loading

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (for testing)

### Installation

```sh
# Clone the repository
git clone [repository-url]
cd ZOVA

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and Stripe credentials
```

### Environment Variables

Required environment variables:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## 🚀 Running the App

```sh
# Start the development server
npm start

# Platform-specific development
npm run ios          # iOS simulator
npm run android      # Android emulator
npm run web          # Web development
```

## 🧪 Testing

The project includes test scripts for payment flows:

- `test-app-payment-flow.js` - Tests authorization & capture payment system
- `test-authorization-capture-flow.js` - Comprehensive payment flow testing
- `test-payout-flow.js` - Provider payout system testing
- `final-payment-system-demo.mjs` - Complete end-to-end payment demonstration

## 📱 Key Features

### For Customers
- Browse and search service providers
- Book appointments with real-time availability
- Secure payment processing with multiple payment methods
- Track booking status and communicate with providers
- Rate and review completed services

### For Service Providers
- Complete profile management with verification system
- Calendar management and availability settings
- Earnings dashboard with detailed analytics
- Real-time booking notifications and management
- Secure payout system with weekly transfers

## 🏗️ Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── customer/          # Customer-facing screens
│   ├── provider/          # Provider-facing screens
│   └── auth/              # Authentication screens
├── components/             # Reusable UI components
│   ├── ui/                # Base UI components (Button, Card, etc.)
│   ├── customer/          # Customer-specific components
│   └── provider/          # Provider-specific components
├── hooks/                 # Custom React hooks
├── stores/                # Zustand stores for state management
├── lib/                   # Utilities and configurations
├── types/                 # TypeScript type definitions
└── constants/             # App constants and configuration
```

## � Payment System

ZOVA implements a sophisticated payment system with Stripe:

- **Authorization & Capture**: Full amount authorized, 20% captured as deposit
- **Service Protection**: Remaining payment captured when service is completed
- **Platform Fee**: 10% platform fee for service facilitation
- **Provider Payouts**: Weekly automatic transfers to provider accounts
- **Multiple Payment Methods**: Card, Apple Pay, Google Pay, and more

## 🚀 Deployment

The app supports deployment on iOS, Android, and Web platforms:

```sh
# Build for production
npx eas build --platform all

# Submit to app stores
npx eas submit --platform all
```

## � Security

- Row Level Security (RLS) policies for data protection
- JWT-based authentication with Supabase
- Stripe Connect for secure payment processing
- Environment variable management for sensitive data
- Input validation and sanitization throughout

## 📚 Documentation

- `ZOVAH_NOW_REQUIREMENTS.md` - Complete project requirements and specifications
- `TODOS/todos.md` - Current development tasks and completed features
- Payment test scripts for development and debugging

For technical questions or support, refer to the comprehensive documentation files included in the project.
