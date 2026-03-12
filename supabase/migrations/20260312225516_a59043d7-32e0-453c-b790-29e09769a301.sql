-- Add anon demo access to tables missing it for unauthenticated demo usage

-- user_roles - needed for demo role checks
CREATE POLICY "Anon demo access on user_roles"
ON public.user_roles FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- fix_now_items
CREATE POLICY "Anon demo access on fix_now_items"
ON public.fix_now_items FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- client_health_scores
CREATE POLICY "Anon demo access on client_health_scores"
ON public.client_health_scores FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ai_business_insights
CREATE POLICY "Anon demo access on ai_business_insights"
ON public.ai_business_insights FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- meeting_intelligence
CREATE POLICY "Anon demo access on meeting_intelligence"
ON public.meeting_intelligence FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- growth_projections
CREATE POLICY "Anon demo access on growth_projections"
ON public.growth_projections FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- revenue_opportunities
CREATE POLICY "Anon demo access on revenue_opportunities"
ON public.revenue_opportunities FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- audit_logs - allow anon read
CREATE POLICY "Anon demo access on audit_logs"
ON public.audit_logs FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- automation tables
CREATE POLICY "Anon demo access on automation_events"
ON public.automation_events FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon demo access on automations"
ON public.automations FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon demo access on automation_runs"
ON public.automation_runs FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon demo access on automation_logs"
ON public.automation_logs FOR ALL
TO anon
USING (true)
WITH CHECK (true);