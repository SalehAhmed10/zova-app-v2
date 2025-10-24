// Provider hooks index - centralized exports for all provider-specific hooks

export { useAcceptBooking } from './useAcceptBooking';
export { useBookings } from './useBookings';
export { useBusinessAvailability } from './useBusinessAvailability';
export { useCalendarData } from './useCalendarData';
export { useDeclineBooking } from './useDeclineBooking';
export { usePaymentStatus } from './usePaymentStatus';
export { usePendingBookings } from './usePendingBookings';
export { useProviderAccess } from './useProviderAccess';
export { useProviderBookingDetail } from './useProviderBookingDetail';
export { useProviderProfile } from './useProviderProfile';
export { useProviderReviews } from './useProviderReviews';
// NOTE: useProviderSearch is exported from ./shared/use-provider-search (use-provider-search.ts)
// Do NOT import from ./useProviderSearch - that file is deprecated
export { useServiceSubcategories, useCategories } from './useProviderVerificationQueries';
export { useSmartProviderSearch } from './useSmartProviderSearch';
export { useStatusChangeMonitor } from './useStatusChangeMonitor';
export { useStripeAccountStatus } from './useStripeAccountStatus';
export { useUpdateBusinessAvailability } from './useUpdateBusinessAvailability';
export {
  useVerificationData,
  useUpdateStepCompletion,
  useVerificationRealtime,
  useVerificationValidation,
  useVerificationReconciliation,
  useVerificationStatusAdapter,
  type VerificationProgress,
  type VerificationData,
  type StepCompletionUpdate
} from './useVerificationSingleSource';
