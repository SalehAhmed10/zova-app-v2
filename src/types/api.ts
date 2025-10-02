// API response and request types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Common API query parameters
export interface BaseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Booking related types
export interface BookingData {
  id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  total_amount: number;
  deposit_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  provider?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  service?: {
    name: string;
    description: string;
    price: number;
  };
}

// Service related types
export interface Service {
  id: string;
  provider_id: string;
  title: string;
  name?: string; // Keep for backward compatibility
  description: string;
  category: string;
  price: number;
  duration: number;
  is_active: boolean;
  isHomeService?: boolean;
  isRemoteService?: boolean;
  rating?: number;
  images: string[];
  created_at: string;
  updated_at: string;
  provider?: {
    id: string;
    name: string;
    avatar: string;
    bio?: string;
    location?: string;
    rating?: number;
    yearsOfExperience?: number;
    years_of_experience?: number;
  };
}

// Provider related types
export interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  rating: number;
  review_count: number;
  verification_status: 'pending' | 'in_review' | 'approved' | 'rejected';
  services: Service[];
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}