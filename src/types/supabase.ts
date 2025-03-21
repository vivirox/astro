import type { Json } from './json.js'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string | null
          avatar_url: string | null
          website: string | null
          role: string
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          role?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          model: string
          input_tokens: number
          output_tokens: number
          total_tokens: number
          cost: number
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          model: string
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          cost?: number
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          model?: string
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          cost?: number
        }
        Relationships: [
          {
            foreignKeyName: 'ai_usage_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string | null
          action: string
          resource: string
          resource_id: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string | null
          action: string
          resource: string
          resource_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string | null
          action?: string
          resource?: string
          resource_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          title: string
          status: string
          metadata: Json | null
          last_message_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          title: string
          status?: string
          metadata?: Json | null
          last_message_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          title?: string
          status?: string
          metadata?: Json | null
          last_message_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          created_at: string
          conversation_id: string
          user_id: string | null
          content: string
          role: string
          metadata: Json | null
          sentiment_score: number | null
          is_flagged: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          conversation_id: string
          user_id?: string | null
          content: string
          role: string
          metadata?: Json | null
          sentiment_score?: number | null
          is_flagged?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          conversation_id?: string
          user_id?: string | null
          content?: string
          role?: string
          metadata?: Json | null
          sentiment_score?: number | null
          is_flagged?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      user_settings: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          theme: string
          notifications_enabled: boolean
          email_notifications: boolean
          language: string
          preferences: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          theme?: string
          notifications_enabled?: boolean
          email_notifications?: boolean
          language?: string
          preferences?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          theme?: string
          notifications_enabled?: boolean
          email_notifications?: boolean
          language?: string
          preferences?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'user_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ai_sentiment_analysis: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          model_id: string
          model_provider: string
          request_tokens: number
          response_tokens: number
          total_tokens: number
          latency_ms: number
          success: boolean
          error: string | null
          text: string
          sentiment: string
          score: number
          confidence: number
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          model_id: string
          model_provider: string
          request_tokens?: number
          response_tokens?: number
          total_tokens?: number
          latency_ms?: number
          success?: boolean
          error?: string | null
          text: string
          sentiment: string
          score: number
          confidence: number
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          model_id?: string
          model_provider?: string
          request_tokens?: number
          response_tokens?: number
          total_tokens?: number
          latency_ms?: number
          success?: boolean
          error?: string | null
          text?: string
          sentiment?: string
          score?: number
          confidence?: number
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_sentiment_analysis_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ai_crisis_detection: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          model_id: string
          model_provider: string
          request_tokens: number
          response_tokens: number
          total_tokens: number
          latency_ms: number
          success: boolean
          error: string | null
          text: string
          crisis_detected: boolean
          crisis_type: string | null
          confidence: number
          risk_level: string
          sensitivity_level: number
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          model_id: string
          model_provider: string
          request_tokens?: number
          response_tokens?: number
          total_tokens?: number
          latency_ms?: number
          success?: boolean
          error?: string | null
          text: string
          crisis_detected?: boolean
          crisis_type?: string | null
          confidence: number
          risk_level: string
          sensitivity_level?: number
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          model_id?: string
          model_provider?: string
          request_tokens?: number
          response_tokens?: number
          total_tokens?: number
          latency_ms?: number
          success?: boolean
          error?: string | null
          text?: string
          crisis_detected?: boolean
          crisis_type?: string | null
          confidence?: number
          risk_level?: string
          sensitivity_level?: number
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_crisis_detection_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ai_response_generation: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          model_id: string
          model_provider: string
          request_tokens: number
          response_tokens: number
          total_tokens: number
          latency_ms: number
          success: boolean
          error: string | null
          prompt: string
          response: string
          context: string | null
          instructions: string | null
          temperature: number
          max_tokens: number
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          model_id: string
          model_provider: string
          request_tokens?: number
          response_tokens?: number
          total_tokens?: number
          latency_ms?: number
          success?: boolean
          error?: string | null
          prompt: string
          response: string
          context?: string | null
          instructions?: string | null
          temperature?: number
          max_tokens?: number
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          model_id?: string
          model_provider?: string
          request_tokens?: number
          response_tokens?: number
          total_tokens?: number
          latency_ms?: number
          success?: boolean
          error?: string | null
          prompt?: string
          response?: string
          context?: string | null
          instructions?: string | null
          temperature?: number
          max_tokens?: number
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_response_generation_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ai_intervention_analysis: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          model_id: string
          model_provider: string
          request_tokens: number
          response_tokens: number
          total_tokens: number
          latency_ms: number
          success: boolean
          error: string | null
          conversation: string
          intervention: string
          user_response: string
          effectiveness: number
          insights: string
          recommended_follow_up: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          model_id: string
          model_provider: string
          request_tokens?: number
          response_tokens?: number
          total_tokens?: number
          latency_ms?: number
          success?: boolean
          error?: string | null
          conversation: string
          intervention: string
          user_response: string
          effectiveness: number
          insights: string
          recommended_follow_up: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          model_id?: string
          model_provider?: string
          request_tokens?: number
          response_tokens?: number
          total_tokens?: number
          latency_ms?: number
          success?: boolean
          error?: string | null
          conversation?: string
          intervention?: string
          user_response?: string
          effectiveness?: number
          insights?: string
          recommended_follow_up?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'ai_intervention_analysis_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      ai_usage_stats: {
        Row: {
          id: string
          user_id: string
          period: string
          date: string
          total_requests: number
          total_tokens: number
          total_cost: number
          model_usage: Json
        }
        Insert: {
          id?: string
          user_id: string
          period: string
          date: string
          total_requests?: number
          total_tokens?: number
          total_cost?: number
          model_usage?: Json
        }
        Update: {
          id?: string
          user_id?: string
          period?: string
          date?: string
          total_requests?: number
          total_tokens?: number
          total_cost?: number
          model_usage?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'ai_usage_stats_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      security_events: {
        Row: {
          id: number
          type: string
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Record<string, unknown>
          severity: string
          created_at: string
        }
        Insert: {
          type: string
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Record<string, unknown>
          severity: string
          created_at?: string
        }
        Update: {
          type?: string
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Record<string, unknown>
          severity?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export { type Json } from './json.js'
