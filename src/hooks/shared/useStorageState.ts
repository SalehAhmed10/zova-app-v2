import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook for persisting state in AsyncStorage
 * Similar to useState but syncs with AsyncStorage
 */
export function useStorageState(key: string): [
  string | null,
  (value: string | null) => void
] {
  const [state, setState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load initial value from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((value) => {
        setState(value);
        setIsHydrated(true);
      })
      .catch((error) => {
        console.warn(`[useStorageState] Failed to load ${key}:`, error);
        setIsHydrated(true);
      });
  }, [key]);

  // Update function that syncs with AsyncStorage
  const updateState = useCallback(
    (value: string | null) => {
      setState(value);
      
      if (value === null) {
        AsyncStorage.removeItem(key).catch((error) => {
          console.warn(`[useStorageState] Failed to remove ${key}:`, error);
        });
      } else {
        AsyncStorage.setItem(key, value).catch((error) => {
          console.warn(`[useStorageState] Failed to save ${key}:`, error);
        });
      }
    },
    [key]
  );

  // Return null until hydrated to prevent hydration mismatches
  return [isHydrated ? state : null, updateState];
}
