/**
 * Pending Registration Utilities
 * Handles checking and clearing pending registration from AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_REGISTRATION_KEY = 'pending_registration';

export interface PendingRegistration {
  email: string;
  role: 'customer' | 'provider';
  timestamp: number;
}

/**
 * Check if there's a pending registration saved
 */
export async function checkPendingRegistration(): Promise<PendingRegistration | null> {
  try {
    const pending = await AsyncStorage.getItem(PENDING_REGISTRATION_KEY);
    if (!pending) return null;

    const data = JSON.parse(pending) as PendingRegistration;
    
    // Check if pending registration is still valid (within 24 hours)
    const now = Date.now();
    const hoursAgo = (now - data.timestamp) / (1000 * 60 * 60);
    
    if (hoursAgo > 24) {
      // Expired, clear it
      await clearPendingRegistration();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[PendingRegistration] Error checking:', error);
    return null;
  }
}

/**
 * Clear pending registration
 */
export async function clearPendingRegistration(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_REGISTRATION_KEY);
  } catch (error) {
    console.error('[PendingRegistration] Error clearing:', error);
  }
}

/**
 * Save a pending registration
 */
export async function savePendingRegistration(email: string, role: 'customer' | 'provider'): Promise<void> {
  try {
    const pending: PendingRegistration = {
      email,
      role,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('[PendingRegistration] Error saving:', error);
  }
}
