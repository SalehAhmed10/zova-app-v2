// ✅ PURE: Auth hook with ZERO useEffect patterns
export { useAuthPure as useAuthOptimized } from './useAuthPure';
export { useProfileSync } from './useProfileSync';

// ✅ PURE: Navigation decision hooks - NO useEffect
export { useNavigationDecision } from './useNavigationDecision';

// ✅ OPTIMIZED: New architecture hooks without useEffect
export { useAppInitialization } from './useAppInitialization';
export { useAuthNavigation } from './useAuthNavigation';

// ✅ SYSTEM INTEGRATION: Deep link handler (encapsulated useEffect for system events)
export { useDeepLinkHandler } from './useDeepLinkHandler';

// ✅ SYSTEM INTEGRATION: Auth listener (encapsulated useEffect for Supabase auth events)
export { useAuthListener } from './useAuthListener';
export { usePendingRegistration } from './usePendingRegistration';

// ✅ UTILITY: Debounce hook for search optimization
export { useDebounceValue } from './useDebounce';

// ✅ BOOKING: Booking management hooks
export {
  useCustomerBookings,
  useProviderBookings,
  useUpdateBookingStatus,
  useBooking,
  useCreateBooking
} from './useBookings';

export * from './useSubscription';
export {
  useProfile,
  useUserBookings,
  useProfileStats,
  useNotificationSettings,
  useUpdateProfile,
  useUpdateNotificationSettings,
  useTrustedProviders,
  useProviderStats,
  useProviderServices,
  useBusinessAvailability,
  useUpdateBusinessAvailability,
  useProviderEarnings,
  useProviderPayouts,
  useProviderEarningsAnalytics,
  useProviderWeeklySchedule,
  useProviderCalendarBookings,
  useUpdateWeeklySchedule,
  useDeleteService,
  useToggleServiceStatus,
  useCreateService,
  useUpdateService,
  type ProfileData,
  type BookingData,
  type ProfileStats,
  type NotificationSettings,
  type ProviderService,
  type TrustedProvider
} from './useProfileData';