
-- review_requests table already exists, just ensure review_recovery_tasks exists
CREATE TABLE IF NOT EXISTS public.review_recovery_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  review_request_id uuid REFERENCES public.review_requests(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  issue_summary text,
  recovery_stage text NOT NULL DEFAULT 'negative_feedback',
  assigned_to uuid,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.review_recovery_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage review_recovery_tasks" ON public.review_recovery_tasks;
CREATE POLICY "Admins manage review_recovery_tasks" ON public.review_recovery_tasks
  FOR ALL TO authenticated USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

DROP POLICY IF EXISTS "Client users manage own review_recovery_tasks" ON public.review_recovery_tasks;
CREATE POLICY "Client users manage own review_recovery_tasks" ON public.review_recovery_tasks
  FOR ALL TO authenticated USING (user_has_client_access(auth.uid(), client_id))
  WITH CHECK (user_has_client_access(auth.uid(), client_id));

DROP POLICY IF EXISTS "Anon demo review_recovery_tasks" ON public.review_recovery_tasks;
CREATE POLICY "Anon demo review_recovery_tasks" ON public.review_recovery_tasks
  FOR ALL TO anon USING (true) WITH CHECK (true);
