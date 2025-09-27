import * as z from 'zod';
import {
  createRequiredString,
  createOptionalString,
  createNumericString,
  createIntegerString,
  priceField,
  percentageField,
  durationField,
  priceTypeEnum
} from './schemas';

// ✅ Service Management Validation
export const serviceSchema = z.object({
  title: createRequiredString('Service name', 3)
    .max(100, 'Service name must be less than 100 characters'),
  
  category: createRequiredString('Category'),
  
  subcategory: createRequiredString('Subcategory'),
  
  price: priceField,
  
  duration: durationField,
  
  priceType: priceTypeEnum,
  
  description: createOptionalString(500),
  
  isActive: z.boolean().default(true),
  
  // Business Terms
  depositPercentage: percentageField.default('20'),
  
  cancellationPolicy: createOptionalString(1000),
  
  houseCallAvailable: z.boolean().default(false),
  
  houseCallExtraFee: createNumericString('House call fee', 0).default('0'),
  
  allowsSosBooking: z.boolean().default(false)
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

// ✅ Service Category Validation
export const serviceCategorySchema = z.object({
  name: createRequiredString('Category name', 2)
    .max(50, 'Category name must be less than 50 characters'),
  
  description: createOptionalString(200),
  
  icon: createOptionalString(10),
  
  isActive: z.boolean().default(true),
  
  sortOrder: createIntegerString('Sort order', 0).optional()
});

export type ServiceCategoryData = z.infer<typeof serviceCategorySchema>;

// ✅ Service Subcategory Validation
export const serviceSubcategorySchema = z.object({
  categoryId: createRequiredString('Category'),
  
  name: createRequiredString('Subcategory name', 2)
    .max(50, 'Subcategory name must be less than 50 characters'),
  
  description: createOptionalString(200),
  
  basePrice: priceField.optional(),
  
  estimatedDuration: durationField.optional(),
  
  isActive: z.boolean().default(true)
});

export type ServiceSubcategoryData = z.infer<typeof serviceSubcategorySchema>;

// ✅ Booking Validation
export const bookingSchema = z.object({
  serviceId: createRequiredString('Service'),
  
  providerId: createRequiredString('Provider'),
  
  customerId: createRequiredString('Customer'),
  
  scheduledDate: z.date({
    required_error: 'Booking date is required',
    invalid_type_error: 'Please select a valid date'
  }),
  
  scheduledTime: z.string()
    .min(1, 'Booking time is required')
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)'),
  
  duration: durationField,
  
  totalAmount: priceField,
  
  depositAmount: priceField.optional(),
  
  isHouseCall: z.boolean().default(false),
  
  houseCallAddress: createOptionalString(200),
  
  specialRequests: createOptionalString(500),
  
  isSosBooking: z.boolean().default(false)
});

export type BookingFormData = z.infer<typeof bookingSchema>;

// ✅ Provider Profile Validation
export const providerProfileSchema = z.object({
  businessName: createRequiredString('Business name', 2)
    .max(100, 'Business name must be less than 100 characters'),
  
  description: createOptionalString(1000),
  
  experienceYears: createIntegerString('Years of experience', 0, 50),
  
  specializations: z.array(z.string()).min(1, 'Please select at least one specialization'),
  
  workingHours: z.object({
    monday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    tuesday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    wednesday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    thursday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    friday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    saturday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    }),
    sunday: z.object({
      isOpen: z.boolean(),
      openTime: z.string().optional(),
      closeTime: z.string().optional()
    })
  }),
  
  serviceRadius: createIntegerString('Service radius', 1, 100), // kilometers
  
  acceptsHouseCalls: z.boolean().default(false),
  
  averageResponseTime: createIntegerString('Average response time', 1, 1440) // minutes
});

export type ProviderProfileData = z.infer<typeof providerProfileSchema>;