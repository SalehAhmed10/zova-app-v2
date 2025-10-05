import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';

interface SubmitProviderResponseRequest {
  review_id: string;
  response: string;
}

export const useSubmitProviderResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ review_id, response }: SubmitProviderResponseRequest) => {
      const { data, error } = await supabase.functions.invoke('submit-provider-response', {
        body: { review_id, response },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate review queries to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['user-reviews'],
      });
      queryClient.invalidateQueries({
        queryKey: ['provider-reviews'],
      });
    },
    onError: (error) => {
      console.error('Provider response submission error:', error);
    },
  });
};