/**
 * Validation schemas for authentication using Zod
 * ✅ Follows copilot-rules.md requirements
 * ✅ Comprehensive validation with proper error messages
 * ✅ TypeScript-first with runtime validation
 */

import { z } from 'zod';

// Email validation schema
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
  .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/^(?=.*\d)/, 'Password must contain at least one number')
  .max(128, 'Password must be less than 128 characters');

// Name validation schemas
export const firstNameSchema = z
  .string()
  .min(1, 'First name is required')
  .min(2, 'First name must be at least 2 characters')
  .max(50, 'First name must be less than 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

export const lastNameSchema = z
  .string()
  .min(1, 'Last name is required')
  .min(2, 'Last name must be at least 2 characters')
  .max(50, 'Last name must be less than 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

// Role validation schema
export const roleSchema = z.enum(['customer', 'provider'], {
  required_error: 'Please select your role',
  invalid_type_error: 'Invalid role selected'
});

// OTP validation schema
export const otpSchema = z
  .string()
  .min(6, 'OTP must be 6 digits')
  .max(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'), // Less strict for login
});

// Registration form schema
export const registrationSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  role: roleSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// OTP verification schema
export const otpVerificationSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  role: roleSchema,
});

// Password reset schema
export const passwordResetSchema = z.object({
  email: emailSchema,
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match",
  path: ["confirmNewPassword"],
});

// Export types for TypeScript
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegistrationFormData = z.infer<typeof registrationSchema>;
export type OtpVerificationData = z.infer<typeof otpVerificationSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;