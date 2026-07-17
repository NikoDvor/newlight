
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Operators can manage non-admin roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  private.is_admin_or_operator(auth.uid())
  AND role <> 'admin'::public.app_role
)
WITH CHECK (
  private.is_admin_or_operator(auth.uid())
  AND role <> 'admin'::public.app_role
);
