REVOKE ALL ON FUNCTION public.expire_stale_pipeline_leads() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_pipeline_leads() TO postgres, service_role;