// Shared hooks
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
export { useServiceCategories } from './shared/useProfileData';

// Provider hooks - import directly from provider directory instead of re-exporting
// To use provider hooks, import directly: import { useHook } from '@/hooks/provider'

// Customer hooks
export {
  useUserFavorites,
  useToggleFavorite,
  useIsFavorited,
  type UserFavorite,
  type FavoriteProvider,
  type FavoriteService,
  useTrustedProviders,
  useUpdateProfile,
  useServiceDetails,
  useProviderDetails,
  useCancelBooking,
  useUserReviews,
  type ProfileData as CustomerProfileData,
  type BookingData as CustomerBookingData,
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
