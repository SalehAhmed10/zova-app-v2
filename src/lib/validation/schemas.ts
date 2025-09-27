import * as z from 'zod';

// ✅ Base validation utilities
export const createRequiredString = (fieldName: string, minLength = 1) =>
  z.string()
    .min(1, `${fieldName} is required`)
    .min(minLength, `${fieldName} must be at least ${minLength} characters`);

export const createOptionalString = (maxLength?: number) => {
  if (maxLength) {
    return z.string().optional().refine(
      (val) => !val || val.length <= maxLength,
      `Must be less than ${maxLength} characters`
    );
  }
  return z.string().optional();
};

export const createNumericString = (fieldName: string, min?: number, max?: number) => {
  return z.string()
    .min(1, `${fieldName} is required`)
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num);
    }, `${fieldName} must be a valid number`)
    .refine((val) => {
      const num = parseFloat(val);
      return min === undefined || num >= min;
    }, min !== undefined ? `${fieldName} must be at least ${min}` : '')
    .refine((val) => {
      const num = parseFloat(val);
      return max === undefined || num <= max;
    }, max !== undefined ? `${fieldName} must be at most ${max}` : '');
};

export const createIntegerString = (fieldName: string, min?: number, max?: number) => {
  return z.string()
    .min(1, `${fieldName} is required`)
    .refine((val) => {
      const num = parseInt(val);
      return !isNaN(num);
    }, `${fieldName} must be a valid whole number`)
    .refine((val) => {
      const num = parseInt(val);
      return min === undefined || num >= min;
    }, min !== undefined ? `${fieldName} must be at least ${min}` : '')
    .refine((val) => {
      const num = parseInt(val);
      return max === undefined || num <= max;
    }, max !== undefined ? `${fieldName} must be at most ${max}` : '');
};

// ✅ Common field patterns
export const emailField = z.string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const phoneField = z.string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number');

export const passwordField = z.string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

export const confirmPasswordField = (passwordFieldName = 'password') =>
  z.string().min(1, 'Please confirm your password');

// Helper to create password confirmation schema
export const createPasswordConfirmation = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;

// ✅ Price and currency patterns
export const priceField = createNumericString('Price', 0.01);
export const percentageField = createNumericString('Percentage', 0, 100);
export const durationField = createIntegerString('Duration', 1, 600); // 1-600 minutes

// ✅ Service-related enums
export const priceTypeEnum = z.enum(['fixed', 'hourly'], {
  required_error: 'Price type is required',
  invalid_type_error: 'Price type must be either fixed or hourly'
});

export const serviceStatusEnum = z.enum(['active', 'inactive', 'draft'], {
  required_error: 'Service status is required'
});

export const subscriptionTypeEnum = z.enum(['customer_sos', 'provider_premium'], {
  required_error: 'Subscription type is required'
});

export const userRoleEnum = z.enum(['customer', 'provider', 'admin'], {
  required_error: 'User role is required'
});

export const verificationStatusEnum = z.enum(['pending', 'approved', 'rejected', 'incomplete'], {
  required_error: 'Verification status is required'
});