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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anonymous_usage: {
        Row: {
          first_seen: string | null
          ip_hash: string | null
          last_request_date: string
          last_seen: string | null
          request_count: number
          session_id: string
          tokens_today: number
          total_tokens: number
        }
        Insert: {
          first_seen?: string | null
          ip_hash?: string | null
          last_request_date?: string
          last_seen?: string | null
          request_count?: number
          session_id: string
          tokens_today?: number
          total_tokens?: number
        }
        Update: {
          first_seen?: string | null
          ip_hash?: string | null
          last_request_date?: string
          last_seen?: string | null
          request_count?: number
          session_id?: string
          tokens_today?: number
          total_tokens?: number
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          created_at: string | null
          id: string
          input_tokens: number
          mode: string
          model: string
          output_tokens: number
          request_chars: number | null
          response_chars: number | null
          session_id: string | null
          tokens_estimated: boolean
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          input_tokens?: number
          mode: string
          model: string
          output_tokens?: number
          request_chars?: number | null
          response_chars?: number | null
          session_id?: string | null
          tokens_estimated?: boolean
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          input_tokens?: number
          mode?: string
          model?: string
          output_tokens?: number
          request_chars?: number | null
          response_chars?: number | null
          session_id?: string | null
          tokens_estimated?: boolean
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      github_credentials: {
        Row: {
          created_at: string | null
          encrypted_pat: string
          pat_username: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_pat: string
          pat_username?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_pat?: string
          pat_username?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      github_repo_cache: {
        Row: {
          branch: string
          fetched_at: string | null
          file_contents: Json | null
          key_files: Json | null
          repo_id: string
          selected_paths: string[] | null
          summary: string | null
          tree: Json | null
        }
        Insert: {
          branch?: string
          fetched_at?: string | null
          file_contents?: Json | null
          key_files?: Json | null
          repo_id: string
          selected_paths?: string[] | null
          summary?: string | null
          tree?: Json | null
        }
        Update: {
          branch?: string
          fetched_at?: string | null
          file_contents?: Json | null
          key_files?: Json | null
          repo_id?: string
          selected_paths?: string[] | null
          summary?: string | null
          tree?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "github_repo_cache_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: true
            referencedRelation: "github_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      github_repos: {
        Row: {
          created_at: string | null
          default_branch: string | null
          full_name: string
          id: string
          last_refreshed: string | null
          name: string
          owner: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_branch?: string | null
          full_name: string
          id: string
          last_refreshed?: string | null
          name: string
          owner: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_branch?: string | null
          full_name?: string
          id?: string
          last_refreshed?: string | null
          name?: string
          owner?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      github_settings: {
        Row: {
          auto_include_in_coding: boolean | null
          created_at: string | null
          enabled: boolean | null
          max_context_tokens: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_include_in_coding?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          max_context_tokens?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_include_in_coding?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          max_context_tokens?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      history_entries: {
        Row: {
          created_at: string | null
          id: string
          input: string
          result_data: Json
          task_mode: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id: string
          input: string
          result_data: Json
          task_mode: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          input?: string
          result_data?: Json
          task_mode?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_contexts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      simple_history_entries: {
        Row: {
          created_at: string | null
          elapsed_time: number | null
          id: string
          input: string
          output: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          elapsed_time?: number | null
          id: string
          input: string
          output: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          elapsed_time?: number | null
          id?: string
          input?: string
          output?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_active_context: {
        Row: {
          context_id: string | null
          created_at: string | null
          current_content: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_id?: string | null
          created_at?: string | null
          current_content?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_id?: string | null
          created_at?: string | null
          current_content?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_context_context_id_fkey"
            columns: ["context_id"]
            isOneToOne: false
            referencedRelation: "saved_contexts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          beginner_mode: boolean | null
          compare_model_indices: number[] | null
          created_at: string | null
          language: string | null
          mode: string | null
          selected_model_index: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          beginner_mode?: boolean | null
          compare_model_indices?: number[] | null
          created_at?: string | null
          language?: string | null
          mode?: string | null
          selected_model_index?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          beginner_mode?: boolean | null
          compare_model_indices?: number[] | null
          created_at?: string | null
          language?: string | null
          mode?: string | null
          selected_model_index?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          migrated_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          migrated_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          migrated_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_usage_limits: {
        Row: {
          created_at: string | null
          daily_token_limit: number
          is_unlimited: boolean
          max_tokens_per_request: number
          monthly_token_limit: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_token_limit?: number
          is_unlimited?: boolean
          max_tokens_per_request?: number
          monthly_token_limit?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_token_limit?: number
          is_unlimited?: boolean
          max_tokens_per_request?: number
          monthly_token_limit?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_rate_limit: {
        Args: { p_requested_tokens?: number; p_user_id: string }
        Returns: {
          can_proceed: boolean
          daily_remaining: number
          error_message: string
          is_unlimited: boolean
          monthly_remaining: number
        }[]
      }
      cleanup_old_anonymous_usage: { Args: never; Returns: number }
      get_user_daily_usage: { Args: { p_user_id: string }; Returns: number }
      get_user_monthly_usage: { Args: { p_user_id: string }; Returns: number }
      get_user_usage: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          avg_tokens_per_request: number
          total_requests: number
          total_tokens: number
        }[]
      }
      grant_unlimited_access: { Args: { p_email: string }; Returns: boolean }
      upsert_anonymous_usage: {
        Args: { p_date: string; p_session_id: string; p_tokens: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
A new version of Supabase CLI is available: v2.67.1 (currently installed v2.62.10)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
