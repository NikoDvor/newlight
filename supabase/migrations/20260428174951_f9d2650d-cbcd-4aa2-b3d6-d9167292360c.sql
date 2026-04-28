CREATE SCHEMA IF NOT EXISTS private;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_admin_or_operator(uuid) SET SCHEMA private;
ALTER FUNCTION public.user_has_client_access(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_manage_workspace_users(uuid, uuid) SET SCHEMA private;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_or_operator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_has_client_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_workspace_users(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_proposal_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO public
AS $function$
  SELECT coalesce(
    current_setting('request.headers', true)::json->>'x-proposal-token',
    ''
  )
$function$;

GRANT EXECUTE ON FUNCTION public.get_proposal_token() TO anon;
REVOKE EXECUTE ON FUNCTION public.get_proposal_token() FROM authenticated;