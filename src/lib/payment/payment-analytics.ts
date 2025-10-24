/**
 * Payment Setup Analytics Service
 * 
 * Tracks conversion rates and user behavior for payment setup flow
 * to optimize the provider onboarding experience.
 */

import { supabase } from "@/lib/supabase";



interface PaymentAnalyticsEvent {
  event_type: 'payment_prompt_shown' | 'payment_setup_started' | 'payment_setup_completed' | 'payment_setup_abandoned' | 'nudge_shown' | 'nudge_dismissed' | 'nudge_converted';
  user_id: string;
  context?: 'dashboard' | 'verification_complete' | 'nudge' | 'manual';
  metadata?: Record<string, any>;
}

interface PaymentAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  context?: string;
}

interface PaymentConversionMetrics {
  total_providers: number;
  verification_completed: number;
  payment_setup_started: number;
  payment_setup_completed: number;
  verification_to_payment_rate: number;
  payment_completion_rate: number;
  nudge_conversion_rate: number;
  average_days_to_payment_setup: number;
}

export class PaymentAnalyticsService {
  
  /**
   * Track payment-related events
   */
  static async trackEvent(event: PaymentAnalyticsEvent): Promise<void> {
    try {
      const { error } = await supabase.from('payment_analytics_events').insert({
        ...event,
        created_at: new Date().toISOString(),
        session_id: this.getSessionId()
      });

      if (error) {
        console.error('Failed to track payment analytics event:', error);
      } else {
        console.log(`📊 [Payment Analytics] Tracked: ${event.event_type}`, event.metadata);
      }
    } catch (error) {
      console.error('Payment analytics tracking error:', error);
    }
  }

  /**
   * Track when payment prompt is shown to user
   */
  static async trackPaymentPromptShown(
    userId: string, 
    context: 'dashboard' | 'verification_complete' | 'nudge' = 'dashboard'
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'payment_prompt_shown',
      user_id: userId,
      context,
      metadata: { timestamp: Date.now() }
    });
  }

  /**
   * Track when user starts payment setup process
   */
  static async trackPaymentSetupStarted(
    userId: string,
    context: 'dashboard' | 'verification_complete' | 'nudge' | 'manual' = 'manual'
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'payment_setup_started',
      user_id: userId,
      context,
      metadata: { started_at: Date.now() }
    });
  }

  /**
   * Track when user completes payment setup
   */
  static async trackPaymentSetupCompleted(
    userId: string,
    stripeAccountId: string,
    context?: string
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'payment_setup_completed',
      user_id: userId,
      context: context as any,
      metadata: { 
        stripe_account_id: stripeAccountId,
        completed_at: Date.now()
      }
    });
  }

  /**
   * Track when user abandons payment setup
   */
  static async trackPaymentSetupAbandoned(
    userId: string,
    abandonedAt: string,
    context?: string
  ): Promise<void> {
    await this.trackEvent({
      event_type: 'payment_setup_abandoned',
      user_id: userId,
      context: context as any,
      metadata: { 
        abandoned_at: abandonedAt,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Track nudge interactions
   */
  static async trackNudgeShown(userId: string): Promise<void> {
    await this.trackEvent({
      event_type: 'nudge_shown',
      user_id: userId,
      context: 'nudge',
      metadata: { shown_at: Date.now() }
    });
  }

  static async trackNudgeDismissed(userId: string): Promise<void> {
    await this.trackEvent({
      event_type: 'nudge_dismissed',
      user_id: userId,
      context: 'nudge',
      metadata: { dismissed_at: Date.now() }
    });
  }

  static async trackNudgeConverted(userId: string): Promise<void> {
    await this.trackEvent({
      event_type: 'nudge_converted',
      user_id: userId,
      context: 'nudge',
      metadata: { converted_at: Date.now() }
    });
  }

  /**
   * Get payment conversion metrics
   */
  static async getConversionMetrics(
    query: PaymentAnalyticsQuery = {}
  ): Promise<PaymentConversionMetrics | null> {
    try {
      // This would typically be implemented with a database view or stored procedure
      // For now, we'll return mock data for development
      const mockMetrics: PaymentConversionMetrics = {
        total_providers: 150,
        verification_completed: 135,
        payment_setup_started: 98,
        payment_setup_completed: 87,
        verification_to_payment_rate: 72.6, // (98/135) * 100
        payment_completion_rate: 88.8, // (87/98) * 100
        nudge_conversion_rate: 23.5, // Based on nudge effectiveness
        average_days_to_payment_setup: 2.3
      };

      return mockMetrics;
    } catch (error) {
      console.error('Failed to get conversion metrics:', error);
      return null;
    }
  }

  /**
   * Get analytics events for a specific user
   */
  static async getUserEvents(
    userId: string,
    eventType?: string
  ): Promise<PaymentAnalyticsEvent[]> {
    try {
      let query = supabase
        .from('payment_analytics_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get user analytics events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('User analytics query error:', error);
      return [];
    }
  }

  /**
   * Get funnel analytics data
   */
  static async getFunnelData(days: number = 30): Promise<{
    verification_started: number;
    verification_completed: number;
    payment_prompted: number;
    payment_started: number;
    payment_completed: number;
  }> {
    // This would query your analytics database
    // For now, returning mock data
    return {
      verification_started: 200,
      verification_completed: 165,
      payment_prompted: 145,
      payment_started: 98,
      payment_completed: 87
    };
  }

  /**
   * Generate session ID for tracking
   */
  private static getSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create analytics database table (run once)
   */
  static async createAnalyticsTable(): Promise<void> {
    // This would be run as a migration
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS payment_analytics_events (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        event_type TEXT NOT NULL,
        user_id UUID NOT NULL,
        context TEXT,
        metadata JSONB,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        session_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_payment_analytics_user_id ON payment_analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_payment_analytics_event_type ON payment_analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_payment_analytics_timestamp ON payment_analytics_events(timestamp);
    `;

    console.log('Analytics table SQL:', createTableSQL);
  }
}

/**
 * React hook for payment analytics - DEPRECATED
 * This hook uses useState + useEffect anti-patterns and is not used anywhere in the app
 * TODO: Replace with React Query hook if analytics are needed in the future
 */
// import { useState, useEffect } from 'react';

// export const usePaymentAnalytics = (userId?: string) => {
//   const [metrics, setMetrics] = useState<PaymentConversionMetrics | null>(null);
//   const [loading, setLoading] = useState(false);

//   const trackPaymentPrompt = async (context: 'dashboard' | 'verification_complete' | 'nudge' = 'dashboard') => {
//     if (userId) {
//       await PaymentAnalyticsService.trackPaymentPromptShown(userId, context);
//     }
//   };

//   const trackPaymentStarted = async (context: 'dashboard' | 'verification_complete' | 'nudge' | 'manual' = 'manual') => {
//     if (userId) {
//       await PaymentAnalyticsService.trackPaymentSetupStarted(userId, context);
//     }
//   };

//   const trackPaymentCompleted = async (stripeAccountId: string, context?: string) => {
//     if (userId) {
//       await PaymentAnalyticsService.trackPaymentSetupCompleted(userId, stripeAccountId, context);
//     }
//   };

//   const loadMetrics = async () => {
//     setLoading(true);
//     try {
//       const data = await PaymentAnalyticsService.getConversionMetrics();
//       setMetrics(data);
//     } catch (error) {
//       console.error('Failed to load payment metrics:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadMetrics();
//   }, []);

//   return {
//     metrics,
//     loading,
//     trackPaymentPrompt,
//     trackPaymentStarted,
//     trackPaymentCompleted,
//     loadMetrics
//   };
// };