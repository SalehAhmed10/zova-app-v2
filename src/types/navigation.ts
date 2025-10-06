// Navigation and routing types
export type RootStackParamList = {
  index: undefined;
  onboarding: undefined;
  auth: undefined;
  'auth/index': undefined;
  'auth/register': undefined;
  'auth/otp-verification': { email: string };
  customer: undefined;
  'customer/index': undefined;
  'customer/search': undefined;
  'customer/bookings': undefined;
  'customer/profile': undefined;
  'customer/messages': undefined;
  provider: undefined;
  'provider/index': undefined;
  'provider/profile': undefined;
  'provider/bookings': undefined;
  'provider/calendar': undefined;
  'provider/earnings': undefined;
  'customer/provider': { id: string };
  providers: undefined;
  'providers/index': undefined;
  'provider-verification': undefined;
  'provider-verification/index': undefined;
  'provider-verification/bio': undefined;
  'provider-verification/business-info': undefined;
  'provider-verification/category': undefined;
  'provider-verification/services': undefined;
  'provider-verification/portfolio': undefined;
  'provider-verification/payment': undefined;
  'provider-verification/selfie': undefined;
  'provider-verification/terms': undefined;
  'provider-verification/complete': undefined;
  'provider-verification/verification-status': undefined;
  'stripe-test': undefined;
};

export type TabParamList = {
  index: undefined;
  search: undefined;
  bookings: undefined;
  messages: undefined;
  profile: undefined;
};

export type ProviderTabParamList = {
  index: undefined;
  bookings: undefined;
  calendar: undefined;
  earnings: undefined;
  profile: undefined;
};