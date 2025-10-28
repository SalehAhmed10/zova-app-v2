// Provider hooks index - centralized exports for all provider-specific hooks

// ✅ UNIFIED BOOKING ACTIONS - Use this for all booking state changes
export { useBookingActions } from './useBookingActions';
export { useBusinessAvailability } from './useBusinessAvailability';
export { useCalendarData } from './useCalendarData';
export { usePaymentStatus } from './usePaymentStatus';
export { usePendingBookings } from './usePendingBookings';
export { useProviderAccess } from './useProviderAccess';
export { useProviderBookingDetail } from './useProviderBookingDetail';
export { useProviderProfile } from './useProviderProfile';
export { useProviderReviews } from './useProviderReviews';
export { useSubmitProviderResponse } from './useSubmitProviderResponse';
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
