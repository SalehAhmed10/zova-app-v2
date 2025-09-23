import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Get file extension from URI
 * @param fileUri - The file URI
 * @returns string - The file extension (lowercase)
 */
function getFileExtension(fileUri: string): string {
  const uriParts = fileUri.split('.');
  return uriParts[uriParts.length - 1].toLowerCase();
}

/**
 * Get MIME content type based on file extension
 * @param fileUri - The file URI
 * @returns string - The MIME content type
 */
function getContentType(fileUri: string): string {
  const extension = getFileExtension(fileUri);
  const contentTypes: { [key: string]: string } = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return contentTypes[extension] || 'application/octet-stream';
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  progress: number;
}

/**
 * Clean up old verification files for a provider
 * @param providerId - The provider's UUID
 * @param documentType - The document type to clean up
 * @param keepCurrent - Whether to keep the current file (default: true)
 */
export async function cleanupOldVerificationFiles(
  providerId: string,
  documentType: 'passport' | 'driving_license' | 'id_card' | 'selfie',
  keepCurrent: boolean = true
): Promise<void> {
  try {
    const folder = documentType === 'selfie' ? 'verification' : 'verification';
    const prefix = `${folder}/${providerId}/`;

    console.log(`Cleanup: Starting cleanup for provider ${providerId}, documentType ${documentType}, prefix ${prefix}`);

    // List all files in the provider's folder
    const { data: files, error } = await supabase.storage
      .from('verification-images')
      .list(prefix);

    if (error) {
      console.error('Error listing files for cleanup:', error);
      return;
    }

    console.log(`Cleanup: Found ${files?.length || 0} files in ${prefix}:`, files?.map(f => f.name));

    if (!files || files.length === 0) {
      console.log('Cleanup: No files found to clean up');
      return;
    }

    // Filter files to delete based on document type
    const filesToDelete = files.filter(file => {
      // Skip placeholder files
      if (file.name === '.emptyFolderPlaceholder') return false;

      // For verification documents, check if filename starts with document type
      // This handles both old format (documentType.jpeg) and new format (documentType_timestamp.jpeg)
      const startsWithDocumentType = file.name.startsWith(`${documentType}.`) || file.name.startsWith(`${documentType}_`);
      console.log(`Cleanup: File ${file.name}, startsWithDocumentType: ${startsWithDocumentType}`);
      return startsWithDocumentType;
    });

    console.log(`Cleanup: filesToDelete:`, filesToDelete.map(f => f.name));

    if (filesToDelete.length === 0) {
      console.log('Cleanup: No files to delete');
      return;
    }

    // Delete old files
    const filePaths = filesToDelete.map(file => `${prefix}${file.name}`);
    console.log(`Cleanup: Deleting files:`, filePaths);
    
    const { error: deleteError } = await supabase.storage
      .from('verification-images')
      .remove(filePaths);

    if (deleteError) {
      console.error('Error deleting old files:', deleteError);
    } else {
      console.log(`Cleaned up ${filesToDelete.length} old verification files for provider ${providerId}`);
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

/**
 * Upload a file to Supabase Storage
 * @param bucket - The storage bucket name
 * @param fileUri - The file URI from Expo Image Picker or File System
 * @param fileName - The desired file name in storage
 * @param contentType - The MIME type of the file
 * @param onProgress - Optional progress callback
 * @returns Promise<UploadResult>
 */
export async function uploadFile(
  bucket: string,
  fileUri: string,
  fileName: string,
  contentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // For React Native, we need to read the file as base64 or blob
    let fileData: ArrayBuffer | Blob;

    if (Platform.OS === 'web') {
      // Web platform - fetch the file
      const response = await fetch(fileUri);
      fileData = await response.arrayBuffer();
    } else {
      // Native platforms - read from file system
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'File does not exist' };
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64' as any,
      });

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileData = bytes.buffer;
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL if bucket is public
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: data.path,
    };
  } catch (error) {
    console.error('File upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Upload a verification document (ID, passport, etc.)
 * @param fileUri - The file URI
 * @param documentType - Type of document (passport, driving_license, id_card)
 * @param providerId - The provider's UUID
 * @returns Promise<UploadResult>
 */
export async function uploadVerificationDocument(
  fileUri: string,
  documentType: 'passport' | 'driving_license' | 'id_card',
  providerId: string
): Promise<UploadResult> {
  // Clean up old files before uploading new one
  await cleanupOldVerificationFiles(providerId, documentType);

  const timestamp = Date.now();
  const fileExtension = getFileExtension(fileUri);
  // Use unique filename with timestamp to avoid conflicts
  const fileName = `verification/${providerId}/${documentType}_${timestamp}.${fileExtension}`;
  const contentType = getContentType(fileUri);

  return uploadFile('verification-images', fileUri, fileName, contentType);
}

/**
 * Upload a selfie verification image
 * @param fileUri - The file URI
 * @param providerId - The provider's UUID
 * @returns Promise<UploadResult>
 */
export async function uploadSelfieVerification(
  fileUri: string,
  providerId: string
): Promise<UploadResult> {
  // Clean up old selfie files before uploading new one
  await cleanupOldVerificationFiles(providerId, 'selfie');

  const timestamp = Date.now();
  const fileExtension = getFileExtension(fileUri);
  // Use unique filename with timestamp to avoid conflicts
  const fileName = `verification/${providerId}/selfie_${timestamp}.${fileExtension}`;
  const contentType = getContentType(fileUri);

  return uploadFile('verification-images', fileUri, fileName, contentType);
}

/**
 * Upload a portfolio image
 * @param fileUri - The file URI
 * @param providerId - The provider's UUID
 * @param index - Index for multiple images (optional)
 * @returns Promise<UploadResult>
 */
export async function uploadPortfolioImage(
  fileUri: string,
  providerId: string,
  index?: number
): Promise<UploadResult> {
  const timestamp = Date.now();
  const fileExtension = getFileExtension(fileUri);
  const indexSuffix = index !== undefined ? `_${index}` : '';
  const fileName = `portfolio/${providerId}/image_${timestamp}${indexSuffix}.${fileExtension}`;
  const contentType = getContentType(fileUri);

  return uploadFile('verification-images', fileUri, fileName, contentType);
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param fileName - The file name/path in storage
 * @returns Promise<boolean>
 */
export async function deleteFile(bucket: string, fileName: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('File deletion failed:', error);
    return false;
  }
}

/**
 * Check if a file exists in Supabase storage
 * @param fileUrl - The file URL or path
 * @returns Promise<boolean>
 */
export async function checkFileExists(fileUrl: string): Promise<boolean> {
  try {
    // Extract the file path from the URL
    // Handle both public and signed URLs:
    // Public: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    // Signed: https://[project].supabase.co/storage/v1/object/sign/[bucket]/[path]?token=...
    let urlParts;
    let filePath;

    if (fileUrl.includes('/storage/v1/object/public/verification-images/')) {
      urlParts = fileUrl.split('/storage/v1/object/public/verification-images/');
      if (urlParts.length !== 2) {
        console.error('Invalid public file URL format for existence check:', fileUrl);
        return false;
      }
      filePath = urlParts[1];
    } else if (fileUrl.includes('/storage/v1/object/sign/verification-images/')) {
      urlParts = fileUrl.split('/storage/v1/object/sign/verification-images/');
      if (urlParts.length !== 2) {
        console.error('Invalid signed file URL format for existence check:', fileUrl);
        return false;
      }
      // Remove query parameters (token) from signed URL
      filePath = urlParts[1].split('?')[0];
    } else {
      console.error('Unsupported file URL format for existence check:', fileUrl);
      return false;
    }

    // Try to get file info (this will fail if file doesn't exist)
    const { data, error } = await supabase.storage
      .from('verification-images')
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        limit: 1000,
        search: filePath.substring(filePath.lastIndexOf('/') + 1)
      });

    if (error) {
      console.error('Error checking file existence:', error);
      return false;
    }

    // Check if the file exists in the list
    return data && data.some(file => file.name === filePath.substring(filePath.lastIndexOf('/') + 1));
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

/**
 * Get a signed URL for secure file access
 * @param fileUrl - The file URL to sign (can be public or already signed)
 * @param expiresIn - Expiration time in seconds (default 3600 = 1 hour)
 * @returns Promise<string>
 */
export async function getSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
  try {
    let filePath: string;

    // Check if it's already a signed URL
    if (fileUrl.includes('/storage/v1/object/sign/verification-images/')) {
      // Extract file path from signed URL (remove query parameters)
      const urlParts = fileUrl.split('/storage/v1/object/sign/verification-images/');
      if (urlParts.length !== 2) {
        console.error('Invalid signed file URL format:', fileUrl);
        return fileUrl; // Return original URL as fallback
      }
      filePath = urlParts[1].split('?')[0]; // Remove query parameters
    }
    // Check if it's a public URL
    else if (fileUrl.includes('/storage/v1/object/public/verification-images/')) {
      // Extract the file path from the public URL
      const urlParts = fileUrl.split('/storage/v1/object/public/verification-images/');
      if (urlParts.length !== 2) {
        console.error('Invalid public file URL format:', fileUrl);
        return fileUrl; // Return original URL as fallback
      }
      filePath = urlParts[1];
    } else {
      console.error('Unsupported URL format for signing:', fileUrl);
      return fileUrl; // Return original URL as fallback
    }

    // Get signed URL
    const { data, error } = await supabase.storage
      .from('verification-images')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return fileUrl; // Return original URL as fallback
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return fileUrl; // Return original URL as fallback
  }
}

/**
 * Validate file size (max 10MB)
 * @param fileUri - The file URI to check
 * @returns Promise<boolean>
 */
export async function validateFileSize(fileUri: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const maxSize = 10 * 1024 * 1024; // 10MB
    return fileInfo.exists && fileInfo.size <= maxSize;
  } catch (error) {
    console.error('Error validating file size:', error);
    return false;
  }
}

/**
 * Validate file type (JPG, PNG, PDF)
 * @param fileUri - The file URI to check
 * @returns boolean
 */
export function validateFileType(fileUri: string): boolean {
  // For camera photos, be more lenient since they might not have proper extensions
  if (fileUri.includes('ImagePicker') || fileUri.startsWith('file://')) {
    // Allow camera photos - we'll validate by trying to get file info
    return true;
  }

  const extension = getFileExtension(fileUri);
  const allowedTypes = ['jpg', 'jpeg', 'png', 'pdf'];
  return allowedTypes.includes(extension);
}