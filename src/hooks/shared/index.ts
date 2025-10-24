// ✅ SYSTEM INTEGRATION: Deep link handler (encapsulated useEffect for system events)
export { useDeepLinkHandler } from './useDeepLinkHandler';

// ✅ SYSTEM INTEGRATION: Pending registration handler
export { usePendingRegistration } from './usePendingRegistration';

// ✅ UTILITY: Debounce hook for search optimization
export { useDebounceValue } from './useDebounce';

// ✅ BOOKING: Booking management hooks
export {
  useCustomerBookings,
  useUpdateBookingStatus,
  useUpdateBookingDetails,
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
  useProviderBookings,
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

// ✅ TRACKING: View tracking hooks
export { useTrackView } from './useTrackView';