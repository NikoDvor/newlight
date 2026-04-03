-- Remove the overly permissive ALL policy
DROP POLICY IF EXISTS "workspace_permissions_all" ON public.workspace_permissions;

-- Remove duplicate select policy if exists
DROP POLICY IF EXISTS "workspace_permissions_select" ON public.workspace_permissions;

-- Read: any authenticated user with client access can view permissions
CREATE POLICY "client_read_workspace_permissions"
ON public.workspace_permissions
FOR SELECT
TO authenticated
USING (public.user_has_client_access(auth.uid(), client_id));

-- Write: only admins/operators can insert, update, delete
CREATE POLICY "admin_manage_workspace_permissions"
ON public.workspace_permissions
FOR ALL
TO authenticated
USING (public.is_admin_or_operator(auth.uid()))
WITH CHECK (public.is_admin_or_operator(auth.uid()));