export { useUserFavorites, useToggleFavorite, useIsFavorited, type UserFavorite, type FavoriteProvider, type FavoriteService } from './useFavorites';
export {
  useProviderSearch,
  useServiceSearch,
  useServiceCategories,
  type SearchFilters,
  type ProviderSearchResult,
  type ServiceSearchResult
} from './useSearch';

// ✅ Optimized search hooks following copilot-rules.md
export {
  useOptimizedServiceSearch,
  useOptimizedProviderSearch,
  useSearchResults,
  useSearchActions
} from './useSearchOptimized';