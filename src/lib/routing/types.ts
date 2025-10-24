// /**
//  * ✅ TYPE-SAFE ROUTING - Prevent route typos and enable IDE autocomplete
//  * 
//  * Defines all valid app routes with full type safety
//  */

// // ============================================================================
// // AUTH ROUTES
// // ============================================================================

// export const AUTH_ROUTES = {
//   // Login/Registration
//   LOGIN: '/(auth)/login' as const,
//   REGISTER: '/(auth)/register' as const,
//   PHONE_VERIFICATION: '/(auth)/phone-verification' as const,
//   FORGOT_PASSWORD: '/(auth)/forgot-password' as const,
//   RESET_PASSWORD: '/(auth)/reset-password' as const,
//   TERMS: '/(auth)/terms' as const,
//   PRIVACY: '/(auth)/privacy' as const,
// } as const;

// // ============================================================================
// // ONBOARDING ROUTES
// // ============================================================================

// export const ONBOARDING_ROUTES = {
//   // Role selection
//   SELECT_ROLE: '/(onboarding)/select-role' as const,
  
//   // Customer onboarding
//   CUSTOMER_WELCOME: '/(onboarding)/customer/welcome' as const,
//   CUSTOMER_PROFILE: '/(onboarding)/customer/profile' as const,
//   CUSTOMER_ADDRESS: '/(onboarding)/customer/address' as const,
//   CUSTOMER_PAYMENT: '/(onboarding)/customer/payment' as const,
  
//   // Provider onboarding
//   PROVIDER_WELCOME: '/(onboarding)/provider/welcome' as const,
//   PROVIDER_PROFILE: '/(onboarding)/provider/profile' as const,
//   PROVIDER_BUSINESS: '/(onboarding)/provider/business' as const,
//   PROVIDER_SERVICES: '/(onboarding)/provider/services' as const,
//   PROVIDER_DOCUMENTS: '/(onboarding)/provider/documents' as const,
//   PROVIDER_BANK: '/(onboarding)/provider/bank' as const,
// } as const;

// // ============================================================================
// // CUSTOMER ROUTES
// // ============================================================================

// export const CUSTOMER_ROUTES = {
//   // Main tabs
//   HOME: '/(customer)/home' as const,
//   BOOKINGS: '/(customer)/bookings' as const,
//   MESSAGES: '/(customer)/messages' as const,
//   PROFILE: '/(customer)/profile' as const,
  
//   // Details/Actions
//   SERVICE_DETAILS: '/(customer)/service-details' as const,
//   BOOK_SERVICE: '/(customer)/book-service' as const,
//   BOOKING_DETAILS: '/(customer)/booking-details' as const,
//   PAYMENT: '/(customer)/payment' as const,
//   RATE_PROVIDER: '/(customer)/rate-provider' as const,
//   PAYMENT_METHODS: '/(customer)/payment-methods' as const,
//   ADD_PAYMENT_METHOD: '/(customer)/add-payment-method' as const,
//   SUPPORT: '/(customer)/support' as const,
//   SETTINGS: '/(customer)/settings' as const,
//   EDIT_PROFILE: '/(customer)/edit-profile' as const,
// } as const;

// // ============================================================================
// // PROVIDER ROUTES
// // ============================================================================

// export const PROVIDER_ROUTES = {
//   // Main tabs
//   DASHBOARD: '/(provider)/dashboard' as const,
//   BOOKINGS: '/(provider)/bookings' as const,
//   MESSAGES: '/(provider)/messages' as const,
//   EARNINGS: '/(provider)/earnings' as const,
//   PROFILE: '/(provider)/profile' as const,
  
//   // Details/Actions
//   BOOKING_DETAILS: '/(provider)/booking-details' as const,
//   COMPLETE_BOOKING: '/(provider)/complete-booking' as const,
//   EARNINGS_HISTORY: '/(provider)/earnings-history' as const,
//   WITHDRAW_FUNDS: '/(provider)/withdraw-funds' as const,
//   ANALYTICS: '/(provider)/analytics' as const,
//   SUPPORT: '/(provider)/support' as const,
//   SETTINGS: '/(provider)/settings' as const,
//   EDIT_PROFILE: '/(provider)/edit-profile' as const,
//   EDIT_SERVICES: '/(provider)/edit-services' as const,
//   VERIFICATION_STATUS: '/(provider)/verification-status' as const,
// } as const;

// // ============================================================================
// // PROVIDER VERIFICATION ROUTES
// // ============================================================================

// export const PROVIDER_VERIFICATION_ROUTES = {
//   VERIFICATION_PENDING: '/(provider-verification)/pending' as const,
//   VERIFICATION_IN_REVIEW: '/(provider-verification)/in-review' as const,
//   VERIFICATION_REJECTED: '/(provider-verification)/rejected' as const,
//   VERIFICATION_APPROVED: '/(provider-verification)/approved' as const,
// } as const;

// // ============================================================================
// // ADMIN ROUTES (if applicable)
// // ============================================================================

// export const ADMIN_ROUTES = {
//   DASHBOARD: '/(admin)/dashboard' as const,
//   USERS: '/(admin)/users' as const,
//   DISPUTES: '/(admin)/disputes' as const,
//   ANALYTICS: '/(admin)/analytics' as const,
//   SETTINGS: '/(admin)/settings' as const,
// } as const;

// // ============================================================================
// // UNION TYPES FOR ROUTING
// // ============================================================================

// export type AuthRoute = (typeof AUTH_ROUTES)[keyof typeof AUTH_ROUTES];
// export type OnboardingRoute = (typeof ONBOARDING_ROUTES)[keyof typeof ONBOARDING_ROUTES];
// export type CustomerRoute = (typeof CUSTOMER_ROUTES)[keyof typeof CUSTOMER_ROUTES];
// export type ProviderRoute = (typeof PROVIDER_ROUTES)[keyof typeof PROVIDER_ROUTES];
// export type ProviderVerificationRoute = (typeof PROVIDER_VERIFICATION_ROUTES)[keyof typeof PROVIDER_VERIFICATION_ROUTES];
// export type AdminRoute = (typeof ADMIN_ROUTES)[keyof typeof ADMIN_ROUTES];

// export type AppRoute =
//   | AuthRoute
//   | OnboardingRoute
//   | CustomerRoute
//   | ProviderRoute
//   | ProviderVerificationRoute
//   | AdminRoute;

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// /**
//  * ✅ Type-safe route getter
//  * Prevents typos and provides IDE autocomplete
//  */
// export function getAuthRoute(route: keyof typeof AUTH_ROUTES): AuthRoute {
//   return AUTH_ROUTES[route];
// }

// export function getCustomerRoute(route: keyof typeof CUSTOMER_ROUTES): CustomerRoute {
//   return CUSTOMER_ROUTES[route];
// }

// export function getProviderRoute(route: keyof typeof PROVIDER_ROUTES): ProviderRoute {
//   return PROVIDER_ROUTES[route];
// }

// export function getOnboardingRoute(route: keyof typeof ONBOARDING_ROUTES): OnboardingRoute {
//   return ONBOARDING_ROUTES[route];
// }

// /**
//  * ✅ Validate if a string is a valid app route
//  */
// export function isValidAppRoute(route: string): route is AppRoute {
//   const allRoutes = [
//     ...Object.values(AUTH_ROUTES),
//     ...Object.values(ONBOARDING_ROUTES),
//     ...Object.values(CUSTOMER_ROUTES),
//     ...Object.values(PROVIDER_ROUTES),
//     ...Object.values(PROVIDER_VERIFICATION_ROUTES),
//     ...Object.values(ADMIN_ROUTES),
//   ];
//   return allRoutes.includes(route as AppRoute);
// }

// /**
//  * ✅ Get route category
//  */
// export type RouteCategory = 'auth' | 'onboarding' | 'customer' | 'provider' | 'admin' | 'verification' | 'unknown';

// export function getRouteCategory(route: string): RouteCategory {
//   if (route.includes('/(auth)')) return 'auth';
//   if (route.includes('/(onboarding)')) return 'onboarding';
//   if (route.includes('/(customer)')) return 'customer';
//   if (route.includes('/(provider)')) return 'provider';
//   if (route.includes('/(provider-verification)')) return 'verification';
//   if (route.includes('/(admin)')) return 'admin';
//   return 'unknown';
// }

// /**
//  * ✅ Route parameters type mapping
//  */
// export interface RouteParams {
//   // Dynamic route params
//   '[id]': { id: string };
//   '[providerId]': { providerId: string };
//   '[customerId]': { customerId: string };
//   '[bookingId]': { bookingId: string };
//   '[serviceId]': { serviceId: string };
//   '[userId]': { userId: string };
// }

// /**
//  * ✅ Routes that don't require authentication
//  */
// export const PUBLIC_ROUTES = new Set<AppRoute>([
//   AUTH_ROUTES.LOGIN,
//   AUTH_ROUTES.REGISTER,
//   AUTH_ROUTES.PHONE_VERIFICATION,
//   AUTH_ROUTES.FORGOT_PASSWORD,
//   AUTH_ROUTES.RESET_PASSWORD,
//   AUTH_ROUTES.TERMS,
//   AUTH_ROUTES.PRIVACY,
//   ONBOARDING_ROUTES.SELECT_ROLE,
// ]);

// /**
//  * ✅ Routes requiring provider verification
//  */
// export const VERIFICATION_REQUIRED_ROUTES = new Set<AppRoute>([
//   PROVIDER_ROUTES.DASHBOARD,
//   PROVIDER_ROUTES.BOOKINGS,
//   PROVIDER_ROUTES.EARNINGS,
//   PROVIDER_ROUTES.WITHDRAW_FUNDS,
//   PROVIDER_ROUTES.ANALYTICS,
// ]);

// /**
//  * ✅ Helper to check if route is public
//  */
// export function isPublicRoute(route: string): boolean {
//   return PUBLIC_ROUTES.has(route as AppRoute);
// }

// /**
//  * ✅ Helper to check if route requires verification
//  */
// export function requiresVerification(route: string): boolean {
//   return VERIFICATION_REQUIRED_ROUTES.has(route as AppRoute);
// }
