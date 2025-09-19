import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types
export interface UserFavorite {
  id: string;
  user_id: string;
  favorite_type: 'service' | 'provider';
  favorite_id: string;
  created_at: string;
  updated_at: string;
}

export interface FavoriteProvider {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  avatar_url?: string;
  rating?: number;
  review_count?: number;
  services_count?: number;
}

export interface FavoriteService {
  id: string;
  title: string;
  description?: string;
  base_price: number;
  price_type: 'fixed' | 'hourly';
  provider: {
    id: string;
    first_name: string;
    last_name: string;
    business_name?: string;
    avatar_url?: string;
    rating?: number;
  } | null;
  category_name: string;
  subcategory_name: string;
}

// Hook to get user favorites
export const useUserFavorites = (userId?: string) => {
  // Only log when userId actually changes
  React.useEffect(() => {
    if (userId) {
      console.log('useUserFavorites: Hook called with userId:', userId);
    }
  }, [userId]);
  
  return useQuery({
    queryKey: ['user-favorites', userId],
    queryFn: async () => {
      if (!userId) {
        return { providers: [], services: [] };
      }

      console.log('useUserFavorites: Fetching favorites for userId:', userId);

      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('useUserFavorites: Error fetching favorites:', error);
        throw error;
      }

      console.log('useUserFavorites: Raw favorites data:', data);

      // Separate favorites by type
      const providerIds = data.filter(f => f.favorite_type === 'provider').map(f => f.favorite_id);
      const serviceIds = data.filter(f => f.favorite_type === 'service').map(f => f.favorite_id);

      console.log('useUserFavorites: Provider IDs:', providerIds);
      console.log('useUserFavorites: Service IDs:', serviceIds);

      // Fetch provider details
      const providers: FavoriteProvider[] = [];
      if (providerIds.length > 0) {
        console.log('useUserFavorites: Fetching provider details for IDs:', providerIds);
        const { data: providerData, error: providerError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            business_name,
            avatar_url,
            role
          `)
          .in('id', providerIds)
          .eq('role', 'provider');

        if (providerError) {
          console.error('useUserFavorites: Error fetching providers:', providerError);
        } else {
          console.log('useUserFavorites: Provider data:', providerData);
        }

        if (!providerError && providerData) {
          // Get ratings and service counts for each provider
          const providerDetails = await Promise.all(
            providerData.map(async (provider) => {
              const [ratingResult, servicesResult] = await Promise.all([
                supabase
                  .from('reviews')
                  .select('rating')
                  .eq('provider_id', provider.id),
                supabase
                  .from('provider_services')
                  .select('id', { count: 'exact' })
                  .eq('provider_id', provider.id)
                  .eq('is_active', true)
              ]);

              const ratings = ratingResult.data || [];
              const avgRating = ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : undefined;

              return {
                ...provider,
                rating: avgRating,
                review_count: ratings.length,
                services_count: servicesResult.count || 0
              };
            })
          );

          providers.push(...providerDetails);
          console.log('useUserFavorites: Final providers:', providers);
        }
      }

      // Fetch service details
      const services: FavoriteService[] = [];
      if (serviceIds.length > 0) {
        console.log('useUserFavorites: Fetching service details for IDs:', serviceIds);
        const { data: serviceData, error: serviceError } = await supabase
          .from('provider_services')
          .select(`
            id,
            title,
            description,
            base_price,
            price_type,
            provider:profiles!provider_services_provider_id_fkey (
              id,
              first_name,
              last_name,
              business_name,
              avatar_url
            ),
            subcategory:service_subcategories (
              name,
              category:service_categories (
                name
              )
            )
          `)
          .in('id', serviceIds)
          .eq('is_active', true);

        if (serviceError) {
          console.error('useUserFavorites: Error fetching services:', serviceError);
        } else {
          console.log('useUserFavorites: Service data:', serviceData);
        }

        if (!serviceError && serviceData) {
          const serviceDetails = await Promise.all(
            serviceData.map(async (service: any) => {
              // Get provider rating (only if provider exists)
              let avgRating = undefined;
              if (service.provider?.id) {
                const { data: ratingData } = await supabase
                  .from('reviews')
                  .select('rating')
                  .eq('provider_id', service.provider.id);

                const ratings = ratingData || [];
                avgRating = ratings.length > 0
                  ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                  : undefined;
              }

              return {
                id: service.id,
                title: service.title,
                description: service.description,
                base_price: service.base_price,
                price_type: service.price_type,
                provider: service.provider ? {
                  id: service.provider.id,
                  first_name: service.provider.first_name,
                  last_name: service.provider.last_name,
                  business_name: service.provider.business_name,
                  avatar_url: service.provider.avatar_url,
                  rating: avgRating
                } : null,
                category_name: service.subcategory.category?.name || 'General',
                subcategory_name: service.subcategory.name
              } as FavoriteService;
            })
          );

          services.push(...serviceDetails);
          console.log('useUserFavorites: Final services:', services);
        }
      }

      const result = { providers, services };
      console.log('useUserFavorites: Final result:', result);
      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to check if an item is favorited
export const useIsFavorited = (userId?: string, type?: 'service' | 'provider', itemId?: string) => {
  return useQuery({
    queryKey: ['is-favorited', userId, type, itemId],
    queryFn: async () => {
      if (!userId || !type || !itemId) return false;

      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('favorite_type', type)
        .eq('favorite_id', itemId)
        .single();

      return !error && !!data;
    },
    enabled: !!userId && !!type && !!itemId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to toggle favorite
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      type,
      itemId,
      isFavorited
    }: {
      userId: string;
      type: 'service' | 'provider';
      itemId: string;
      isFavorited: boolean;
    }) => {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('favorite_type', type)
          .eq('favorite_id', itemId);

        if (error) throw error;
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: userId,
            favorite_type: type,
            favorite_id: itemId
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, { userId, type, itemId, isFavorited }) => {
      console.log('useToggleFavorite: Success - userId:', userId, 'type:', type, 'itemId:', itemId, 'isFavorited:', isFavorited);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-favorites', userId] });
      queryClient.invalidateQueries({ queryKey: ['is-favorited'] });
      console.log('useToggleFavorite: Cache invalidated for userId:', userId);
    },
    onError: (error, { userId, type, itemId, isFavorited }) => {
      console.error('useToggleFavorite: Error - userId:', userId, 'type:', type, 'itemId:', itemId, 'isFavorited:', isFavorited, 'error:', error);
    },
  });
};