-- Street Walk / Street Sweep removed from the app (Oct 28, 2026; financial firms only).
-- Applied Oct 28, 2026 after the user published the frontend (old published code
-- still reads these). Data at removal time: 1 test route + 1 test street, no
-- visits, no in-person leads, no lead with walk/geo data.
drop table if exists public.street_sweep_visits;
drop table if exists public.street_sweep_routes;
drop table if exists public.nl_inperson_outcomes;
drop table if exists public.nl_inperson_leads;
drop table if exists public.nl_inperson_streets;
drop table if exists public.nl_inperson_master_prompt;
alter table public.nl_bdr_leads
  drop column if exists street_number,
  drop column if exists side_of_street,
  drop column if exists sequence_order,
  drop column if exists visit_status,
  drop column if exists latitude,
  drop column if exists longitude;

-- Oct 28, 2026 (later): Pay & Sign link send dates, former-client marker.
alter table public.crm_deals add column if not exists pay_sign_sent_at timestamptz, add column if not exists pay_sign_last_sent_at timestamptz;
alter table public.clients add column if not exists former_client_at timestamptz, add column if not exists former_client_reason text;
-- Removed 298 empty CRM deals created at lead import (no Form 2, no price);
-- import/add no longer creates a deal — Form 2 does.
