
-- =====================================================
-- PART 1: Drop all 62 "Anon demo" ALL policies
-- =====================================================
DROP POLICY IF EXISTS "Anon demo ad_campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Anon demo access on ai_business_insights" ON public.ai_business_insights;
DROP POLICY IF EXISTS "Anon demo access on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Anon demo access on automation_events" ON public.automation_events;
DROP POLICY IF EXISTS "Anon demo access on automation_logs" ON public.automation_logs;
DROP POLICY IF EXISTS "Anon demo access on automation_runs" ON public.automation_runs;
DROP POLICY IF EXISTS "Anon demo access on automations" ON public.automations;
DROP POLICY IF EXISTS "Anon demo autopilot_rules" ON public.autopilot_rules;
DROP POLICY IF EXISTS "Anon demo access on availability_settings" ON public.availability_settings;
DROP POLICY IF EXISTS "Anon demo access on calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Anon demo access on client_branding" ON public.client_branding;
DROP POLICY IF EXISTS "Anon demo access on client_health_scores" ON public.client_health_scores;
DROP POLICY IF EXISTS "Anon demo access on client_integrations" ON public.client_integrations;
DROP POLICY IF EXISTS "Anon demo access on clients" ON public.clients;
DROP POLICY IF EXISTS "Anon demo commission_records" ON public.commission_records;
DROP POLICY IF EXISTS "Anon demo crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Anon demo crm_companies" ON public.crm_companies;
DROP POLICY IF EXISTS "Anon demo crm_connections" ON public.crm_connections;
DROP POLICY IF EXISTS "Anon demo crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Anon demo crm_deals" ON public.crm_deals;
DROP POLICY IF EXISTS "Anon demo crm_field_mappings" ON public.crm_field_mappings;
DROP POLICY IF EXISTS "Anon demo crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Anon demo crm_notes" ON public.crm_notes;
DROP POLICY IF EXISTS "Anon demo crm_sync_logs" ON public.crm_sync_logs;
DROP POLICY IF EXISTS "Anon demo crm_tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Anon demo access on demo_builds" ON public.demo_builds;
DROP POLICY IF EXISTS "Anon demo email_connections" ON public.email_connections;
DROP POLICY IF EXISTS "Anon demo email_messages" ON public.email_messages;
DROP POLICY IF EXISTS "Anon demo email_threads" ON public.email_threads;
DROP POLICY IF EXISTS "Anon demo access on event_types" ON public.event_types;
DROP POLICY IF EXISTS "Anon demo access on filing_readiness" ON public.filing_readiness;
DROP POLICY IF EXISTS "Anon demo access on financial_adjustments" ON public.financial_adjustments;
DROP POLICY IF EXISTS "Anon demo access on fix_now_items" ON public.fix_now_items;
DROP POLICY IF EXISTS "Anon demo access on growth_projections" ON public.growth_projections;
DROP POLICY IF EXISTS "Anon demo labor_cost_records" ON public.labor_cost_records;
DROP POLICY IF EXISTS "Anon demo marketing_campaigns" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "Anon demo access on meeting_intelligence" ON public.meeting_intelligence;
DROP POLICY IF EXISTS "Anon demo access on onboarding_progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Anon demo payouts" ON public.payouts;
DROP POLICY IF EXISTS "Anon demo access on payroll_line_items" ON public.payroll_line_items;
DROP POLICY IF EXISTS "Anon demo access on payroll_runs" ON public.payroll_runs;
DROP POLICY IF EXISTS "Anon demo pipeline_stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Anon demo access on provision_queue" ON public.provision_queue;
DROP POLICY IF EXISTS "Anon demo access on revenue_opportunities" ON public.revenue_opportunities;
DROP POLICY IF EXISTS "Anon demo review_recovery_tasks" ON public.review_recovery_tasks;
DROP POLICY IF EXISTS "Anon demo review_requests" ON public.review_requests;
DROP POLICY IF EXISTS "Anon demo review_templates" ON public.review_templates;
DROP POLICY IF EXISTS "Anon demo seo_competitors" ON public.seo_competitors;
DROP POLICY IF EXISTS "Anon demo seo_issues" ON public.seo_issues;
DROP POLICY IF EXISTS "Anon demo seo_keywords" ON public.seo_keywords;
DROP POLICY IF EXISTS "Anon demo social_accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Anon demo social_posts" ON public.social_posts;
DROP POLICY IF EXISTS "Anon demo access on tax_deadlines" ON public.tax_deadlines;
DROP POLICY IF EXISTS "Anon demo access on tax_documents" ON public.tax_documents;
DROP POLICY IF EXISTS "Anon demo access on team_members" ON public.team_members;
DROP POLICY IF EXISTS "Anon demo time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Anon demo timesheets" ON public.timesheets;
DROP POLICY IF EXISTS "Anon demo access on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anon demo website_issues" ON public.website_issues;
DROP POLICY IF EXISTS "Anon demo website_pages" ON public.website_pages;
DROP POLICY IF EXISTS "Anon demo website_traffic_sources" ON public.website_traffic_sources;
DROP POLICY IF EXISTS "Anon demo workers" ON public.workers;

-- =====================================================
-- PART 2: Remove overly permissive anon booking policies
-- =====================================================

-- crm_contacts: remove blanket anon read/update (PII exposure)
DROP POLICY IF EXISTS "anon_read_contacts_booking" ON public.crm_contacts;
DROP POLICY IF EXISTS "anon_update_contacts_booking" ON public.crm_contacts;

-- appointments: remove blanket anon read
DROP POLICY IF EXISTS "anon_read_appointments" ON public.appointments;

-- audit_logs: remove anon insert (no reason for anon to write audit logs)
DROP POLICY IF EXISTS "anon_insert_audit_booking" ON public.audit_logs;

-- crm_activities: remove anon insert
DROP POLICY IF EXISTS "anon_insert_activities_booking" ON public.crm_activities;

-- calendar_blackout_dates: remove blanket anon read
DROP POLICY IF EXISTS "anon_read_blackouts" ON public.calendar_blackout_dates;

-- calendar_users: remove blanket anon read
DROP POLICY IF EXISTS "anon_read_cal_users" ON public.calendar_users;

-- meeting_reminders: remove blanket anon read
DROP POLICY IF EXISTS "Anon read meeting reminders" ON public.meeting_reminders;

-- meeting_status: remove blanket anon read/update
DROP POLICY IF EXISTS "Anon read meeting status" ON public.meeting_status;
DROP POLICY IF EXISTS "Anon can update meeting status for cancellation" ON public.meeting_status;

-- message_send_log: remove blanket anon read/insert
DROP POLICY IF EXISTS "Anon read message log" ON public.message_send_log;
DROP POLICY IF EXISTS "Anon insert message log" ON public.message_send_log;

-- =====================================================
-- PART 3: Fix tax-documents storage policies
-- =====================================================

-- Drop overly broad storage policies
DROP POLICY IF EXISTS "Auth users view tax docs" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload tax docs" ON storage.objects;

-- Scoped: users can only view tax docs in their own user folder
CREATE POLICY "Users view own tax docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tax-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Scoped: users can only upload tax docs to their own user folder
CREATE POLICY "Users upload own tax docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tax-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
