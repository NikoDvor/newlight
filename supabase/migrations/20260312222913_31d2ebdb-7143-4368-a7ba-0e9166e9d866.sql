
-- Fix RLS policies for clients table
-- Drop existing policies
DROP POLICY IF EXISTS "Admins full access on clients" ON public.clients;
DROP POLICY IF EXISTS "Client users read own client" ON public.clients;

-- 1. Admin full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin full access on clients"
ON public.clients FOR ALL
TO authenticated
USING (public.is_admin_or_operator(auth.uid()))
WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 2. Client users read-only access to their own workspace
CREATE POLICY "Client users read own client"
ON public.clients FOR SELECT
TO authenticated
USING (public.user_has_client_access(auth.uid(), id));

-- 3. Allow anon role for demo/development (inserts and selects)
CREATE POLICY "Anon demo access on clients"
ON public.clients FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Fix provision_queue for anon
DROP POLICY IF EXISTS "Admins manage provision queue" ON public.provision_queue;
CREATE POLICY "Admins manage provision queue"
ON public.provision_queue FOR ALL
TO authenticated
USING (public.is_admin_or_operator(auth.uid()))
WITH CHECK (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Anon demo access on provision_queue"
ON public.provision_queue FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Fix client_integrations for anon
CREATE POLICY "Anon demo access on client_integrations"
ON public.client_integrations FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Fix client_branding for anon
CREATE POLICY "Anon demo access on client_branding"
ON public.client_branding FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Fix onboarding_progress for anon
CREATE POLICY "Anon demo access on onboarding_progress"
ON public.onboarding_progress FOR ALL
TO anon
USING (true)
WITH CHECK (true);
