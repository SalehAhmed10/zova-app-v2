/**
 * ✅ IMAGE HANDLING STORE - Following copilot-rules.md
 * 
 * ARCHITECTURE:
 * - Pure Zustand for image upload state
 * - Built-in retry logic and error handling
 * - NO useState patterns for image management
 * 
 * REPLACES: useState patterns in selfie.tsx and other image screens
 */

import { create } from 'zustand';

interface ImageHandlingState {
  // State
  selectedImage: string | null;
  imageLoadError: boolean;
  isRetrying: boolean;
  retryCount: number;
  uploadProgress: number;
  isUploading: boolean;

  // Actions
  setSelectedImage: (image: string | null) => void;
  setImageLoadError: (error: boolean) => void;
  setIsRetrying: (retrying: boolean) => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
  setUploadProgress: (progress: number) => void;
  setIsUploading: (uploading: boolean) => void;
  reset: () => void;

  // Computed helpers
  canRetry: () => boolean;
  getRetryMessage: () => string;
}

export const useImageHandlingStore = create<ImageHandlingState>((set, get) => ({
  // Initial state
  selectedImage: null,
  imageLoadError: false,
  isRetrying: false,
  retryCount: 0,
  uploadProgress: 0,
  isUploading: false,

  // Actions
  setSelectedImage: (image) => {
    console.log('[ImageHandlingStore] Setting selected image:', image ? 'image selected' : 'image cleared');
    set({ 
      selectedImage: image,
      imageLoadError: false, // Clear error when new image selected
      retryCount: 0, // Reset retry count
      uploadProgress: 0 // Reset progress
    });
  },

  setImageLoadError: (error) => {
    console.log('[ImageHandlingStore] Setting image load error:', error);
    set({ imageLoadError: error });
  },

  setIsRetrying: (retrying) => {
    console.log('[ImageHandlingStore] Setting retry state:', retrying);
    set({ isRetrying: retrying });
  },

  incrementRetryCount: () => {
    const newCount = get().retryCount + 1;
    console.log('[ImageHandlingStore] Incrementing retry count to:', newCount);
    set({ retryCount: newCount });
  },

  resetRetryCount: () => {
    set({ retryCount: 0 });
  },

  setUploadProgress: (progress) => {
    set({ uploadProgress: Math.max(0, Math.min(100, progress)) });
  },

  setIsUploading: (uploading) => {
    console.log('[ImageHandlingStore] Setting upload state:', uploading);
    set({ 
      isUploading: uploading,
      uploadProgress: uploading ? 0 : 100
    });
  },

  reset: () => {
    console.log('[ImageHandlingStore] Resetting all state');
    set({
      selectedImage: null,
      imageLoadError: false,
      isRetrying: false,
      retryCount: 0,
      uploadProgress: 0,
      isUploading: false,
    });
  },

  // Computed helpers
  canRetry: () => {
    return get().retryCount < 3;
  },

  getRetryMessage: () => {
    const count = get().retryCount;
    if (count === 0) return 'Try taking another photo';
    if (count === 1) return 'Please try again';
    if (count === 2) return 'One more try';
    return 'Maximum retries reached';
  },
}));