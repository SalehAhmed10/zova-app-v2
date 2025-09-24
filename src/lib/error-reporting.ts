/**
 * Global error reporting service for ZOVA app
 * This module provides centralized error handling and reporting capabilities
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'fatal' | 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent?: string;
  appVersion?: string;
  userId?: string;
  userRole?: string;
  route?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReportingConfig {
  enableConsoleLogging: boolean;
  enableRemoteReporting: boolean;
  enableLocalStorage: boolean;
  maxStoredErrors: number;
  apiEndpoint?: string;
  apiKey?: string;
}

class ErrorReportingService {
  private config: ErrorReportingConfig = {
    enableConsoleLogging: __DEV__,
    enableRemoteReporting: !__DEV__, // Only in production
    enableLocalStorage: true,
    maxStoredErrors: 50,
  };

  private errorQueue: ErrorReport[] = [];

  constructor(config?: Partial<ErrorReportingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Load existing errors from AsyncStorage asynchronously
    this.loadStoredErrors().catch(error => {
      console.error('Error loading stored errors during initialization:', error);
    });
  }

  /**
   * Report an error with detailed information
   */
  async reportError(
    error: Error,
    level: ErrorReport['level'] = 'error',
    metadata?: Record<string, any>
  ): Promise<void> {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level,
      message: error.message,
      stack: error.stack,
      userAgent: this.getUserAgent(),
      appVersion: this.getAppVersion(),
      userId: this.getCurrentUserId(),
      userRole: this.getCurrentUserRole(),
      route: this.getCurrentRoute(),
      metadata,
    };

    await this.processErrorReport(errorReport);
  }

  /**
   * Report a React error boundary catch
   */
  async reportReactError(
    error: Error,
    errorInfo: React.ErrorInfo,
    level: ErrorReport['level'] = 'error',
    metadata?: Record<string, any>
  ): Promise<void> {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      level,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: this.getUserAgent(),
      appVersion: this.getAppVersion(),
      userId: this.getCurrentUserId(),
      userRole: this.getCurrentUserRole(),
      route: this.getCurrentRoute(),
      metadata: {
        ...metadata,
        errorBoundary: true,
      },
    };

    await this.processErrorReport(errorReport);
  }

  /**
   * Report a custom error with message
   */
  async reportCustomError(
    message: string,
    level: ErrorReport['level'] = 'error',
    metadata?: Record<string, any>
  ): Promise<void> {
    const error = new Error(message);
    await this.reportError(error, level, metadata);
  }

  /**
   * Process and handle the error report
   */
  private async processErrorReport(errorReport: ErrorReport): Promise<void> {
    // Console logging (development)
    if (this.config.enableConsoleLogging) {
      this.logToConsole(errorReport);
    }

    // Local storage
    if (this.config.enableLocalStorage) {
      await this.storeLocally(errorReport);
    }

    // Remote reporting (production)
    if (this.config.enableRemoteReporting) {
      await this.sendToRemote(errorReport);
    }
  }

  /**
   * Log error to console with formatting
   */
  private logToConsole(errorReport: ErrorReport): void {
    const emoji = this.getLevelEmoji(errorReport.level);
    console.group(`${emoji} Error Report [${errorReport.level.toUpperCase()}]`);
    console.log('ID:', errorReport.id);
    console.log('Message:', errorReport.message);
    console.log('Timestamp:', errorReport.timestamp);
    
    if (errorReport.route) {
      console.log('Route:', errorReport.route);
    }
    
    if (errorReport.userId) {
      console.log('User:', `${errorReport.userId} (${errorReport.userRole})`);
    }
    
    if (errorReport.stack) {
      console.log('Stack:', errorReport.stack);
    }
    
    if (errorReport.componentStack) {
      console.log('Component Stack:', errorReport.componentStack);
    }
    
    if (errorReport.metadata) {
      console.log('Metadata:', errorReport.metadata);
    }
    
    console.groupEnd();
  }

  /**
   * Store error locally using AsyncStorage
   */
  private async storeLocally(errorReport: ErrorReport): Promise<void> {
    try {
      // Add to queue
      this.errorQueue.push(errorReport);

      // Limit queue size
      if (this.errorQueue.length > this.config.maxStoredErrors) {
        this.errorQueue = this.errorQueue.slice(-this.config.maxStoredErrors);
      }

      // Persist to AsyncStorage
      await AsyncStorage.setItem('zova_error_reports', JSON.stringify(this.errorQueue));
    } catch (error) {
      console.error('Failed to store error locally:', error);
    }
  }

  /**
   * Send error to remote service
   */
  private async sendToRemote(errorReport: ErrorReport): Promise<void> {
    try {
      if (!this.config.apiEndpoint) {
        console.warn('Remote error reporting endpoint not configured');
        return;
      }

      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send error to remote service:', error);
      // Don't throw here to avoid recursive error reporting
    }
  }

  /**
   * Get stored error reports
   */
  async getStoredErrors(): Promise<ErrorReport[]> {
    return [...this.errorQueue];
  }

  /**
   * Load stored errors from AsyncStorage
   */
  private async loadStoredErrors(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('zova_error_reports');
      if (stored) {
        this.errorQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load stored errors:', error);
    }
  }

  /**
   * Clear stored error reports
   */
  async clearStoredErrors(): Promise<void> {
    this.errorQueue = [];
    try {
      await AsyncStorage.removeItem('zova_error_reports');
    } catch (error) {
      console.error('Failed to clear stored errors:', error);
    }
  }

  /**
   * Helper methods
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLevelEmoji(level: ErrorReport['level']): string {
    const emojis = {
      fatal: '💥',
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return emojis[level] || '❓';
  }

  private getUserAgent(): string {
    try {
      // Try to get device info
      const platform = Platform.OS;
      const version = Platform.Version;
      const appVersion = Constants?.expoConfig?.version || '1.0.0';
      
      return `ZOVA/${appVersion} (${platform} ${version})`;
    } catch {
      return 'ZOVA React Native App';
    }
  }

  private getAppVersion(): string {
    try {
      // Get version from package.json
      const packageJson = require('../../package.json');
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      // Get from Supabase auth if available
      const { supabase } = require('./supabase');
      // Note: This is synchronous access to cached user data
      const session = supabase.auth.getSession();
      return session?.data?.session?.user?.id;
    } catch {
      return undefined;
    }
  }

  private getCurrentUserRole(): string | undefined {
    try {
      // Get from app store
      const { useAppStore } = require('../stores/app');
      const store = useAppStore.getState();
      return store.userRole || undefined;
    } catch {
      return undefined;
    }
  }

  private getCurrentRoute(): string | undefined {
    try {
      // We can't use hooks here since this is not a React component
      // Let's use a different approach by checking navigation state
      // This will be undefined for now, but can be enhanced with navigation ref
      return undefined;
    } catch {
      return undefined;
    }
  }
}

// Create singleton instance
export const errorReporting = new ErrorReportingService();

/**
 * React hook for error reporting
 */
export function useErrorReporting() {
  const reportError = React.useCallback(
    (error: Error, level?: ErrorReport['level'], metadata?: Record<string, any>) => {
      errorReporting.reportError(error, level, metadata);
    },
    []
  );

  const reportCustomError = React.useCallback(
    (message: string, level?: ErrorReport['level'], metadata?: Record<string, any>) => {
      errorReporting.reportCustomError(message, level, metadata);
    },
    []
  );

  return {
    reportError,
    reportCustomError,
    getStoredErrors: errorReporting.getStoredErrors.bind(errorReporting),
    clearStoredErrors: errorReporting.clearStoredErrors.bind(errorReporting),
  };
}

/**
 * Error boundary error handler
 */
export const handleErrorBoundaryError = (error: Error, errorInfo: React.ErrorInfo) => {
  errorReporting.reportReactError(error, errorInfo, 'error', {
    source: 'error_boundary',
  });
};