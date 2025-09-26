/**
 * Enhanced Supabase Storage Utility with Organized Paths
 * 
 * This utility provides organized file upload, download, and management
 * using the centralized path system.
 */

import { supabase } from '../core/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { 
  ProviderVerificationPaths, 
  StoragePathUtils, 
  STORAGE_CONFIG,
  createProviderPaths 
} from './storage-paths';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  filePath?: string;
  isPublic?: boolean;
}

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
  expiresAt?: Date;
}

/**
 * Enhanced Storage Service with Organized Paths
 */
export class OrganizedStorageService {
  private providerId: string;
  private paths: ProviderVerificationPaths;

  constructor(providerId: string) {
    this.providerId = providerId;
    this.paths = createProviderPaths(providerId);
  }

  /**
   * Upload Identity Verification Document
   */
  async uploadIdentityDocument(
    imageUri: string,
    documentType: 'passport' | 'driving_license' | 'id_card',
    timestamp?: number
  ): Promise<UploadResult> {
    const filePath = this.paths.documentVerification.document(documentType, timestamp);
    return this.uploadToPrivateBucket(imageUri, filePath);
  }

  /**
   * Upload Selfie for Verification
   */
  async uploadSelfie(imageUri: string, timestamp?: number): Promise<UploadResult> {
    // Clean up old selfie files first
    await this.cleanupOldSelfieFiles();

    const filePath = this.paths.selfie.selfieWithTimestamp(timestamp);
    return this.uploadToPrivateBucket(imageUri, filePath);
  }

  /**
   * Upload Business Document
   */
  async uploadBusinessDocument(
    fileUri: string,
    documentType: string,
    timestamp?: number,
    extension = 'pdf'
  ): Promise<UploadResult> {
    const filePath = this.paths.businessInfo.document(documentType, timestamp, extension);
    return this.uploadToPrivateBucket(fileUri, filePath);
  }

  /**
   * Upload Portfolio Image
   */
  async uploadPortfolioImage(
    imageUri: string,
    index: number,
    timestamp?: number
  ): Promise<UploadResult> {
    const filePath = this.paths.portfolio.image(index, timestamp);
    return this.uploadToPrivateBucket(imageUri, filePath);
  }

  /**
   * Upload Bio/Profile Image
   */
  async uploadBioImage(
    imageUri: string,
    type: 'profile' | 'cover',
    timestamp?: number
  ): Promise<UploadResult> {
    const filePath = type === 'profile' 
      ? this.paths.bio.profileImageWithTimestamp(timestamp)
      : this.paths.bio.coverImageWithTimestamp(timestamp);
    return this.uploadToPrivateBucket(imageUri, filePath);
  }

  /**
   * Upload Terms Acceptance Document
   */
  async uploadTermsDocument(
    fileUri: string,
    timestamp?: number
  ): Promise<UploadResult> {
    const filePath = this.paths.terms.acceptanceDocument(timestamp);
    return this.uploadToPrivateBucket(fileUri, filePath);
  }

  /**
   * Upload Payment Verification Document
   */
  async uploadPaymentDocument(
    imageUri: string,
    documentId: string,
    timestamp?: number
  ): Promise<UploadResult> {
    const filePath = this.paths.payment.stripeDocument(documentId, timestamp);
    return this.uploadToPrivateBucket(imageUri, filePath);
  }

  /**
   * Get Signed URL for Private File
   */
  async getSignedUrl(filePath: string): Promise<SignedUrlResult> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_CONFIG.buckets.verification)
        .createSignedUrl(filePath, STORAGE_CONFIG.signedUrlExpiry);

      if (error) {
        // Only log as error if it's not a "file not found" case
        if (error.message?.includes('Object not found')) {
          console.log('File not found (expected during migration):', filePath);
        } else {
          console.error('Failed to create signed URL:', error);
        }
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'No signed URL returned' };
      }

      const expiresAt = new Date(Date.now() + STORAGE_CONFIG.signedUrlExpiry * 1000);

      return {
        success: true,
        signedUrl: data.signedUrl,
        expiresAt
      };
    } catch (error) {
      // Only log as error if it's not a "file not found" case
      if (error instanceof Error && error.message?.includes('Object not found')) {
        console.log('File not found (expected during migration):', filePath);
      } else {
        console.error('Error creating signed URL:', error);
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get Multiple Signed URLs for Portfolio Images
   */
  async getPortfolioSignedUrls(portfolioImages: Array<{ image_url: string; id: string }>): Promise<Array<{ id: string; signedUrl: string | null }>> {
    const results = await Promise.all(
      portfolioImages.map(async (img) => {
        // Extract file path from stored URL
        let filePath = StoragePathUtils.extractFilePathFromUrl(img.image_url) || img.image_url;
        
        // Try the extracted path first
        let result = await this.getSignedUrl(filePath);
        
        // If not found, try to migrate from old path format
        if (!result.success) {
          console.log('Portfolio image not found at extracted path, trying migration');
          
          // Extract filename from the path
          const pathParts = filePath.split('/');
          const filename = pathParts[pathParts.length - 1];
          
          if (filename && filename.startsWith('image_')) {
            // Try new organized path
            const newPath = `providers/${this.providerId}/portfolio/${filename}`;
            console.log('Trying new organized path for portfolio:', newPath);
            
            result = await this.getSignedUrl(newPath);
            
            if (result.success) {
              console.log('Found portfolio image with new organized path');
            }
          }
        }
        
        return {
          id: img.id,
          signedUrl: result.success ? result.signedUrl! : null
        };
      })
    );

    return results;
  }

  /**
   * Delete File
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    const bucket = StoragePathUtils.getBucketForPath(filePath);
    
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('File deletion failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown deletion error'
      };
    }
  }

  /**
   * Clean up old selfie files for this provider
   */
  private async cleanupOldSelfieFiles(): Promise<void> {
    try {
      const selfieFolder = this.paths.selfie.folder();
      
      // List all files in the selfie folder
      const { data: files, error } = await supabase.storage
        .from(STORAGE_CONFIG.buckets.verification)
        .list(selfieFolder);

      if (error) {
        console.error('Error listing selfie files for cleanup:', error);
        return;
      }

      if (!files || files.length === 0) {
        console.log('No selfie files found to clean up');
        return;
      }

      // Filter files to delete (only selfie files)
      const selfieFilesToDelete = files.filter(file => {
        // Skip placeholder files
        if (file.name === '.emptyFolderPlaceholder') return false;
        
        // Only delete selfie files
        return file.name.startsWith('selfie.');
      });

      if (selfieFilesToDelete.length === 0) {
        console.log('No old selfie files to delete');
        return;
      }

      // Delete old selfie files
      const filePaths = selfieFilesToDelete.map(file => `${selfieFolder}/${file.name}`);
      console.log(`Cleaning up ${selfieFilesToDelete.length} old selfie files:`, filePaths);
      
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_CONFIG.buckets.verification)
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting old selfie files:', deleteError);
      } else {
        console.log(`Cleaned up ${selfieFilesToDelete.length} old selfie files`);
      }
    } catch (error) {
      console.error('Selfie cleanup failed:', error);
    }
  }

  /**
   * List Files in Provider Folder
   */
  async listFiles(folder: 'documentVerification' | 'selfie' | 'businessInfo' | 'portfolio' | 'services' | 'bio' | 'categories' | 'terms' | 'payment'): Promise<string[]> {
    let folderPath: string;

    switch (folder) {
      case 'documentVerification':
        folderPath = this.paths.documentVerification.folder();
        break;
      case 'selfie':
        folderPath = this.paths.selfie.folder();
        break;
      case 'businessInfo':
        folderPath = this.paths.businessInfo.folder();
        break;
      case 'portfolio':
        folderPath = this.paths.portfolio.folder();
        break;
      case 'services':
        folderPath = this.paths.services.folder();
        break;
      case 'bio':
        folderPath = this.paths.bio.folder();
        break;
      case 'categories':
        folderPath = this.paths.categories.folder();
        break;
      case 'terms':
        folderPath = this.paths.terms.folder();
        break;
      case 'payment':
        folderPath = this.paths.payment.folder();
        break;
    }

    const bucket = StoragePathUtils.getBucketForPath(folderPath);

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folderPath);

      if (error) {
        console.error('Error listing files:', error);
        return [];
      }

      return data?.map(file => `${folderPath}/${file.name}`) || [];
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  /**
   * Private: Upload to Private Bucket
   */
  private async uploadToPrivateBucket(fileUri: string, filePath: string): Promise<UploadResult> {
    return this.uploadFile(fileUri, filePath, STORAGE_CONFIG.buckets.verification, false);
  }

  /**
   * Private: Upload to Public Bucket
   */
  private async uploadToPublicBucket(fileUri: string, filePath: string): Promise<UploadResult> {
    return this.uploadFile(fileUri, filePath, STORAGE_CONFIG.buckets.services, true);
  }

  /**
   * Private: Core Upload Function
   */
  private async uploadFile(
    fileUri: string,
    filePath: string,
    bucket: string,
    isPublic: boolean
  ): Promise<UploadResult> {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'File does not exist' };
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Determine content type
      const fileExtension = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = this.getContentType(fileExtension);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, bytes, {
          contentType,
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get URL
      let url: string;
      if (isPublic) {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        url = urlData.publicUrl;
      } else {
        // For private files, store the file path, generate signed URLs on demand
        url = filePath;
      }

      return {
        success: true,
        url,
        fileName: data.path,
        filePath,
        isPublic
      };
    } catch (error) {
      console.error('File upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Private: Get Content Type
   */
  private getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return contentTypes[extension] || 'application/octet-stream';
  }

}

/**
 * Factory function to create storage service for a provider
 */
export const createStorageService = (providerId: string): OrganizedStorageService => {
  return new OrganizedStorageService(providerId);
};

/**
 * Global utility functions
 */
export const StorageUtils = {
  /**
   * Extract provider ID and create storage service
   */
  forProvider: (providerId: string) => createStorageService(providerId),

  /**
   * Get bucket for file type
   */
  getBucket: StoragePathUtils.getBucketForPath,

  /**
   * Check if file is in private bucket
   */
  isPrivate: StoragePathUtils.isPrivatePath,

  /**
   * Extract file path from URL
   */
  extractPath: StoragePathUtils.extractFilePathFromUrl,

  /**
   * Extract provider ID from path
   */
  extractProviderId: StoragePathUtils.extractProviderId,
};

export default OrganizedStorageService;