// Shared hooks
export { useAuthOptimized, useNavigationDecision, useProfileSync, useAppInitialization, useAuthNavigation } from './shared';

// Provider hooks (export first)
export * from './provider';

// Customer hooks (export second, with aliases for conflicting types)
export {
  useUserFavorites,
  useToggleFavorite,
  useIsFavorited,
  type UserFavorite,
  type FavoriteProvider,
  type FavoriteService,
  useSearchResults,
  useTrustedProviders,
  useProfile as useCustomerProfile,
  useProfileStats,
  useUserBookings as useCustomerBookings,
  useNotificationSettings as useCustomerNotificationSettings,
  useUpdateNotificationSettings,
  useUpdateProfile,
  useServiceDetails,
  useProviderDetails,
  type ProfileData as CustomerProfileData,
  type BookingData as CustomerBookingData,
  type NotificationSettings as CustomerNotificationSettings,
} from './customer';

// Additional provider exports to resolve conflicts
export { useProviderServices } from './shared/useProfileData';

// Type exports for compatibility
export type BookingData = any;
export type { ProviderProfileData as ProfileData } from './provider';
export type NotificationSettings = any;

// Verification hooks
export * from './verification';