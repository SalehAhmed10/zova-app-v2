/**
 * Geocoding Hook
 *
 * React hook for address validation and geocoding using the geocoding utility.
 * Provides validation state and coordinate lookup for address forms.
 */

import { useState, useCallback } from 'react';
import { validateAddress, geocodeAddress, type AddressComponents, type GeocodeResult } from '@/lib/geocoding';

export interface UseGeocodingResult {
  validateAddress: (components: AddressComponents) => Promise<{ isValid: boolean; coordinates: { latitude: number; longitude: number } | null; warning: string | null }>;
  geocodeAddress: (components: AddressComponents) => Promise<GeocodeResult | null>;
  isValidating: boolean;
  validationError: string | null;
  validationWarning: string | null;
  lastValidatedCoordinates: { latitude: number; longitude: number } | null;
  clearValidation: () => void;
}

/**
 * Hook for geocoding and address validation
 */
export function useGeocoding(): UseGeocodingResult {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [lastValidatedCoordinates, setLastValidatedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const validateAddressAsync = useCallback(async (components: AddressComponents): Promise<{ isValid: boolean; coordinates: { latitude: number; longitude: number } | null; warning: string | null }> => {
    console.log('[useGeocoding] 🔍 Starting geocoding validation for:', components);

    setIsValidating(true);
    setValidationError(null);
    setValidationWarning(null);

    try {
      const result = await validateAddress(components);

      console.log('[useGeocoding] 📊 Raw geocoding result:', result);

      if (result.isValid) {
        const coordinates = result.coordinates || null;
        if (coordinates) {
          setLastValidatedCoordinates(coordinates);
          console.log('[useGeocoding] 📌 Coordinates set:', coordinates);
        } else {
          console.log('[useGeocoding] 📭 No coordinates returned from geocoding service');
        }
        if (result.warning) {
          setValidationWarning(result.warning);
          console.warn('[useGeocoding] ⚠️ Validation warning:', result.warning);
        } else {
          console.log('[useGeocoding] ✅ Validation successful with no warnings');
        }
        return { isValid: true, coordinates, warning: result.warning || null };
      } else {
        setValidationError(result.error || 'Address validation failed');
        setLastValidatedCoordinates(null);
        console.error('[useGeocoding] ❌ Validation failed:', result.error);
        return { isValid: false, coordinates: null, warning: null };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Address validation failed';
      setValidationError(errorMessage);
      setLastValidatedCoordinates(null);
      console.error('[useGeocoding] 💥 Validation error:', errorMessage);
      return { isValid: false, coordinates: null, warning: null };
    } finally {
      setIsValidating(false);
    }
  }, []);

  const geocodeAddressAsync = useCallback(async (components: AddressComponents): Promise<GeocodeResult | null> => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const result = await geocodeAddress(components);
      if (result) {
        setLastValidatedCoordinates({
          latitude: result.latitude,
          longitude: result.longitude,
        });
      } else {
        setLastValidatedCoordinates(null);
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Geocoding failed';
      setValidationError(errorMessage);
      setLastValidatedCoordinates(null);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidationError(null);
    setValidationWarning(null);
    setLastValidatedCoordinates(null);
  }, []);

  return {
    validateAddress: validateAddressAsync,
    geocodeAddress: geocodeAddressAsync,
    isValidating,
    validationError,
    validationWarning,
    lastValidatedCoordinates,
    clearValidation,
  };
}