CREATE OR REPLACE FUNCTION public.can_manage_workspace_users(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_operator(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.workspace_users wu
      WHERE wu.user_id = _user_id
        AND wu.client_id = _client_id
        AND wu.status IN ('active', 'pending')
        AND wu.role_preset IN ('owner', 'admin', 'manager')
    )
$$;

DROP POLICY IF EXISTS workspace_users_insert ON public.workspace_users;
DROP POLICY IF EXISTS workspace_users_update ON public.workspace_users;
DROP POLICY IF EXISTS workspace_users_delete ON public.workspace_users;

CREATE POLICY workspace_users_insert
ON public.workspace_users
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_workspace_users(auth.uid(), client_id));

CREATE POLICY workspace_users_update
ON public.workspace_users
FOR UPDATE
TO authenticated
USING (public.can_manage_workspace_users(auth.uid(), client_id))
WITH CHECK (public.can_manage_workspace_users(auth.uid(), client_id));

CREATE POLICY workspace_users_delete
ON public.workspace_users
FOR DELETE
TO authenticated
USING (public.can_manage_workspace_users(auth.uid(), client_id));

DROP POLICY IF EXISTS "Users insert own certifications" ON public.nl_training_certifications;
DROP POLICY IF EXISTS "Users view own certifications" ON public.nl_training_certifications;
DROP POLICY IF EXISTS "Users insert own attempts" ON public.nl_training_exam_attempts;
DROP POLICY IF EXISTS "Users view own attempts" ON public.nl_training_exam_attempts;

CREATE POLICY "Users insert own certifications"
ON public.nl_training_certifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Users view own certifications"
ON public.nl_training_certifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Users insert own attempts"
ON public.nl_training_exam_attempts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Users view own attempts"
ON public.nl_training_exam_attempts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));