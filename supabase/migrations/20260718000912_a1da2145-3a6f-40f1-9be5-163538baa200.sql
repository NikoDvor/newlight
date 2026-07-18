-- SECURITY FIX: previously operators could INSERT any non-admin role for any user/client,
-- letting them grant themselves 'client_owner' on any tenant. Restrict operators to
-- (a) only clients they're assigned to via workspace_users, AND
-- (b) only low-privilege roles (client_team, read_only, marketing_staff, support_staff).
-- Admins retain full control via the separate "Admins can manage all roles" policy.
DROP POLICY IF EXISTS "Operators can manage non-admin roles" ON public.user_roles;

CREATE POLICY "Operators can manage low-priv roles for assigned clients"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  private.has_role(auth.uid(), 'operator'::public.app_role)
  AND role IN ('client_team'::public.app_role, 'read_only'::public.app_role, 'marketing_staff'::public.app_role, 'support_staff'::public.app_role)
  AND client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.user_id = auth.uid()
      AND wu.client_id = user_roles.client_id
      AND wu.status = 'active'
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'operator'::public.app_role)
  AND role IN ('client_team'::public.app_role, 'read_only'::public.app_role, 'marketing_staff'::public.app_role, 'support_staff'::public.app_role)
  AND client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.user_id = auth.uid()
      AND wu.client_id = user_roles.client_id
      AND wu.status = 'active'
  )
);