// Shared hooks
export { useAuthOptimized, useProfileSync } from './shared';

// Search hooks (NEW - keyword-based full-text search)
export { 
  useServiceSearch,
  type ServiceSearchResult,
  type UseServiceSearchOptions
} from './shared/use-service-search';
export { 
  useProviderSearch,
  type ProviderSearchResult,
  type UseProviderSearchOptions
} from './shared/use-provider-search';
export { useServiceCategories } from './customer/useSearch';

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
  useCancelBooking,
  useUserReviews,
  type ProfileData as CustomerProfileData,
  type BookingData as CustomerBookingData,
  type NotificationSettings as CustomerNotificationSettings,
} from './customer';

// Additional provider exports to resolve conflicts
export { 
  useProviderServices, 
  useProviderBookings,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useToggleServiceStatus
} from './shared/useProfileData';

// Type exports for compatibility
export type BookingData = any;
export type { ProviderProfileData as ProfileData } from './provider';
export type NotificationSettings = any;

// Verification hooks
export * from './verification';