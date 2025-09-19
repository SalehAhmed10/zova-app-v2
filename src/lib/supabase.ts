import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// You'll need to get these from your Supabase project settings
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (you can generate these with `supabase gen types typescript --project-id YOUR_PROJECT_ID`)
export type { Database } from '@/types/supabase';

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers
export const db = {
  // Example: Users table operations
  users: {
    getProfile: async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return { data, error };
    },

    updateProfile: async (userId: string, updates: any) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      return { data, error };
    },
  },

  // Provider schedules operations
  providerSchedules: {
    getSchedule: async (providerId: string) => {
      const { data, error } = await supabase
        .from('provider_schedules')
        .select('schedule_data')
        .eq('provider_id', providerId)
        .single();
      return { data, error };
    },

    saveSchedule: async (providerId: string, scheduleData: any) => {
      const { data, error } = await supabase
        .from('provider_schedules')
        .upsert({
          provider_id: providerId,
          schedule_data: scheduleData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'provider_id'
        })
        .select()
        .single();
      return { data, error };
    },

    createSchedule: async (providerId: string, scheduleData: any) => {
      const { data, error } = await supabase
        .from('provider_schedules')
        .insert({
          provider_id: providerId,
          schedule_data: scheduleData
        })
        .select()
        .single();
      return { data, error };
    }
  }
};