import { supabase } from '../core/supabase';

export interface UserProfile {
  id: string;
  email: string;
  role: 'customer' | 'provider' | 'admin' | 'super-admin';
  first_name: string;
  last_name: string;
  avatar_url?: string;
  created_at: string;
  phone_number?: string;
  bio?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
  coordinates?: any;
}

/**
 * Fetch user profile from Supabase profiles table
 * @param userId - The user's UUID from Supabase auth
 * @returns User profile or null if not found
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    console.log('[Profile] Fetching profile for userId:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Profile] Error fetching user profile:', {
        error,
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }

    if (!data) {
      console.warn('[Profile] No profile found for userId:', userId);
      return null;
    }

    console.log('[Profile] Profile found:', { userId, role: data.role, email: data.email });
    return data as UserProfile;
  } catch (error) {
    console.error('[Profile] Unexpected error fetching profile:', error, 'for userId:', userId);
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
      
      // ✅ Create provider_onboarding_progress row for new providers
      if (role === 'provider') {
        console.log('[Profile] Creating provider onboarding progress row');
        try {
          const { error: progressError } = await supabase
            .from('provider_onboarding_progress')
            .insert({
              provider_id: userId,
              verification_status: 'pending',
              current_step: 1,
              steps_completed: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (progressError) {
            console.error('[Profile] Error creating onboarding progress:', progressError);
            // Don't fail the profile creation if progress creation fails
          } else {
            console.log('[Profile] Onboarding progress row created successfully');
          }
        } catch (progressError) {
          console.error('[Profile] Unexpected error creating onboarding progress:', progressError);
          // Don't fail the profile creation if progress creation fails
        }
      }
      
      // Create default working hours for providers (9-5 Monday-Friday)
      if (role === 'provider') {
        console.log('[Profile] Creating default working hours for provider');
        try {
          const defaultSchedule = {
            monday: { start: '09:00', end: '17:00', enabled: true },
            tuesday: { start: '09:00', end: '17:00', enabled: true },
            wednesday: { start: '09:00', end: '17:00', enabled: true },
            thursday: { start: '09:00', end: '17:00', enabled: true },
            friday: { start: '09:00', end: '17:00', enabled: true },
            saturday: { start: '09:00', end: '17:00', enabled: false },
            sunday: { start: '09:00', end: '17:00', enabled: false }
          };

          const { error: scheduleError } = await supabase
            .from('provider_schedules')
            .insert({
              provider_id: userId,
              schedule_data: defaultSchedule
            });

          if (scheduleError) {
            console.error('[Profile] Error creating default schedule:', scheduleError);
            // Don't fail the profile creation if schedule creation fails
          } else {
            console.log('[Profile] Default schedule created successfully');
          }
        } catch (scheduleError) {
          console.error('[Profile] Unexpected error creating default schedule:', scheduleError);
          // Don't fail the profile creation if schedule creation fails
        }
      }
      
      return data as UserProfile;
    }
  } catch (error) {
    console.error('[Profile] Unexpected error creating/updating profile:', error);
    return null;
  }
};