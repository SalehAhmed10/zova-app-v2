import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  role: 'customer' | 'provider' | 'admin' | 'super-admin';
  first_name: string;
  last_name: string;
  avatar_url?: string;
  created_at: string;
}

/**
 * Fetch user profile from Supabase profiles table
 * @param userId - The user's UUID from Supabase auth
 * @returns User profile or null if not found
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Profile] Error fetching user profile:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('[Profile] Unexpected error fetching profile:', error);
    return null;
  }
};

/**
 * Create a new user profile in the profiles table
 * @param userId - The user's UUID from Supabase auth
 * @param email - The user's email
 * @param role - The user's role
 * @returns The created profile or null if failed
 */
export const createUserProfile = async (
  userId: string, 
  email: string, 
  role: 'customer' | 'provider' = 'customer'
): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        role,
        first_name: '',
        last_name: ''
      })
      .select()
      .single();

    if (error) {
      console.error('[Profile] Error creating user profile:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('[Profile] Unexpected error creating profile:', error);
    return null;
  }
};