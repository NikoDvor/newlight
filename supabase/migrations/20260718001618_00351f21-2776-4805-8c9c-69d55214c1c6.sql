-- Replace the client-wide ALL policy with per-command policies so client users
-- can still write/delete their own connections but cannot SELECT raw token rows.
-- Only admins/operators can SELECT the full row.
DROP POLICY IF EXISTS "clients_client_oauth_connections" ON public.client_oauth_connections;

CREATE POLICY "clients_client_oauth_connections_insert"
ON public.client_oauth_connections
FOR INSERT TO authenticated
WITH CHECK (private.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "clients_client_oauth_connections_update"
ON public.client_oauth_connections
FOR UPDATE TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id))
WITH CHECK (private.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "clients_client_oauth_connections_delete"
ON public.client_oauth_connections
FOR DELETE TO authenticated
USING (private.user_has_client_access(auth.uid(), client_id));

-- Deliberately no client SELECT policy: any UI that needs to show connection
-- status/metadata to client users should call a SECURITY DEFINER RPC that
-- returns only non-token columns, or read via an edge function.
-- The existing `admins_client_oauth_connections` (ALL) policy keeps admin/operator
-- read/write access intact.