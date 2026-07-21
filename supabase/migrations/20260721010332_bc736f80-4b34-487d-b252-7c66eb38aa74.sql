
REVOKE EXECUTE ON FUNCTION public.check_lead_claimed(text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_lead_conflicts(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reassign_lead(uuid,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_stale_bdr_leads(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.normalize_phone_last10(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.normalize_website_host(text) FROM PUBLIC, anon;
