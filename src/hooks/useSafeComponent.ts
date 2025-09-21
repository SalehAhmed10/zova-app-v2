import React from 'react';
import { router } from 'expo-router';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useErrorReporting } from '@/lib/error-reporting';

/**
 * Custom hook to safely execute async functions with error handling
 */
export function useSafeAsync() {
  const { reportError } = useErrorReporting();

  const executeAsync = React.useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options?: {
        onError?: (error: Error) => void;
        defaultValue?: T;
        metadata?: Record<string, any>;
      }
    ): Promise<T | undefined> => {
      try {
        return await asyncFn();
      } catch (error) {
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        
        // Report the error
        reportError(errorInstance, 'error', options?.metadata);

        // Call custom error handler if provided
        options?.onError?.(errorInstance);

        // Return default value if provided
        return options?.defaultValue;
      }
    },
    [reportError]
  );

  return { executeAsync };
}

/**
 * Custom hook for safe state updates (prevents updates after unmount)
 */
export function useSafeState<T>(initialState: T | (() => T)) {
  const [state, setState] = React.useState(initialState);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = React.useCallback(
    (value: T | ((prevState: T) => T)) => {
      if (isMountedRef.current) {
        setState(value);
      }
    },
    []
  );

  return [state, safeSetState] as const;
}

/**
 * Custom hook for safe navigation with error handling
 */
export function useSafeNavigation() {
  const { reportError } = useErrorReporting();

  const navigate = React.useCallback(
    (path: string, options?: { replace?: boolean }) => {
      try {
        if (options?.replace) {
          router.replace(path as any);
        } else {
          router.push(path as any);
        }
      } catch (error) {
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        reportError(errorInstance, 'error', {
          source: 'navigation',
          path,
          options,
        });
      }
    },
    [reportError]
  );

  const goBack = React.useCallback(() => {
    try {
      router.back();
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      reportError(errorInstance, 'error', {
        source: 'navigation',
        action: 'back',
      });
    }
  }, [reportError]);

  return { navigate, goBack };
}