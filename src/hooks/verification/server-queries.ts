import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/core/supabase';
import { useProviderVerificationStore } from '@/stores/verification/provider-verification';

// Query keys
export const verificationKeys = {
  sessions: ['verification', 'sessions'] as const,
  session: (sessionId: string) => ['verification', 'sessions', sessionId] as const,
  stepProgress: (sessionId: string) => ['verification', 'step-progress', sessionId] as const,
  notifications: (providerId: string) => ['verification', 'notifications', providerId] as const,
  onboardingProgress: (providerId: string) => ['verification', 'onboarding', providerId] as const,
};

// Session Management Hooks
export const useCreateVerificationSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      providerId: string;
      deviceFingerprint?: string;
      ipAddress?: string;
      userAgent?: string;
    }) => {
      const { data: session, error } = await supabase
        .from('provider_verification_sessions')
        .insert({
          provider_id: data.providerId,
          device_fingerprint: data.deviceFingerprint,
          ip_address: data.ipAddress,
          user_agent: data.userAgent,
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: verificationKeys.sessions });
      queryClient.setQueryData(verificationKeys.session(session.session_id), session);
    },
  });
};

export const useUpdateSessionActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc('update_verification_session_activity', {
        session_uuid: sessionId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: verificationKeys.session(sessionId) });
    },
  });
};

export const useVerificationSessions = (providerId: string) => {
  return useQuery({
    queryKey: verificationKeys.sessions,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_verification_sessions')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });
};

// Step Progress Hooks
export const useStepProgress = (sessionId: string) => {
  return useQuery({
    queryKey: verificationKeys.stepProgress(sessionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_verification_step_progress')
        .select('*')
        .eq('session_id', sessionId)
        .order('step_number');

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
};

export const useAcquireStepLock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { sessionId: string; stepNumber: number; lockDuration?: number }) => {
      const { data: result, error } = await supabase.rpc('acquire_step_lock', {
        p_session_id: data.sessionId,
        p_step_number: data.stepNumber,
        p_lock_duration_minutes: data.lockDuration || 30,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      if (result) {
        queryClient.invalidateQueries({
          queryKey: verificationKeys.stepProgress(variables.sessionId)
        });
      }
    },
  });
};

export const useReleaseStepLock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { sessionId: string; stepNumber: number }) => {
      const { data: result, error } = await supabase.rpc('release_step_lock', {
        p_session_id: data.sessionId,
        p_step_number: data.stepNumber,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: verificationKeys.stepProgress(variables.sessionId)
      });
    },
  });
};

export const useUpdateStepProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sessionId: string;
      stepNumber: number;
      status?: string;
      data?: any;
      validationErrors?: string[];
    }) => {
      const { data: result, error } = await supabase
        .from('provider_verification_step_progress')
        .upsert({
          session_id: data.sessionId,
          step_number: data.stepNumber,
          status: data.status,
          data: data.data,
          validation_errors: data.validationErrors,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: verificationKeys.stepProgress(variables.sessionId)
      });
    },
  });
};

// Onboarding Progress Hooks
export const useOnboardingProgress = (providerId: string) => {
  return useQuery({
    queryKey: verificationKeys.onboardingProgress(providerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_onboarding_progress')
        .select('*')
        .eq('provider_id', providerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });
};

export const useUpdateOnboardingProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      providerId: string;
      updates: Record<string, any>;
    }) => {
      const { data: result, error } = await supabase
        .from('provider_onboarding_progress')
        .update({
          ...data.updates,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_id', data.providerId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: verificationKeys.onboardingProgress(variables.providerId)
      });
    },
  });
};

// Notification Hooks
export const useVerificationNotifications = (providerId: string) => {
  return useQuery({
    queryKey: verificationKeys.notifications(providerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_verification_notifications')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      providerId: string;
      sessionId?: string;
      type: string;
      channel: string;
      title: string;
      message: string;
      notificationData?: any;
    }) => {
      const { data: result, error } = await supabase.rpc('create_verification_notification', {
        p_provider_id: data.providerId,
        p_session_id: data.sessionId,
        p_type: data.type,
        p_channel: data.channel,
        p_title: data.title,
        p_message: data.message,
        p_data: data.notificationData,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: verificationKeys.notifications(variables.providerId)
      });
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, notificationId) => {
      // Invalidate notifications query - we don't know the provider ID here
      // This will cause a refetch of all notification queries
      queryClient.invalidateQueries({ queryKey: ['verification', 'notifications'] });
    },
  });
};

// Sync Hook - Combines all server state management
export const useVerificationSync = () => {
  const { providerId, sessionId } = useProviderVerificationStore();

  const sessionsQuery = useVerificationSessions(providerId || '');
  const stepProgressQuery = useStepProgress(sessionId || '');
  const onboardingQuery = useOnboardingProgress(providerId || '');
  const notificationsQuery = useVerificationNotifications(providerId || '');

  return {
    sessions: sessionsQuery.data,
    stepProgress: stepProgressQuery.data,
    onboardingProgress: onboardingQuery.data,
    notifications: notificationsQuery.data,
    isLoading: sessionsQuery.isLoading || stepProgressQuery.isLoading ||
               onboardingQuery.isLoading || notificationsQuery.isLoading,
    error: sessionsQuery.error || stepProgressQuery.error ||
           onboardingQuery.error || notificationsQuery.error,
  };
};