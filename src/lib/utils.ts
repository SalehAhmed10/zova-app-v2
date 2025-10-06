import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as FileSystem from 'expo-file-system/legacy';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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