// UI component types and common interfaces
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  destructive: string;
  success: string;
  warning: string;
  info: string;
}

export interface ComponentVariant {
  variant?: string;
  size?: string;
}

export interface BaseComponentProps {
  className?: string;
  style?: any;
  testID?: string;
}

// Button component types
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

// Modal/Dialog types
export interface ModalProps extends BaseComponentProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// Form types
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends FormFieldProps {
  options: SelectOption[];
  value?: string | number;
  placeholder?: string;
  onValueChange: (value: string | number) => void;
}

// Loading and empty states
export interface LoadingStateProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export interface EmptyStateProps extends BaseComponentProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
}

// Card types
export interface CardProps extends BaseComponentProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

// Avatar types
export interface AvatarProps extends BaseComponentProps {
  source?: { uri: string };
  size?: number;
  fallback?: string;
  onPress?: () => void;
}

// Badge types
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
export interface BadgeProps extends BaseComponentProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}