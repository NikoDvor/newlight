-- Street Walk / Street Sweep removed from the app (Oct 28, 2026; financial firms only).
-- Apply AFTER the frontend without Street Walk is published (old published code
-- still reads these). Data at removal time: 1 test route + 1 test street, no
-- visits, no in-person leads, no lead with walk/geo data.
drop table if exists public.street_sweep_visits;
drop table if exists public.street_sweep_routes;
drop table if exists public.nl_inperson_outcomes;
drop table if exists public.nl_inperson_leads;
drop table if exists public.nl_inperson_streets;
alter table public.nl_bdr_leads
  drop column if exists street_number,
  drop column if exists side_of_street,
  drop column if exists sequence_order,
  drop column if exists visit_status,
  drop column if exists latitude,
  drop column if exists longitude;
