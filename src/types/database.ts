export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          amount_held_for_provider: number | null
          auto_confirmed: boolean | null
          base_amount: number
          booking_date: string
          booking_mode: Database["public"]["Enums"]["booking_mode"]
          captured_amount: number | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          customer_review_submitted: boolean | null
          declined_reason: string | null
          end_time: string | null
          funds_held_at: string | null
          id: string
          is_sos_booking: boolean | null
          payment_intent_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          platform_fee: number
          platform_fee_collected: number | null
          platform_fee_held: number | null
          provider_id: string | null
          provider_notes: string | null
          provider_paid_at: string | null
          provider_payout_amount: number | null
          provider_response_deadline: string | null
          provider_transfer_id: string | null
          requested_completion_time: string | null
          service_address: string | null
          service_coordinates: unknown
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_amount: number
          updated_at: string | null
          urgency_level: Database["public"]["Enums"]["urgency_level"] | null
        }
        Insert: {
          amount_held_for_provider?: number | null
          auto_confirmed?: boolean | null
          base_amount: number
          booking_date: string
          booking_mode?: Database["public"]["Enums"]["booking_mode"]
          captured_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          customer_review_submitted?: boolean | null
          declined_reason?: string | null
          end_time?: string | null
          funds_held_at?: string | null
          id?: string
          is_sos_booking?: boolean | null
          payment_intent_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          platform_fee: number
          platform_fee_collected?: number | null
          platform_fee_held?: number | null
          provider_id?: string | null
          provider_notes?: string | null
          provider_paid_at?: string | null
          provider_payout_amount?: number | null
          provider_response_deadline?: string | null
          provider_transfer_id?: string | null
          requested_completion_time?: string | null
          service_address?: string | null
          service_coordinates?: unknown
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_amount: number
          updated_at?: string | null
          urgency_level?: Database["public"]["Enums"]["urgency_level"] | null
        }
        Update: {
          amount_held_for_provider?: number | null
          auto_confirmed?: boolean | null
          base_amount?: number
          booking_date?: string
          booking_mode?: Database["public"]["Enums"]["booking_mode"]
          captured_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          customer_review_submitted?: boolean | null
          declined_reason?: string | null
          end_time?: string | null
          funds_held_at?: string | null
          id?: string
          is_sos_booking?: boolean | null
          payment_intent_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          platform_fee?: number
          platform_fee_collected?: number | null
          platform_fee_held?: number | null
          provider_id?: string | null
          provider_notes?: string | null
          provider_paid_at?: string | null
          provider_payout_amount?: number | null
          provider_response_deadline?: string | null
          provider_transfer_id?: string | null
          requested_completion_time?: string | null
          service_address?: string | null
          service_coordinates?: unknown
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_amount?: number
          updated_at?: string | null
          urgency_level?: Database["public"]["Enums"]["urgency_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          favorite_id: string
          favorite_type: Database["public"]["Enums"]["favorite_type"]
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          favorite_id: string
          favorite_type: Database["public"]["Enums"]["favorite_type"]
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          favorite_id?: string
          favorite_type?: Database["public"]["Enums"]["favorite_type"]
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          booking_id: string
          client_secret: string
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          payment_method_types: string[] | null
          status: Database["public"]["Enums"]["payment_intent_status"]
          stripe_payment_intent_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          client_secret: string
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method_types?: string[] | null
          status: Database["public"]["Enums"]["payment_intent_status"]
          stripe_payment_intent_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          client_secret?: string
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          payment_method_types?: string[] | null
          status?: Database["public"]["Enums"]["payment_intent_status"]
          stripe_payment_intent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          paid_at: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          price_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string
          trial_end: string | null
          type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id: string
          trial_end?: string | null
          type: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          price_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string
          trial_end?: string | null
          type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_verification_documents: {
        Row: {
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          document_url: string
          id: string
          provider_id: string
          rejection_reason: string | null
          updated_at: string | null
          verification_status: Database["public"]["Enums"]["verification_status"] | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          document_url: string
          id?: string
          provider_id: string
          rejection_reason?: string | null
          updated_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"] | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          document_url?: string
          id?: string
          provider_id?: string
          rejection_reason?: string | null
          updated_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"] | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_verification_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_verification_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Enums: {
      booking_mode: "normal" | "sos"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "declined"
        | "expired"
      document_type: "passport" | "driving_license" | "id_card"
      favorite_type: "service" | "provider"
      message_type: "text" | "image" | "system"
      notification_type:
        | "booking_confirmed"
        | "booking_cancelled"
        | "booking_reminder"
        | "payment_received"
        | "review_request"
        | "general"
      payment_intent_status:
        | "requires_payment_method"
        | "requires_confirmation"
        | "requires_action"
        | "processing"
        | "succeeded"
        | "canceled"
        | "requires_capture"
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "funds_held_in_escrow"
        | "payout_completed"
      payout_status: "pending" | "processing" | "completed" | "failed"
      price_type: "fixed" | "hourly"
      subscription_status:
        | "active"
        | "canceled"
        | "past_due"
        | "incomplete"
        | "trialing"
      subscription_type: "customer_sos" | "provider_premium"
      urgency_level: "low" | "medium" | "high" | "emergency"
      user_availability: "available" | "busy" | "unavailable"
      user_role: "customer" | "provider" | "admin" | "super-admin"
      verification_status:
        | "pending"
        | "approved"
        | "rejected"
        | "in_review"
        | "in_progress"
        | "submitted"
    }
  }
}

export const DatabaseEnums = {
  public: {
    booking_mode: ["normal", "sos"],
    booking_status: [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "declined",
      "expired",
    ],
    document_type: ["passport", "driving_license", "id_card"],
    favorite_type: ["service", "provider"],
    message_type: ["text", "image", "system"],
    notification_type: [
      "booking_confirmed",
      "booking_cancelled",
      "booking_reminder",
      "payment_received",
      "review_request",
      "general",
    ],
    payment_intent_status: [
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
      "succeeded",
      "canceled",
      "requires_capture",
    ],
    payment_status: [
      "pending",
      "paid",
      "failed",
      "refunded",
      "funds_held_in_escrow",
      "payout_completed",
    ],
    payout_status: ["pending", "processing", "completed", "failed"],
    price_type: ["fixed", "hourly"],
    subscription_status: [
      "active",
      "canceled",
      "past_due",
      "incomplete",
      "trialing",
    ],
    subscription_type: ["customer_sos", "provider_premium"],
    urgency_level: ["low", "medium", "high", "emergency"],
    user_availability: ["available", "busy", "unavailable"],
    user_role: ["customer", "provider", "admin", "super-admin"],
    verification_status: [
      "pending",
      "approved",
      "rejected",
      "in_review",
      "in_progress",
      "submitted",
    ],
  },
} as const
