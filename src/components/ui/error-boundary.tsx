import React from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Text } from './text';
import { Button } from './button';
import { Card, CardContent } from './card';
import { handleErrorBoundaryError } from '@/lib/monitoring/error-reporting';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'app' | 'screen' | 'component';
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  retry: () => void;
  level: 'app' | 'screen' | 'component';
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('🚨 Error Boundary Caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      level: this.props.level || 'component',
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Use centralized error reporting service
    handleErrorBoundaryError(error, errorInfo);
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo!}
            retry={this.retry}
            level={this.props.level || 'component'}
          />
        );
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo!}
          retry={this.retry}
          level={this.props.level || 'component'}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, errorInfo, retry, level }: ErrorFallbackProps) {
  const isAppLevel = level === 'app';
  const isScreenLevel = level === 'screen';

  const handleGoHome = () => {
    router.replace('/');
  };

  const handleRestart = () => {
    // For app-level errors, we might want to restart the entire app
    // This is a placeholder - in a real app you might use a library like react-native-restart
    if (isAppLevel) {
      // TODO: Implement app restart functionality
      handleGoHome();
    } else {
      retry();
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView 
        className="flex-1 px-6 py-8"
        contentContainerStyle={{ justifyContent: 'center', minHeight: '100%' }}
      >
        <View className="items-center mb-8">
          {/* Error Icon */}
          <View className="w-20 h-20 bg-destructive/10 rounded-full items-center justify-center mb-4">
            <Text className="text-4xl">💥</Text>
          </View>

          {/* Error Title */}
          <Text className="text-2xl font-bold text-foreground mb-2 text-center">
            {isAppLevel ? 'App Error' : isScreenLevel ? 'Screen Error' : 'Something went wrong'}
          </Text>

          {/* Error Description */}
          <Text className="text-base text-muted-foreground text-center mb-6">
            {isAppLevel 
              ? 'The app encountered an unexpected error and needs to restart.'
              : isScreenLevel
              ? 'This screen encountered an error. You can try again or go back.'
              : 'This component encountered an error. You can try again.'
            }
          </Text>
        </View>

        {/* Error Details (Development Only) */}
        {__DEV__ && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <Text className="font-semibold text-foreground mb-2">Error Details (Development)</Text>
              <Text className="text-xs text-muted-foreground mb-2 font-mono">
                {error.message}
              </Text>
              {error.stack && (
                <ScrollView className="max-h-32 bg-muted/20 rounded p-2" horizontal>
                  <Text className="text-xs text-muted-foreground font-mono">
                    {error.stack}
                  </Text>
                </ScrollView>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <View className="gap-3">
          <Button onPress={handleRestart} size="lg" className="w-full">
            <Text className="text-primary-foreground font-semibold">
              {isAppLevel ? 'Restart App' : 'Try Again'}
            </Text>
          </Button>

          {!isAppLevel && (
            <Button onPress={handleGoHome} variant="outline" size="lg" className="w-full">
              <Text className="text-foreground font-semibold">Go to Home</Text>
            </Button>
          )}

          {isScreenLevel && (
            <Button 
              onPress={() => router.back()} 
              variant="ghost" 
              size="lg" 
              className="w-full"
            >
              <Text className="text-muted-foreground">Go Back</Text>
            </Button>
          )}
        </View>

        {/* Help Text */}
        <Text className="text-xs text-muted-foreground text-center mt-6">
          If this problem persists, please contact support with error ID: {Date.now()}
        </Text>
      </ScrollView>
    </View>
  );
}

// Convenience hook for error reporting
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    console.error('🚨 Manual Error Report:', {
      error: error.message,
      stack: error.stack,
      info: errorInfo,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send to crash reporting service
    // reportError(error, { componentStack: errorInfo || '' }, `manual_${Date.now()}`, 'manual');
  }, []);
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}