/**
 * Location Permission Hook
 * 
 * Handles location permissions and current location detection for mobile devices.
 */

import { useState, useEffect } from 'react';

// Conditional import with error handling
let Location: any = null;
try {
  Location = require('expo-location');
} catch (error) {
  console.warn('expo-location not available:', error.message);
}

export interface LocationPermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<any | null>;
}

/**
 * Hook to manage location permissions and access
 */
export function useLocationPermission(): LocationPermissionResult {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check permission status on mount
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      if (!Location) {
        console.warn('expo-location not available, skipping permission check');
        setHasPermission(false);
        return;
      }
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (!Location) {
        console.warn('expo-location not available, cannot request permission');
        setHasPermission(false);
        return false;
      }
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<any | null> => {
    if (!Location) {
      console.warn('expo-location not available, cannot get location');
      return null;
    }
    
    if (!hasPermission) {
      console.warn('Location permission not granted');
      return null;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // 5 seconds
        distanceInterval: 10 // 10 meters
      });
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  };

  return {
    hasPermission,
    isLoading,
    requestPermission,
    getCurrentLocation
  };
}