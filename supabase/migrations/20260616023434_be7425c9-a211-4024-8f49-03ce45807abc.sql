-- Ensure RLS is enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and rebuild cleanly
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'audit_logs' AND schemaname = 'public'
  LOOP EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.audit_logs'; END LOOP;
END $$;

-- Admins see all logs across all clients
CREATE POLICY "audit_logs_admin" ON public.audit_logs
  FOR ALL TO authenticated
  USING (private.is_admin_or_operator(auth.uid()))
  WITH CHECK (private.is_admin_or_operator(auth.uid()));

-- Client users can read logs scoped to their own client_id
CREATE POLICY "audit_logs_client_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    client_id IS NOT NULL
    AND private.user_has_client_access(auth.uid(), client_id)
  );