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
      ad_campaigns: {
        Row: {
          budget: number | null
          campaign_name: string
          clicks: number | null
          client_id: string
          conversions: number | null
          cpl: number | null
          created_at: string
          id: string
          impressions: number | null
          leads: number | null
          notes: string | null
          platform: string
          roas: number | null
          spend: number | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          campaign_name: string
          clicks?: number | null
          client_id: string
          conversions?: number | null
          cpl?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          leads?: number | null
          notes?: string | null
          platform?: string
          roas?: number | null
          spend?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          campaign_name?: string
          clicks?: number | null
          client_id?: string
          conversions?: number | null
          cpl?: number | null
          created_at?: string
          id?: string
          impressions?: number | null
          leads?: number | null
          notes?: string | null
          platform?: string
          roas?: number | null
          spend?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
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
      availability_settings: {
        Row: {
          client_id: string
          created_at: string
          day_of_week: number
          enabled: boolean
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          client_id: string
          created_at?: string
          day_of_week: number
          enabled?: boolean
          end_time?: string
          id?: string
          start_time?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          day_of_week?: number
          enabled?: boolean
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          assigned_user: string | null
          booking_link: string | null
          calendar_status: string
          cancellation_reason: string | null
          client_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          end_time: string
          event_type_id: string | null
          id: string
          intake_answers: Json | null
          location: string | null
          original_start_time: string | null
          reminder_status: string | null
          start_time: string
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user?: string | null
          booking_link?: string | null
          calendar_status?: string
          cancellation_reason?: string | null
          client_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          event_type_id?: string | null
          id?: string
          intake_answers?: Json | null
          location?: string | null
          original_start_time?: string | null
          reminder_status?: string | null
          start_time: string
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user?: string | null
          booking_link?: string | null
          calendar_status?: string
          cancellation_reason?: string | null
          client_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_type_id?: string | null
          id?: string
          intake_answers?: Json | null
          location?: string | null
          original_start_time?: string | null
          reminder_status?: string | null
          start_time?: string
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_branding: {
        Row: {
          accent_color: string | null
          app_display_name: string | null
          app_icon_url: string | null
          avatar_logo_url: string | null
          calendar_confirmation_message: string | null
          calendar_logo_url: string | null
          calendar_primary_color: string | null
          calendar_subtitle: string | null
          calendar_title: string | null
          client_id: string
          company_name: string | null
          created_at: string
          dashboard_logo_url: string | null
          dashboard_title: string | null
          display_name: string | null
          favicon_url: string | null
          filing_readiness_title: string | null
          finance_dashboard_title: string | null
          id: string
          login_branding_text: string | null
          logo_url: string | null
          payroll_header_title: string | null
          primary_color: string | null
          report_header_title: string | null
          report_logo_url: string | null
          report_subtitle: string | null
          secondary_color: string | null
          sidebar_logo_url: string | null
          splash_logo_url: string | null
          tagline: string | null
          tax_dashboard_subtitle: string | null
          tax_document_vault_title: string | null
          tax_module_title: string | null
          tax_reminder_header_text: string | null
          tax_report_header_title: string | null
          updated_at: string
          updated_by: string | null
          welcome_message: string | null
          workspace_header_name: string | null
        }
        Insert: {
          accent_color?: string | null
          app_display_name?: string | null
          app_icon_url?: string | null
          avatar_logo_url?: string | null
          calendar_confirmation_message?: string | null
          calendar_logo_url?: string | null
          calendar_primary_color?: string | null
          calendar_subtitle?: string | null
          calendar_title?: string | null
          client_id: string
          company_name?: string | null
          created_at?: string
          dashboard_logo_url?: string | null
          dashboard_title?: string | null
          display_name?: string | null
          favicon_url?: string | null
          filing_readiness_title?: string | null
          finance_dashboard_title?: string | null
          id?: string
          login_branding_text?: string | null
          logo_url?: string | null
          payroll_header_title?: string | null
          primary_color?: string | null
          report_header_title?: string | null
          report_logo_url?: string | null
          report_subtitle?: string | null
          secondary_color?: string | null
          sidebar_logo_url?: string | null
          splash_logo_url?: string | null
          tagline?: string | null
          tax_dashboard_subtitle?: string | null
          tax_document_vault_title?: string | null
          tax_module_title?: string | null
          tax_reminder_header_text?: string | null
          tax_report_header_title?: string | null
          updated_at?: string
          updated_by?: string | null
          welcome_message?: string | null
          workspace_header_name?: string | null
        }
        Update: {
          accent_color?: string | null
          app_display_name?: string | null
          app_icon_url?: string | null
          avatar_logo_url?: string | null
          calendar_confirmation_message?: string | null
          calendar_logo_url?: string | null
          calendar_primary_color?: string | null
          calendar_subtitle?: string | null
          calendar_title?: string | null
          client_id?: string
          company_name?: string | null
          created_at?: string
          dashboard_logo_url?: string | null
          dashboard_title?: string | null
          display_name?: string | null
          favicon_url?: string | null
          filing_readiness_title?: string | null
          finance_dashboard_title?: string | null
          id?: string
          login_branding_text?: string | null
          logo_url?: string | null
          payroll_header_title?: string | null
          primary_color?: string | null
          report_header_title?: string | null
          report_logo_url?: string | null
          report_subtitle?: string | null
          secondary_color?: string | null
          sidebar_logo_url?: string | null
          splash_logo_url?: string | null
          tagline?: string | null
          tax_dashboard_subtitle?: string | null
          tax_document_vault_title?: string | null
          tax_module_title?: string | null
          tax_reminder_header_text?: string | null
          tax_report_header_title?: string | null
          updated_at?: string
          updated_by?: string | null
          welcome_message?: string | null
          workspace_header_name?: string | null
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
      crm_activities: {
        Row: {
          activity_note: string | null
          activity_type: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          related_id: string | null
          related_type: string | null
        }
        Insert: {
          activity_note?: string | null
          activity_type: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          related_id?: string | null
          related_type?: string | null
        }
        Update: {
          activity_note?: string | null
          activity_type?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          related_id?: string | null
          related_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          address: string | null
          client_id: string
          company_name: string
          created_at: string
          id: string
          industry: string | null
          primary_contact_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          client_id: string
          company_name: string
          created_at?: string
          id?: string
          industry?: string | null
          primary_contact_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          client_id?: string
          company_name?: string
          created_at?: string
          id?: string
          industry?: string | null
          primary_contact_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          client_id: string
          company_id: string | null
          contact_owner: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id?: string | null
          contact_owner?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string | null
          contact_owner?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          assigned_user: string | null
          client_id: string
          close_probability: number | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          deal_name: string
          deal_value: number | null
          expected_close_date: string | null
          id: string
          pipeline_stage: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_user?: string | null
          client_id: string
          close_probability?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_name: string
          deal_value?: number | null
          expected_close_date?: string | null
          id?: string
          pipeline_stage?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_user?: string | null
          client_id?: string
          close_probability?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_name?: string
          deal_value?: number | null
          expected_close_date?: string | null
          id?: string
          pipeline_stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_user: string | null
          client_id: string
          company_id: string | null
          contact_id: string | null
          created_at: string
          estimated_value: number | null
          id: string
          lead_status: string
          notes: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          assigned_user?: string | null
          client_id: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          lead_status?: string
          notes?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user?: string | null
          client_id?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          lead_status?: string
          notes?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_user: string | null
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          related_id: string | null
          related_type: string | null
          status: string
          title: string
        }
        Insert: {
          assigned_user?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          title: string
        }
        Update: {
          assigned_user?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_builds: {
        Row: {
          assigned_to: string | null
          booking_link: string | null
          business_name: string
          business_type: string | null
          client_id: string | null
          created_at: string
          id: string
          logo_url: string | null
          main_service: string | null
          notes: string | null
          primary_color: string | null
          primary_goal: string | null
          primary_location: string | null
          prospect_id: string | null
          secondary_color: string | null
          social_links: Json | null
          status: string
          updated_at: string
          website: string | null
          workspace_slug: string
        }
        Insert: {
          assigned_to?: string | null
          booking_link?: string | null
          business_name: string
          business_type?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          main_service?: string | null
          notes?: string | null
          primary_color?: string | null
          primary_goal?: string | null
          primary_location?: string | null
          prospect_id?: string | null
          secondary_color?: string | null
          social_links?: Json | null
          status?: string
          updated_at?: string
          website?: string | null
          workspace_slug: string
        }
        Update: {
          assigned_to?: string | null
          booking_link?: string | null
          business_name?: string
          business_type?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          main_service?: string | null
          notes?: string | null
          primary_color?: string | null
          primary_goal?: string | null
          primary_location?: string | null
          prospect_id?: string | null
          secondary_color?: string | null
          social_links?: Json | null
          status?: string
          updated_at?: string
          website?: string | null
          workspace_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_builds_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_builds_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          active: boolean
          booking_link: string | null
          buffer_after: number | null
          buffer_before: number | null
          client_id: string
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          intake_questions: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          booking_link?: string | null
          buffer_after?: number | null
          buffer_before?: number | null
          client_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          intake_questions?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          booking_link?: string | null
          buffer_after?: number | null
          buffer_before?: number | null
          client_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          intake_questions?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_types_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_readiness: {
        Row: {
          assigned_to: string | null
          category: string
          client_id: string
          created_at: string
          id: string
          item_name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          client_id: string
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          client_id?: string
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filing_readiness_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_adjustments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          type: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          type?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      meeting_reminders: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          message_content: string | null
          metadata: Json | null
          prospect_id: string
          reminder_type: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          prospect_id: string
          reminder_type: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          prospect_id?: string
          reminder_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_reminders_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_status: {
        Row: {
          assets_sent: boolean | null
          assigned_salesman: string | null
          audit_link: string | null
          audit_ready: boolean | null
          cancellation_reason: string | null
          cancellation_token: string | null
          confirmation_sent: boolean | null
          created_at: string
          demo_app_link: string | null
          demo_app_ready: boolean | null
          demo_website_link: string | null
          demo_website_ready: boolean | null
          id: string
          meeting_date: string | null
          new_requested_date: string | null
          prospect_id: string
          reminder_24h_sent: boolean | null
          reminder_30m_sent: boolean | null
          reminder_3h_sent: boolean | null
          reschedule_requested: boolean | null
          status: string
          updated_at: string
        }
        Insert: {
          assets_sent?: boolean | null
          assigned_salesman?: string | null
          audit_link?: string | null
          audit_ready?: boolean | null
          cancellation_reason?: string | null
          cancellation_token?: string | null
          confirmation_sent?: boolean | null
          created_at?: string
          demo_app_link?: string | null
          demo_app_ready?: boolean | null
          demo_website_link?: string | null
          demo_website_ready?: boolean | null
          id?: string
          meeting_date?: string | null
          new_requested_date?: string | null
          prospect_id: string
          reminder_24h_sent?: boolean | null
          reminder_30m_sent?: boolean | null
          reminder_3h_sent?: boolean | null
          reschedule_requested?: boolean | null
          status?: string
          updated_at?: string
        }
        Update: {
          assets_sent?: boolean | null
          assigned_salesman?: string | null
          audit_link?: string | null
          audit_ready?: boolean | null
          cancellation_reason?: string | null
          cancellation_token?: string | null
          confirmation_sent?: boolean | null
          created_at?: string
          demo_app_link?: string | null
          demo_app_ready?: boolean | null
          demo_website_link?: string | null
          demo_website_ready?: boolean | null
          id?: string
          meeting_date?: string | null
          new_requested_date?: string | null
          prospect_id?: string
          reminder_24h_sent?: boolean | null
          reminder_30m_sent?: boolean | null
          reminder_3h_sent?: boolean | null
          reschedule_requested?: boolean | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_status_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      message_send_log: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          message_body: string | null
          metadata: Json | null
          prospect_id: string | null
          recipient: string
          status: string
          template_name: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_body?: string | null
          metadata?: Json | null
          prospect_id?: string | null
          recipient: string
          status?: string
          template_name: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_body?: string | null
          metadata?: Json | null
          prospect_id?: string | null
          recipient?: string
          status?: string
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_send_log_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
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
      payroll_line_items: {
        Row: {
          adjustments: number | null
          client_id: string
          created_at: string
          final_pay: number | null
          gross_pay: number | null
          hours_worked: number | null
          id: string
          notes: string | null
          payroll_run_id: string
          team_member_id: string
        }
        Insert: {
          adjustments?: number | null
          client_id: string
          created_at?: string
          final_pay?: number | null
          gross_pay?: number | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          payroll_run_id: string
          team_member_id: string
        }
        Update: {
          adjustments?: number | null
          client_id?: string
          created_at?: string
          final_pay?: number | null
          gross_pay?: number | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          payroll_run_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_line_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_line_items_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          client_id: string
          created_at: string
          id: string
          paid_at: string | null
          pay_period_end: string
          pay_period_start: string
          payroll_status: string
          total_adjustments: number | null
          total_final_pay: number | null
          total_gross_pay: number | null
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          pay_period_end: string
          pay_period_start: string
          payroll_status?: string
          total_adjustments?: number | null
          total_final_pay?: number | null
          total_gross_pay?: number | null
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          pay_period_end?: string
          pay_period_start?: string
          payroll_status?: string
          total_adjustments?: number | null
          total_final_pay?: number | null
          total_gross_pay?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
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
      review_recovery_tasks: {
        Row: {
          assigned_user: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          resolved_at: string | null
          review_request_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_user?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          resolved_at?: string | null
          review_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_user?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          resolved_at?: string | null
          review_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_recovery_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_recovery_tasks_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "review_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          calendar_event_id: string | null
          channel: string
          client_id: string
          contact_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          feedback_at: string | null
          feedback_text: string | null
          id: string
          opened_at: string | null
          platform: string | null
          public_review_left: boolean | null
          rating: number | null
          recovery_needed: boolean | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          calendar_event_id?: string | null
          channel?: string
          client_id: string
          contact_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          feedback_at?: string | null
          feedback_text?: string | null
          id?: string
          opened_at?: string | null
          platform?: string | null
          public_review_left?: boolean | null
          rating?: number | null
          recovery_needed?: boolean | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          calendar_event_id?: string | null
          channel?: string
          client_id?: string
          contact_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          feedback_at?: string | null
          feedback_text?: string | null
          id?: string
          opened_at?: string | null
          platform?: string | null
          public_review_left?: boolean | null
          rating?: number | null
          recovery_needed?: boolean | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      review_templates: {
        Row: {
          active: boolean | null
          channel: string
          client_id: string
          created_at: string
          id: string
          name: string
          template_body: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          channel?: string
          client_id: string
          created_at?: string
          id?: string
          name: string
          template_body: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          channel?: string
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          template_body?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_competitors: {
        Row: {
          authority_score: number | null
          client_id: string
          created_at: string
          domain: string
          estimated_traffic: string | null
          id: string
          keywords_count: number | null
          updated_at: string
        }
        Insert: {
          authority_score?: number | null
          client_id: string
          created_at?: string
          domain: string
          estimated_traffic?: string | null
          id?: string
          keywords_count?: number | null
          updated_at?: string
        }
        Update: {
          authority_score?: number | null
          client_id?: string
          created_at?: string
          domain?: string
          estimated_traffic?: string | null
          id?: string
          keywords_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_competitors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_issues: {
        Row: {
          category: string | null
          client_id: string
          created_at: string
          id: string
          issue_title: string
          recommendation: string | null
          severity: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string
          id?: string
          issue_title: string
          recommendation?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string
          id?: string
          issue_title?: string
          recommendation?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_keywords: {
        Row: {
          client_id: string
          created_at: string
          difficulty: number | null
          id: string
          keyword: string
          position: number | null
          previous_position: number | null
          search_volume: number | null
          updated_at: string
          url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          difficulty?: number | null
          id?: string
          keyword: string
          position?: number | null
          previous_position?: number | null
          search_volume?: number | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          difficulty?: number | null
          id?: string
          keyword?: string
          position?: number | null
          previous_position?: number | null
          search_volume?: number | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_keywords_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          client_id: string
          created_at: string
          followers: number | null
          handle: string | null
          id: string
          platform: string
          profile_url: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          followers?: number | null
          handle?: string | null
          id?: string
          platform: string
          profile_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          followers?: number | null
          handle?: string | null
          id?: string
          platform?: string
          profile_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          approval_status: string | null
          caption: string | null
          client_id: string
          comments: number | null
          created_at: string
          created_by: string | null
          id: string
          likes: number | null
          media_url: string | null
          platforms: string[] | null
          published_at: string | null
          reach: number | null
          scheduled_at: string | null
          shares: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          caption?: string | null
          client_id: string
          comments?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          likes?: number | null
          media_url?: string | null
          platforms?: string[] | null
          published_at?: string | null
          reach?: number | null
          scheduled_at?: string | null
          shares?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          caption?: string | null
          client_id?: string
          comments?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          likes?: number | null
          media_url?: string | null
          platforms?: string[] | null
          published_at?: string | null
          reach?: number | null
          scheduled_at?: string | null
          shares?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_deadlines: {
        Row: {
          client_id: string
          created_at: string
          deadline_date: string
          deadline_type: string
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          deadline_date: string
          deadline_type?: string
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          deadline_date?: string
          deadline_type?: string
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_deadlines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_documents: {
        Row: {
          client_id: string
          created_at: string
          document_type: string
          file_name: string
          file_url: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          document_type?: string
          file_name: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active_status: boolean
          client_id: string
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          notes: string | null
          pay_type: string
          payment_method_status: string | null
          payroll_frequency: string | null
          role: string | null
          salary_amount: number | null
          updated_at: string
        }
        Insert: {
          active_status?: boolean
          client_id: string
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          pay_type?: string
          payment_method_status?: string | null
          payroll_frequency?: string | null
          role?: string | null
          salary_amount?: number | null
          updated_at?: string
        }
        Update: {
          active_status?: boolean
          client_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          pay_type?: string
          payment_method_status?: string | null
          payroll_frequency?: string | null
          role?: string | null
          salary_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_client_id_fkey"
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
      website_issues: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          issue_title: string
          page_id: string | null
          severity: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          issue_title: string
          page_id?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          issue_title?: string
          page_id?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_issues_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "website_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      website_pages: {
        Row: {
          client_id: string
          conversion_rate: number | null
          conversions: number | null
          created_at: string
          id: string
          leads_generated: number | null
          page_name: string
          page_type: string | null
          page_url: string | null
          status: string | null
          updated_at: string
          visits: number | null
        }
        Insert: {
          client_id: string
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string
          id?: string
          leads_generated?: number | null
          page_name: string
          page_type?: string | null
          page_url?: string | null
          status?: string | null
          updated_at?: string
          visits?: number | null
        }
        Update: {
          client_id?: string
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string
          id?: string
          leads_generated?: number | null
          page_name?: string
          page_type?: string | null
          page_url?: string | null
          status?: string | null
          updated_at?: string
          visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "website_pages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      website_traffic_sources: {
        Row: {
          client_id: string
          id: string
          percentage: number | null
          period: string | null
          recorded_at: string
          source_name: string
          visits: number | null
        }
        Insert: {
          client_id: string
          id?: string
          percentage?: number | null
          period?: string | null
          recorded_at?: string
          source_name: string
          visits?: number | null
        }
        Update: {
          client_id?: string
          id?: string
          percentage?: number | null
          period?: string | null
          recorded_at?: string
          source_name?: string
          visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "website_traffic_sources_client_id_fkey"
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
