CREATE OR REPLACE FUNCTION public.get_client_oauth_connection_status(
  _client_id uuid,
  _integration_type text
)
RETURNS TABLE (
  id uuid,
  client_id uuid,
  integration_type text,
  token_expiry timestamptz,
  property_url text,
  location_id text,
  status text,
  connected_at timestamptz,
  connected_by uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.user_has_client_access(auth.uid(), _client_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT c.id, c.client_id, c.integration_type, c.token_expiry,
         c.property_url, c.location_id, c.status, c.connected_at, c.connected_by
  FROM public.client_oauth_connections c
  WHERE c.client_id = _client_id
    AND c.integration_type = _integration_type
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_client_oauth_connection_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_client_oauth_connection_status(uuid, text) TO authenticated;