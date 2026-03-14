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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_business_insights: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          estimated_revenue: number | null
          explanation: string | null
          id: string
          recommended_action: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          estimated_revenue?: number | null
          explanation?: string | null
          id?: string
          recommended_action?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          estimated_revenue?: number | null
          explanation?: string | null
          id?: string
          recommended_action?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_business_insights_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          client_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          module: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          module?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          module?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_events: {
        Row: {
          client_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          automation_id: string | null
          client_id: string
          created_at: string
          id: string
          log_level: string
          message: string
          metadata: Json | null
        }
        Insert: {
          automation_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          log_level?: string
          message: string
          metadata?: Json | null
        }
        Update: {
          automation_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          log_level?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_id: string
          client_id: string
          completed_at: string | null
          error: string | null
          id: string
          result: Json | null
          started_at: string
          status: string
        }
        Insert: {
          automation_id: string
          client_id: string
          completed_at?: string | null
          error?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          automation_id?: string
          client_id?: string
          completed_at?: string | null
          error?: string | null
          id?: string
          result?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_config: Json | null
          action_type: string
          client_id: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          client_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          client_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_branding: {
        Row: {
          app_display_name: string | null
          app_icon_url: string | null
          client_id: string
          company_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          splash_logo_url: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          app_display_name?: string | null
          app_icon_url?: string | null
          client_id: string
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          splash_logo_url?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          app_display_name?: string | null
          app_icon_url?: string | null
          client_id?: string
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          splash_logo_url?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_branding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_health_scores: {
        Row: {
          ads_score: number
          automation_score: number
          calculated_at: string
          client_id: string
          conversion_score: number
          created_at: string
          id: string
          leads_score: number
          overall_score: number
          reviews_score: number
          seo_score: number
          social_score: number
          updated_at: string
          website_score: number
        }
        Insert: {
          ads_score?: number
          automation_score?: number
          calculated_at?: string
          client_id: string
          conversion_score?: number
          created_at?: string
          id?: string
          leads_score?: number
          overall_score?: number
          reviews_score?: number
          seo_score?: number
          social_score?: number
          updated_at?: string
          website_score?: number
        }
        Update: {
          ads_score?: number
          automation_score?: number
          calculated_at?: string
          client_id?: string
          conversion_score?: number
          created_at?: string
          id?: string
          leads_score?: number
          overall_score?: number
          reviews_score?: number
          seo_score?: number
          social_score?: number
          updated_at?: string
          website_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_health_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_integrations: {
        Row: {
          client_id: string
          config: Json | null
          created_at: string
          id: string
          integration_name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          config?: Json | null
          created_at?: string
          id?: string
          integration_name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          integration_name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_integrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reports: {
        Row: {
          ai_summary: string | null
          client_id: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          client_id: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          report_data?: Json
          report_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          client_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          report_data?: Json
          report_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          business_name: string
          created_at: string
          id: string
          industry: string | null
          owner_email: string | null
          owner_name: string | null
          primary_location: string | null
          service_package: string | null
          status: string
          timezone: string | null
          updated_at: string
          workspace_slug: string
        }
        Insert: {
          business_name: string
          created_at?: string
          id?: string
          industry?: string | null
          owner_email?: string | null
          owner_name?: string | null
          primary_location?: string | null
          service_package?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          workspace_slug: string
        }
        Update: {
          business_name?: string
          created_at?: string
          id?: string
          industry?: string | null
          owner_email?: string | null
          owner_name?: string | null
          primary_location?: string | null
          service_package?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          workspace_slug?: string
        }
        Relationships: []
      }
      fix_now_items: {
        Row: {
          assigned_operator: string | null
          client_id: string
          created_at: string
          id: string
          issue: string
          module: string | null
          severity: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_operator?: string | null
          client_id: string
          created_at?: string
          id?: string
          issue: string
          module?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_operator?: string | null
          client_id?: string
          created_at?: string
          id?: string
          issue?: string
          module?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fix_now_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_projections: {
        Row: {
          client_id: string
          created_at: string
          current_value: number
          id: string
          metric: string
          projected_30d: number | null
          projected_60d: number | null
          projected_90d: number | null
          trend: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_value?: number
          id?: string
          metric: string
          projected_30d?: number | null
          projected_60d?: number | null
          projected_90d?: number | null
          trend?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_value?: number
          id?: string
          metric?: string
          projected_30d?: number | null
          projected_60d?: number | null
          projected_90d?: number | null
          trend?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_projections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_intelligence: {
        Row: {
          action_items: Json | null
          client_id: string
          created_at: string
          duration_minutes: number | null
          follow_up_date: string | null
          id: string
          interests: Json | null
          meeting_date: string | null
          next_steps: Json | null
          objections: Json | null
          score: number | null
          sentiment: string | null
          summary: string | null
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          client_id: string
          created_at?: string
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          interests?: Json | null
          meeting_date?: string | null
          next_steps?: Json | null
          objections?: Json | null
          score?: number | null
          sentiment?: string | null
          summary?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          client_id?: string
          created_at?: string
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          interests?: Json | null
          meeting_date?: string | null
          next_steps?: Json | null
          objections?: Json | null
          score?: number | null
          sentiment?: string | null
          summary?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_intelligence_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          ad_account_connected: boolean
          business_info: boolean
          client_id: string
          created_at: string
          crm_setup: boolean
          google_business_connected: boolean
          id: string
          launch_ready: boolean
          review_platform_connected: boolean
          team_setup: boolean
          updated_at: string
          website_connected: boolean
        }
        Insert: {
          ad_account_connected?: boolean
          business_info?: boolean
          client_id: string
          created_at?: string
          crm_setup?: boolean
          google_business_connected?: boolean
          id?: string
          launch_ready?: boolean
          review_platform_connected?: boolean
          team_setup?: boolean
          updated_at?: string
          website_connected?: boolean
        }
        Update: {
          ad_account_connected?: boolean
          business_info?: boolean
          client_id?: string
          created_at?: string
          crm_setup?: boolean
          google_business_connected?: boolean
          id?: string
          launch_ready?: boolean
          review_platform_connected?: boolean
          team_setup?: boolean
          updated_at?: string
          website_connected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          business_name: string
          business_type: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_decision_maker: string | null
          meeting_date: string | null
          notes: string | null
          phone: string | null
          primary_location: string | null
          proposal_recipient_email: string | null
          reason_for_inquiry: string | null
          source: string | null
          stage: string
          status: string
          timeline: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          business_name: string
          business_type?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_decision_maker?: string | null
          meeting_date?: string | null
          notes?: string | null
          phone?: string | null
          primary_location?: string | null
          proposal_recipient_email?: string | null
          reason_for_inquiry?: string | null
          source?: string | null
          stage?: string
          status?: string
          timeline?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          business_name?: string
          business_type?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_decision_maker?: string | null
          meeting_date?: string | null
          notes?: string | null
          phone?: string | null
          primary_location?: string | null
          proposal_recipient_email?: string | null
          reason_for_inquiry?: string | null
          source?: string | null
          stage?: string
          status?: string
          timeline?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      provision_queue: {
        Row: {
          automation_setup: boolean | null
          client_id: string
          created_at: string
          crm_setup: boolean | null
          errors: string[] | null
          id: string
          integrations_status: string | null
          provision_status: string
          updated_at: string
        }
        Insert: {
          automation_setup?: boolean | null
          client_id: string
          created_at?: string
          crm_setup?: boolean | null
          errors?: string[] | null
          id?: string
          integrations_status?: string | null
          provision_status?: string
          updated_at?: string
        }
        Update: {
          automation_setup?: boolean | null
          client_id?: string
          created_at?: string
          crm_setup?: boolean | null
          errors?: string[] | null
          id?: string
          integrations_status?: string | null
          provision_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provision_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          client_id: string
          created_at: string
          enabled: boolean
          id: string
          recipients: string[] | null
          report_type: string
          send_email: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          recipients?: string[] | null
          report_type?: string
          send_email?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          recipients?: string[] | null
          report_type?: string
          send_email?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_opportunities: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          description: string | null
          estimated_missed_revenue: number | null
          id: string
          recommended_action: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          estimated_missed_revenue?: number | null
          id?: string
          recommended_action?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          estimated_missed_revenue?: number | null
          id?: string
          recommended_action?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          client_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          client_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_operator: { Args: { _user_id: string }; Returns: boolean }
      user_has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "operator"
        | "client_owner"
        | "client_team"
        | "read_only"
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
    Enums: {
      app_role: [
        "admin",
        "operator",
        "client_owner",
        "client_team",
        "read_only",
      ],
    },
  },
} as const
