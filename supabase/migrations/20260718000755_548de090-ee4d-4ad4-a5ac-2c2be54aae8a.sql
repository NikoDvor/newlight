-- SECURITY FIX: user_can_access_client previously granted operators access to ALL clients
-- when the operator had no workspace_users row. Default-deny instead: an operator must
-- have an explicit workspace_users assignment matching the target client_id.
CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- Admin: full cross-tenant
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    -- Operator: must have an explicit workspace assignment for this client
    OR (
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'operator')
      AND EXISTS (SELECT 1 FROM public.workspace_users WHERE user_id = _user_id AND client_id = _client_id AND status = 'active')
    )
    -- Otherwise must match employee's own client (NULL from get_employee_client_id => deny)
    OR public.get_employee_client_id(_user_id) = _client_id;
$$;