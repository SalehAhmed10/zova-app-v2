/**
 * Centralized Storage Path Management for ZOVA Provider Verification
 * 
 * This utility provides organized path generation for all provider verification files
 * across the entire verification workflow.
 */

export interface StorageConfig {
  buckets: {
    verification: 'verification-images';
    services: 'service-images';
  };
  maxFileSizes: {
    identity: 10; // MB
    business: 10; // MB
    portfolio: 5; // MB
    services: 3; // MB
  };
  signedUrlExpiry: 3600; // 1 hour in seconds
}

export const STORAGE_CONFIG: StorageConfig = {
  buckets: {
    verification: 'verification-images',
    services: 'service-images'
  },
  maxFileSizes: {
    identity: 10,
    business: 10,
    portfolio: 5,
    services: 3
  },
  signedUrlExpiry: 3600
};

/**
 * Provider Verification Storage Paths
 * Maps each verification step to its storage location
 */
export class ProviderVerificationPaths {
  private providerId: string;

  constructor(providerId: string) {
    this.providerId = providerId;
  }

  /**
   * Base provider folder path
   */
  get basePath(): string {
    return `providers/${this.providerId}`;
  }

  /**
   * Document Verification Files (Step 1: ID Documents)
   */
  documentVerification = {
    folder: (): string => `${this.basePath}/document-verification`,

    // Individual document paths
    passport: (): string => `${this.basePath}/document-verification/passport.jpeg`,
    drivingLicense: (): string => `${this.basePath}/document-verification/driving_license.jpeg`,
    idCard: (): string => `${this.basePath}/document-verification/id_card.jpeg`,

    // Dynamic document path with timestamp
    document: (type: 'passport' | 'driving_license' | 'id_card', timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/document-verification/${type}_${ts}.jpeg`;
    }
  };

  /**
   * Selfie Verification Files (Step 2: Selfie)
   */
  selfie = {
    folder: (): string => `${this.basePath}/selfie`,

    // Selfie path
    selfie: (): string => `${this.basePath}/selfie/selfie.jpeg`,

    // Selfie with timestamp
    selfieWithTimestamp: (timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/selfie/selfie_${ts}.jpeg`;
    }
  };

  /**
   * Business Information Files (Step 3: Business Info)
   */
  businessInfo = {
    folder: (): string => `${this.basePath}/business-info`,

    // Business documents
    registration: (): string => `${this.basePath}/business-info/business_registration.pdf`,
    taxCertificate: (): string => `${this.basePath}/business-info/tax_certificate.pdf`,
    license: (): string => `${this.basePath}/business-info/business_license.pdf`,

    // Dynamic business document
    document: (type: string, timestamp?: number, extension = 'pdf'): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/business-info/${type}_${ts}.${extension}`;
    }
  };

  /**
   * Portfolio Images (Step 6: Portfolio)
   */
  portfolio = {
    folder: (): string => `${this.basePath}/portfolio`,

    // Portfolio image paths
    image: (index: number, timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/portfolio/image_${index}_${ts}.jpeg`;
    }
  };

  /**
   * Bio/Profile Files (Step 7: Bio)
   */
  bio = {
    folder: (): string => `${this.basePath}/bio`,

    // Bio/profile images
    profileImage: (): string => `${this.basePath}/bio/profile_image.jpeg`,
    coverImage: (): string => `${this.basePath}/bio/cover_image.jpeg`,

    // Dynamic profile image with timestamp
    profileImageWithTimestamp: (timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/bio/profile_image_${ts}.jpeg`;
    },

    coverImageWithTimestamp: (timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/bio/cover_image_${ts}.jpeg`;
    }
  };

  /**
   * Services Files (Step 5: Services)
   */
  services = {
    folder: (): string => `${this.basePath}/services`,

    // Service images
    serviceIcon: (serviceId: string, timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/services/${serviceId}/icon_${ts}.jpeg`;
    },

    serviceBanner: (serviceId: string, timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/services/${serviceId}/banner_${ts}.jpeg`;
    },

    serviceGallery: (serviceId: string, index: number, timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/services/${serviceId}/gallery_${index}_${ts}.jpeg`;
    }
  };

  /**
   * Categories Files (Step 4: Categories)
   */
  categories = {
    folder: (): string => `${this.basePath}/categories`,

    // Category-related files (if needed)
    categoryIcon: (categoryId: string, timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/categories/${categoryId}/icon_${ts}.jpeg`;
    }
  };

  /**
   * Terms & Conditions Files (Step 8: Terms)
   */
  terms = {
    folder: (): string => `${this.basePath}/terms`,

    // Terms acceptance documents
    acceptanceDocument: (timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/terms/acceptance_${ts}.pdf`;
    }
  };

  /**
   * Payment Setup Files (Step 9: Payment)
   */
  payment = {
    folder: (): string => `${this.basePath}/payment`,

    // Payment verification documents
    stripeDocument: (documentId: string, timestamp?: number): string => {
      const ts = timestamp || Date.now();
      return `${this.basePath}/payment/${documentId}_${ts}.jpeg`;
    }
  };
}

/**
 * Storage Path Utility Functions
 */
export class StoragePathUtils {
  /**
   * Extract provider ID from a storage path
   */
  static extractProviderId(path: string): string | null {
    const match = path.match(/^providers\/([a-f0-9-]{36})/);
    return match ? match[1] : null;
  }

  /**
   * Extract file path from full Supabase URL
   */
  static extractFilePathFromUrl(url: string): string | null {
    // Handle public URLs
    if (url.includes('/storage/v1/object/public/')) {
      const parts = url.split('/storage/v1/object/public/');
      if (parts.length > 1) {
        const pathPart = parts[1];
        const bucketAndPath = pathPart.split('/');
        return bucketAndPath.slice(1).join('/'); // Remove bucket name
      }
    }
    
    // Handle signed URLs
    if (url.includes('/storage/v1/object/sign/')) {
      const parts = url.split('/storage/v1/object/sign/');
      if (parts.length > 1) {
        const pathPart = parts[1].split('?')[0]; // Remove query params
        const bucketAndPath = pathPart.split('/');
        return bucketAndPath.slice(1).join('/'); // Remove bucket name
      }
    }
    
    // Assume it's already a file path
    return url;
  }

  /**
   * Get bucket name for a specific file type
   */
  static getBucketForPath(path: string): string {
    if (path.includes('/services/') || path.includes('/profile/')) {
      return STORAGE_CONFIG.buckets.services;
    }
    return STORAGE_CONFIG.buckets.verification;
  }

  /**
   * Check if path is in private or public bucket
   */
  static isPrivatePath(path: string): boolean {
    return StoragePathUtils.getBucketForPath(path) === STORAGE_CONFIG.buckets.verification;
  }

  /**
   * Generate organized path for verification step
   */
  static getPathForVerificationStep(
    providerId: string, 
    step: keyof typeof VERIFICATION_STEP_PATHS, 
    fileName: string
  ): string {
    const paths = new ProviderVerificationPaths(providerId);
    const stepConfig = VERIFICATION_STEP_PATHS[step];
    return `${stepConfig.getFolder(paths)}/${fileName}`;
  }
}

/**
 * Verification Steps to Storage Path Mapping
 */
export const VERIFICATION_STEP_PATHS = {
  // Step 1: Document Verification
  document: {
    step: 1,
    component: 'index.tsx',
    getFolder: (paths: ProviderVerificationPaths) => paths.documentVerification.folder(),
    fileTypes: ['jpeg', 'jpg', 'png', 'pdf'],
    maxFileSize: STORAGE_CONFIG.maxFileSizes.identity,
    bucket: STORAGE_CONFIG.buckets.verification
  },

  // Step 2: Selfie Verification
  selfie: {
    step: 2,
    component: 'selfie.tsx',
    getFolder: (paths: ProviderVerificationPaths) => paths.selfie.folder(),
    fileTypes: ['jpeg', 'jpg', 'png'],
    maxFileSize: STORAGE_CONFIG.maxFileSizes.identity,
    bucket: STORAGE_CONFIG.buckets.verification
  },

  // Step 3: Business Information
  businessInfo: {
    step: 3,
    component: 'business-info.tsx',
    getFolder: (paths: ProviderVerificationPaths) => paths.businessInfo.folder(),
    fileTypes: ['pdf', 'doc', 'docx', 'jpeg', 'jpg', 'png'],
    maxFileSize: STORAGE_CONFIG.maxFileSizes.business,
    bucket: STORAGE_CONFIG.buckets.verification
  },
  
  // Step 4: Services Setup
  services: {
    step: 4,
    component: 'services.tsx',
    getFolder: (paths: ProviderVerificationPaths) => paths.services.folder(),
    fileTypes: ['jpeg', 'jpg', 'png'],
    maxFileSize: STORAGE_CONFIG.maxFileSizes.services,
    bucket: STORAGE_CONFIG.buckets.services
  },
  
  // Step 5: Payment Setup (no files)
  payment: {
    step: 5,
    component: 'payment.tsx',
    getFolder: (paths: ProviderVerificationPaths) => null,
    fileTypes: []
  },
  
  // Step 6: Portfolio Upload
  portfolio: {
    step: 6,
    component: 'portfolio.tsx',
    getFolder: (paths: ProviderVerificationPaths) => paths.portfolio.folder(),
    fileTypes: ['jpeg', 'jpg', 'png'],
    maxFileSize: STORAGE_CONFIG.maxFileSizes.portfolio,
    bucket: STORAGE_CONFIG.buckets.verification
  },
  
  // Step 7: Business Bio
  bio: {
    step: 7,
    component: 'bio.tsx',
    getFolder: (paths: ProviderVerificationPaths) => null,
    fileTypes: []
  },
  
  // Step 8: Terms & Conditions
  terms: {
    step: 8,
    component: 'terms.tsx',
    getFolder: (paths: ProviderVerificationPaths) => null,
    fileTypes: []
  }
} as const;

/**
 * Helper function to create paths for a provider
 */
export const createProviderPaths = (providerId: string): ProviderVerificationPaths => {
  return new ProviderVerificationPaths(providerId);
};

/**
 * Migration helper to convert old paths to new organized structure
 */
export class PathMigrationHelper {
  /**
   * Convert old unorganized path to new organized path
   */
  static migrateToOrganizedPath(oldPath: string, providerId: string): string {
    const paths = new ProviderVerificationPaths(providerId);
    
    // Portfolio images
    if (oldPath.includes('/portfolio/')) {
      const fileName = oldPath.split('/').pop() || '';
      return `${paths.portfolio.folder()}/${fileName}`;
    }
    
    // Identity documents
    if (oldPath.includes('passport')) {
      return paths.documentVerification.passport();
    }
    if (oldPath.includes('driving_license')) {
      return paths.documentVerification.drivingLicense();
    }
    if (oldPath.includes('id_card')) {
      return paths.documentVerification.idCard();
    }
    if (oldPath.includes('selfie')) {
      return paths.selfie.selfie();
    }
    
    // Default: assume it needs to go in providers folder
    return `providers/${providerId}/${oldPath}`;
  }
}

export default {
  ProviderVerificationPaths,
  StoragePathUtils,
  STORAGE_CONFIG,
  VERIFICATION_STEP_PATHS,
  createProviderPaths,
  PathMigrationHelper
};