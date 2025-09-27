import { FieldError, FieldErrors } from 'react-hook-form';

// ✅ Form utilities that follow copilot-rules.md - NO useEffect patterns

/**
 * Get the first error message from a field error object
 */
export const getFieldError = (error?: FieldError): string | undefined => {
  if (!error) return undefined;
  return error.message;
};

/**
 * Check if form has any errors
 */
export const hasFormErrors = (errors: FieldErrors): boolean => {
  return Object.keys(errors).length > 0;
};

/**
 * Get count of form errors
 */
export const getFormErrorCount = (errors: FieldErrors): number => {
  return Object.keys(errors).length;
};

/**
 * Get all error messages from form errors object
 */
export const getAllFormErrors = (errors: FieldErrors): string[] => {
  const errorMessages: string[] = [];
  
  Object.values(errors).forEach(error => {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      errorMessages.push(error.message);
    }
  });
  
  return errorMessages;
};

/**
 * Format error messages for display
 */
export const formatErrorMessages = (errors: string[]): string => {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  
  return `Please fix the following errors:\n• ${errors.join('\n• ')}`;
};

/**
 * Create form default values from existing data
 * This replaces useEffect patterns for setting form values
 */
export const createFormDefaults = <T extends Record<string, any>>(
  existingData: T | undefined,
  fallbackDefaults: Partial<T>
): Partial<T> => {
  if (!existingData) return fallbackDefaults;
  
  // Merge existing data with fallbacks, existing data takes precedence
  return { ...fallbackDefaults, ...existingData };
};

/**
 * Transform form data for API submission
 * This replaces manual data transformation in form handlers
 */
export const transformFormDataForAPI = <TForm, TApi>(
  formData: TForm,
  transformer: (data: TForm) => TApi
): TApi => {
  return transformer(formData);
};

/**
 * Validate conditional fields without useEffect
 * Use this in onPress handlers or Controller render props
 */
export const validateConditionalField = (
  condition: boolean,
  value: string | undefined,
  errorMessage: string
): string | undefined => {
  if (condition && (!value || value.trim().length === 0)) {
    return errorMessage;
  }
  return undefined;
};

/**
 * Handle form field dependencies without useEffect
 * Use this in Controller render props when one field affects another
 */
export const handleFieldDependency = <T>(
  triggerValue: T,
  dependentFieldSetter: (value: any) => void,
  valueMapper: (trigger: T) => any
) => {
  const dependentValue = valueMapper(triggerValue);
  dependentFieldSetter(dependentValue);
};

/**
 * Create a form submission handler with proper error handling
 * This follows React Query + Zustand patterns from copilot-rules.md
 */
export const createFormSubmitHandler = <TFormData>(
  onSubmit: (data: TFormData) => void | Promise<void>,
  onSuccess?: () => void,
  onError?: (error: Error) => void
) => {
  return async (data: TFormData) => {
    try {
      await onSubmit(data);
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    }
  };
};

/**
 * Debounce function for real-time validation
 * Use instead of useEffect for input validation
 */
export const createDebouncedValidator = (
  validateFn: (value: string) => boolean,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;
  
  return (value: string, callback: (isValid: boolean) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const isValid = validateFn(value);
      callback(isValid);
    }, delay);
  };
};