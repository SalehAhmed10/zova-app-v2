import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Conditionally import AsyncStorage only for native platforms
let AsyncStorage: any = null;
if (Platform.OS !== 'web') {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

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

// Storage helpers
export const storage = {
  // Upload file to Supabase storage
  uploadFile: async (bucket: string, filePath: string, file: File | Blob, options?: { contentType?: string }) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: options?.contentType,
        upsert: false
      });
    return { data, error };
  },

  // Get public URL for a file
  getPublicUrl: (bucket: string, filePath: string) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    return data.publicUrl;
  },

  // Delete file from storage
  deleteFile: async (bucket: string, filePath: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    return { data, error };
  },

  // Upload portfolio image with organized structure
  uploadPortfolioImage: async (userId: string, imageUri: string, index: number) => {
    try {
      // For Expo/React Native, we need to use expo-file-system
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('Image file does not exist');
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create organized filename with new structure
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `providers/${userId}/portfolio/image_${Date.now()}_${index}.${fileExt}`;

      // Convert base64 to Uint8Array for upload
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase storage using organized structure
      const { data, error } = await supabase.storage
        .from('verification-images')
        .upload(fileName, bytes, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false
        });

      if (error) throw error;

      // Get public URL (even though bucket is private, we store the public format)
      // The app will generate signed URLs when needed
      const publicUrl = supabase.storage
        .from('verification-images')
        .getPublicUrl(fileName).data.publicUrl;

      return { publicUrl, fileName };
    } catch (error) {
      console.error('Error uploading portfolio image:', error);
      throw error;
    }
  }
};