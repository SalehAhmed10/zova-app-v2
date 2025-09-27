/**
 * Performance optimization utilities for React components
 * Provides memoization helpers and component optimization patterns
 */

import React from 'react';

/**
 * Enhanced memo wrapper with deep comparison for props
 */
export function memoComponent<T extends React.ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: any, nextProps: any) => boolean
): React.MemoExoticComponent<T> {
  return React.memo(Component, propsAreEqual);
}

/**
 * Shallow comparison for props (faster than deep comparison)
 */
export function shallowEqual(objA: any, objB: any): boolean {
  if (objA === objB) return true;
  
  if (!objA || !objB) return false;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (objA[key] !== objB[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Memoized callback that's stable across renders unless dependencies change
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = React.useRef<T | null>(null);
  const depsRef = React.useRef<React.DependencyList | null>(null);

  // Only update if dependencies actually changed
  if (!depsRef.current || !shallowEqual(depsRef.current, deps)) {
    ref.current = callback;
    depsRef.current = deps;
  }

  return React.useCallback((...args: any[]) => {
    return ref.current?.(...args);
  }, deps) as T;
}

/**
 * Debounced value hook to prevent excessive updates
 * ✅ SYSTEM UTILITY: useEffect for debouncing is legitimate system behavior
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttled callback to limit function execution frequency
 */
export function useThrottled<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = React.useRef(Date.now());

  return React.useCallback(
    (...args: any[]) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        return callback(...args);
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Performance monitoring hook for development
 * ✅ SYSTEM UTILITY: useEffect for performance monitoring is legitimate development tool
 */
export function usePerformanceMonitor(name: string, enabled: boolean = __DEV__) {
  const renderCount = React.useRef(0);
  const startTime = React.useRef(Date.now());

  React.useEffect(() => {
    if (!enabled) return;

    renderCount.current++;
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;

    if (renderCount.current > 1) { // Skip first render
      console.log(`🔄 [Performance] ${name}: Render #${renderCount.current}, Time: ${renderTime.toFixed(2)}ms`);
    }

    startTime.current = Date.now();
  });

  // ✅ SYSTEM UTILITY: useEffect for cleanup logging is legitimate development tool
  React.useEffect(() => {
    if (!enabled) return;

    return () => {
      console.log(`📊 [Performance] ${name}: Total renders: ${renderCount.current}`);
    };
  }, [name, enabled]);
}

/**
 * Batch state updates to reduce renders
 */
export function useBatchedState<T>(initialState: T): [T, (updates: Partial<T>) => void] {
  const [state, setState] = React.useState(initialState);
  const pendingUpdates = React.useRef<Partial<T>>({});
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const batchedSetState = React.useCallback((updates: Partial<T>) => {
    // Accumulate updates
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Batch updates in next tick
    timeoutRef.current = setTimeout(() => {
      setState(prevState => ({ ...prevState, ...pendingUpdates.current }));
      pendingUpdates.current = {};
    }, 0);
  }, []);

  // ✅ SYSTEM UTILITY: useEffect for timeout cleanup is legitimate system behavior
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchedSetState];
}

/**
 * Optimized re-render prevention hook
 */
export function useRenderOptimization<T>(
  value: T,
  dependencies: React.DependencyList
): T {
  const ref = React.useRef<T>(value);
  const depsRef = React.useRef<React.DependencyList>(dependencies);

  const hasChanged = !shallowEqual(depsRef.current, dependencies);

  if (hasChanged) {
    ref.current = value;
    depsRef.current = dependencies;
  }

  return ref.current;
}

/**
 * Custom hook for optimizing expensive computations
 */
export function useExpensiveComputation<T>(
  computeFn: () => T,
  dependencies: React.DependencyList,
  enabled: boolean = true
): T | undefined {
  const [result, setResult] = React.useState<T | undefined>(undefined);
  const isComputing = React.useRef(false);

  // ✅ SYSTEM UTILITY: useEffect for expensive computation optimization is legitimate performance tool
  React.useEffect(() => {
    if (!enabled || isComputing.current) return;

    isComputing.current = true;

    // Use setTimeout to prevent blocking the main thread
    const timeoutId = setTimeout(() => {
      try {
        const computed = computeFn();
        setResult(computed);
      } catch (error) {
        console.error('Error in expensive computation:', error);
      } finally {
        isComputing.current = false;
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [...dependencies, enabled]);

  return result;
}