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
export type Database = {
  // Add your database types here
  // You can generate this with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
};

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

  // Example: Posts table operations
  posts: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      return { data, error };
    },

    create: async (post: { title: string; content: string; user_id: string }) => {
      const { data, error } = await supabase
        .from('posts')
        .insert([post])
        .select()
        .single();
      return { data, error };
    },
  },
};

// Storage helpers
export const storage = {
  uploadFile: async (bucket: string, path: string, file: any) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    return { data, error };
  },

  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    return data.publicUrl;
  },

  deleteFile: async (bucket: string, paths: string[]) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(paths);
    return { data, error };
  },
};