import * as z from 'zod';
import {
  createRequiredString,
  createOptionalString,
  emailField,
  phoneField,
  passwordField,
  createPasswordConfirmation,
  userRoleEnum
} from './schemas';

// ✅ User Authentication Schemas
export const signUpSchema = z.object({
  email: emailField,
  password: passwordField,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: createRequiredString('First name', 2)
    .max(50, 'First name must be less than 50 characters'),
  lastName: createRequiredString('Last name', 2)  
    .max(50, 'Last name must be less than 50 characters'),
  phone: phoneField,
  role: userRoleEnum,
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  }),
  marketingOptIn: z.boolean().default(false)
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }
);

export type SignUpFormData = z.infer<typeof signUpSchema>;

// ✅ Sign In Schema
export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false)
});

export type SignInFormData = z.infer<typeof signInSchema>;

// ✅ Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: emailField
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ✅ Reset Password Schema
export const resetPasswordSchema = z.object({
  token: createRequiredString('Reset token'),
  password: passwordField,
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match", 
    path: ["confirmPassword"]
  }
);

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ✅ Change Password Schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
  confirmPassword: z.string().min(1, 'Please confirm your new password')
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "New passwords don't match",
    path: ["confirmPassword"]
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: "New password must be different from current password",
    path: ["newPassword"]
  }
);

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ✅ OTP Verification Schema
export const otpVerificationSchema = z.object({
  otp: z.string()
    .min(1, 'Verification code is required')
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Verification code must contain only numbers'),
  email: emailField.optional(),
  phone: phoneField.optional()
});

export type OtpVerificationFormData = z.infer<typeof otpVerificationSchema>;

// ✅ Profile Update Schema
export const profileUpdateSchema = z.object({
  firstName: createRequiredString('First name', 2)
    .max(50, 'First name must be less than 50 characters'),
  lastName: createRequiredString('Last name', 2)
    .max(50, 'Last name must be less than 50 characters'),
  phone: phoneField,
  dateOfBirth: z.date().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  bio: createOptionalString(500),
  location: z.object({
    address: createOptionalString(200),
    city: createOptionalString(100),
    state: createOptionalString(100),
    zipCode: createOptionalString(20),
    country: createOptionalString(100)
  }).optional(),
  preferences: z.object({
    notifications: z.boolean().default(true),
    emailMarketing: z.boolean().default(false),
    smsMarketing: z.boolean().default(false),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en')
  }).optional()
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

// ✅ Contact Information Schema
export const contactInfoSchema = z.object({
  email: emailField,
  phone: phoneField,
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  socialMedia: z.object({
    instagram: createOptionalString(50),
    facebook: createOptionalString(50),
    twitter: createOptionalString(50),
    linkedin: createOptionalString(50)
  }).optional()
});

export type ContactInfoFormData = z.infer<typeof contactInfoSchema>;