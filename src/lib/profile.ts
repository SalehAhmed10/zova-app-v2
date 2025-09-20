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

/**
 * Create or update user profile (upsert operation)
 * @param userId - The user's UUID from Supabase auth
 * @param email - The user's email
 * @param role - The user's role
 * @returns The created/updated profile or null if failed
 */
export const createOrUpdateUserProfile = async (
  userId: string, 
  email: string, 
  role: 'customer' | 'provider' = 'customer'
): Promise<UserProfile | null> => {
  try {
    console.log('[Profile] Creating or updating profile for:', { userId, email, role });
    
    // Check if profile exists
    const existingProfile = await getUserProfile(userId);
    
    if (existingProfile) {
      console.log('[Profile] Profile exists, updating role from:', existingProfile.role, 'to:', role);
      
      // Update existing profile
      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('[Profile] Error updating user profile:', error);
        return null;
      }

      console.log('[Profile] Profile updated successfully');
      return data as UserProfile;
    } else {
      console.log('[Profile] Profile does not exist, creating new profile');
      
      // Create new profile
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

      console.log('[Profile] Profile created successfully');
      return data as UserProfile;
    }
  } catch (error) {
    console.error('[Profile] Unexpected error creating/updating profile:', error);
    return null;
  }
};