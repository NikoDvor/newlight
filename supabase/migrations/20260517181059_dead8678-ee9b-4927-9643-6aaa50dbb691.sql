
REVOKE EXECUTE ON FUNCTION public.get_employee_client_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_client(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_client_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_client(uuid, uuid) TO authenticated, service_role;
