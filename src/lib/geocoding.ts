/**
 * Geocoding Utilities
 *
 * Provides address validation and coordinate lookup using OpenStreetMap Nominatim API.
 * Used for validating user addresses and storing geographic coordinates.
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  address: {
    houseNumber?: string;
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
    postcode?: string;
  };
}

export interface AddressComponents {
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  country_code?: string;
}

/**
 * Geocode an address using OpenStreetMap Nominatim API
 */
export async function geocodeAddress(components: AddressComponents): Promise<GeocodeResult | null> {
  try {
    // Build query string from address components
    const addressParts = [];

    if (components.address) addressParts.push(components.address);
    if (components.city) addressParts.push(components.city);
    if (components.postal_code) addressParts.push(components.postal_code);
    if (components.country) addressParts.push(components.country);

    const query = addressParts.join(', ');

    if (!query.trim()) {
      throw new Error('Address components are empty');
    }

    // Nominatim API endpoint
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ZOVA-App/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null; // No results found
    }

    const result = data[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      address: {
        houseNumber: result.address?.house_number,
        road: result.address?.road,
        city: result.address?.city || result.address?.town || result.address?.village,
        state: result.address?.state,
        country: result.address?.country,
        countryCode: result.address?.country_code?.toUpperCase(),
        postcode: result.address?.postcode,
      },
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to validate address. Please check your internet connection and try again.');
  }
}

/**
 * Validate address components by geocoding them (lenient approach)
 * Tries to geocode but allows saving even if exact match not found
 */
export async function validateAddress(components: AddressComponents): Promise<{
  isValid: boolean;
  coordinates?: { latitude: number; longitude: number };
  error?: string;
  warning?: string;
}> {
  console.log('[Geocoding] 🔍 Validating address components:', components);

  try {
    const result = await geocodeAddress(components);

    if (!result) {
      console.log('[Geocoding] 📭 Address not found by geocoding service');
      // Address not found - be lenient and allow saving with warning
      return {
        isValid: true, // Changed to true - allow saving
        warning: 'Address could not be verified. Please double-check the spelling.',
      };
    }

    console.log('[Geocoding] 📍 Geocoding result:', {
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address
    });

    // Additional validation: ensure country matches if provided
    if (components.country && result.address.country) {
      const inputCountry = components.country;
      const resultCountry = result.address.country;
      const resultCountryCode = result.address.countryCode;

      const matches = countriesMatch(inputCountry, resultCountry, resultCountryCode);

      console.log('[Geocoding] 🌍 Country validation:', {
        inputCountry,
        resultCountry,
        resultCountryCode,
        matches
      });

      // Use the new robust country matching
      if (!matches) {
        console.warn('[Geocoding] ⚠️ Country mismatch detected');
        // Country mismatch - still allow saving but warn
        return {
          isValid: true, // Changed to true - allow saving
          warning: `Country verification uncertain. Expected "${components.country}" but found "${result.address.country}".`,
          coordinates: {
            latitude: result.latitude,
            longitude: result.longitude,
          },
        };
      }
    }

    console.log('[Geocoding] ✅ Address validation successful');
    return {
      isValid: true,
      coordinates: {
        latitude: result.latitude,
        longitude: result.longitude,
      },
    };
  } catch (error) {
    console.error('[Geocoding] 💥 Geocoding service error:', error);
    // Network/API errors - allow saving with warning
    return {
      isValid: true, // Changed to true - allow saving
      warning: 'Address verification unavailable. Please check your internet connection.',
    };
  }
}

/**
 * Country name mappings for different scripts and common variations
 */
const COUNTRY_NAME_MAPPINGS: Record<string, string[]> = {
  'pakistan': ['pakistan', 'پاکستان', 'pk'],
  'india': ['india', 'भारत', 'in'],
  'bangladesh': ['bangladesh', 'বাংলাদেশ', 'bd'],
  'china': ['china', '中国', 'cn'],
  'japan': ['japan', '日本', 'jp'],
  'south korea': ['south korea', 'korea', '대한민국', 'kr'],
  'united states': ['united states', 'usa', 'us', 'america'],
  'united kingdom': ['united kingdom', 'uk', 'great britain', 'gb'],
  'germany': ['germany', 'deutschland', 'de'],
  'france': ['france', 'fr'],
  'italy': ['italy', 'italia', 'it'],
  'spain': ['spain', 'españa', 'es'],
  'canada': ['canada', 'ca'],
  'australia': ['australia', 'au'],
  'brazil': ['brazil', 'brasil', 'br'],
  'mexico': ['mexico', 'méxico', 'mx'],
  'russia': ['russia', 'россия', 'ru'],
  'turkey': ['turkey', 'türkiye', 'tr'],
  'egypt': ['egypt', 'مصر', 'eg'],
  'saudi arabia': ['saudi arabia', 'saudi', 'السعودية', 'sa'],
  'uae': ['uae', 'united arab emirates', 'emirates', 'ae'],
  'iran': ['iran', 'ایران', 'ir'],
  'iraq': ['iraq', 'العراق', 'iq'],
  'afghanistan': ['afghanistan', 'افغانستان', 'af'],
  'sri lanka': ['sri lanka', 'ශ්‍රී ලංකාව', 'lk'],
  'nepal': ['nepal', 'नेपाल', 'np'],
  'bhutan': ['bhutan', 'འབྲུག', 'bt'],
  'maldives': ['maldives', 'ދިވެހިރާއްޖެ', 'mv'],
};

/**
 * Normalize country name for comparison
 */
function normalizeCountryName(country: string): string {
  return country.toLowerCase().trim();
}

/**
 * Check if two country names match, considering different scripts and variations
 */
function countriesMatch(inputCountry: string, resultCountry: string, resultCountryCode?: string): boolean {
  const normalizedInput = normalizeCountryName(inputCountry);
  const normalizedResult = normalizeCountryName(resultCountry);

  // Exact match (case-insensitive)
  if (normalizedInput === normalizedResult) {
    return true;
  }

  // Country code match (most reliable)
  if (resultCountryCode) {
    const normalizedCode = normalizeCountryName(resultCountryCode);
    if (normalizedInput === normalizedCode || normalizedInput.includes(normalizedCode)) {
      return true;
    }
  }

  // Check mappings for the input country
  const inputMappings = COUNTRY_NAME_MAPPINGS[normalizedInput];
  if (inputMappings) {
    if (inputMappings.some(mapping => normalizeCountryName(mapping) === normalizedResult)) {
      return true;
    }
  }

  // Check if result country maps back to input
  for (const [key, mappings] of Object.entries(COUNTRY_NAME_MAPPINGS)) {
    if (mappings.some(mapping => normalizeCountryName(mapping) === normalizedResult)) {
      if (mappings.some(mapping => normalizeCountryName(mapping) === normalizedInput)) {
        return true;
      }
    }
  }

  // Fuzzy matching for common variations
  if (normalizedResult.includes(normalizedInput) || normalizedInput.includes(normalizedResult)) {
    return true;
  }

  // Special handling for country codes in the input
  if (resultCountryCode && normalizedInput.length === 2) {
    return normalizedInput === normalizeCountryName(resultCountryCode);
  }

  return false;
}

/**
 * Parse PostGIS geometry string to coordinates
 */
export function postGISToCoordinates(geometry: string): { latitude: number; longitude: number } | null {
  try {
    // Expected format: "POINT(longitude latitude)"
    const match = geometry.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!match) return null;

    const longitude = parseFloat(match[1]);
    const latitude = parseFloat(match[2]);

    return { latitude, longitude };
  } catch (error) {
    console.error('Error parsing PostGIS geometry:', error);
    return null;
  }
}