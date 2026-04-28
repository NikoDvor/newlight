REVOKE EXECUTE ON FUNCTION public.assign_default_role_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_operator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_operator(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_client_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_client_access(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_manage_workspace_users(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_workspace_users(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_proposal_token() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_proposal_token() TO anon;