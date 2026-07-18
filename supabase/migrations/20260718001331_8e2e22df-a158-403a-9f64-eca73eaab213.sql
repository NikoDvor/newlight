-- Prevent client workspace users from reading raw OAuth tokens.
-- Tokens are only needed server-side (edge functions via service_role);
-- clients only need to see connection metadata/status.
REVOKE SELECT ON public.client_oauth_connections FROM authenticated;
GRANT SELECT (
  id, client_id, integration_type, token_expiry,
  property_url, location_id, status, connected_at, connected_by
) ON public.client_oauth_connections TO authenticated;
-- service_role bypasses RLS and column grants, so edge functions still
-- see access_token / refresh_token as needed.