import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as FileSystem from 'expo-file-system/legacy';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Centralized currency formatting utility
 * Ensures consistent currency display across the entire app
 */
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `£${numAmount.toFixed(2)}`;
}

/**
 * Normalizes an image URI for React Native Image component display.
 * On Android, converts content:// URIs to file:// URIs that React Native can handle.
 */
export async function normalizeImageUri(uri: string): Promise<string> {
  // If it's already a file:// URI, return as is
  if (uri.startsWith('file://')) {
    return uri;
  }

  // If it's a content:// URI (Android), copy to app directory and return file:// URI
  if (uri.startsWith('content://')) {
    try {
      if (!FileSystem.documentDirectory) {
        console.error('FileSystem.documentDirectory is not available');
        return uri;
      }

      const fileName = `temp_image_${Date.now()}.jpg`;
      const tempUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: tempUri,
      });

      return tempUri;
    } catch (error) {
      console.error('Failed to normalize image URI:', error);
      // Fallback to original URI
      return uri;
    }
  }

  // For other schemes (http, https, etc.), return as is
  return uri;
}

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}