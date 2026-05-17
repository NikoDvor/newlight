## Multi-tenant isolation for the employee system

### Discovery that changes the plan
BDR/SDR accounts created via Add Manually are stored as platform-wide `marketing_staff` in `employee_profiles` — they are NOT inserted into `workspace_users`. So "workspace_users.client_id" alone can't drive isolation for BDRs. We need an authoritative client_id on `employee_profiles` and to extend the Add Manually form to assign it.

### Step 1 — Schema (single migration)

1. Insert a dedicated `clients` row with `workspace_slug = 'newlight-internal'`, `business_name = 'NewLight Internal'`, capture its UUID into a local var.
2. Add `client_id uuid REFERENCES clients(id) ON DELETE RESTRICT` to:
   - `employee_profiles` (NEW)
   - `bdr_call_outcomes`
   - `bdr_calendars`
   - `bdr_calendar_events`
   (`nl_bdr_leads.client_id` already exists.)
3. Backfill every NULL `client_id` on those four tables + `nl_bdr_leads` to the NewLight Internal id.
4. `ALTER COLUMN client_id SET NOT NULL` on all four (kept nullable only on `nl_bdr_leads` if any orphans block it — will verify after backfill).
5. Indexes: `(client_id)` on each table; composite `(client_id, user_id)` on leads/outcomes.

### Step 2 — Helper functions (SECURITY DEFINER)

- `public.get_employee_client_id(_user_id uuid) returns uuid` — resolves in order: `employee_profiles.client_id` → first `workspace_users.client_id` → NewLight Internal id constant fallback.
- `public.user_can_access_client(_user_id uuid, _client_id uuid) returns boolean` — true if:
   - has role `admin` (cross-tenant), OR
   - has role `operator` AND a matching `workspace_users` row for that client (Service Manager scope), OR
   - their `get_employee_client_id` equals `_client_id`.
- A `service_manager`-style operator with no workspace_users rows still sees nothing — explicit by design.

### Step 3 — RLS rewrite (all four tables)

Replace per-table policies with:
- SELECT: `user_can_access_client(auth.uid(), client_id)`
- INSERT: `user_can_access_client(auth.uid(), client_id) AND auth.uid() = user_id` (owner stamping preserved)
- UPDATE/DELETE: `user_can_access_client(auth.uid(), client_id) AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))`

Existing "Admins can view/update all" policies are subsumed.

### Step 4 — `create-user-manual` edge function

- Accept `client_id` for `bdr` / `sdr` as well (default to NewLight Internal id when empty).
- Insert that `client_id` on the new `employee_profiles` row.
- Keep `user_roles` behavior unchanged (BDR/SDR stay `marketing_staff` platform-wide for routing).

### Step 5 — Admin "Add Manually" form (`src/pages/admin/AdminTeam.tsx`)

- Show the Client picker for `bdr` and `sdr` too, defaulting to "NewLight Internal" but selectable to any client (for sub-account BDR/SDR hires).
- Validate selection before submit.

### Step 6 — Frontend query scoping

Add a tiny hook `useEmployeeClientId()` that selects from `employee_profiles.client_id` (fallback `workspace_users.client_id`) once per session.
Update writes/reads in:
- `src/pages/employee/BDRMyLeads.tsx` — stamp `client_id` on every insert; add `.eq('client_id', clientId)` on selects (in addition to existing `user_id` filter).
- `src/pages/employee/BDRDialer.tsx` — same for leads + call_outcomes.
- `src/pages/employee/BDRCalendar.tsx` — same for events; stamp on inserts.
- `src/components/CustomerProfilePanel.tsx` — stamp `client_id` on follow-up event insert.
- `src/lib/bdrCalendar.ts` — stamp `client_id` when auto-creating calendar + on event inserts from booking flow (derive from calendar row).
- `src/components/BDRCallbackCountdown.tsx` — add client filter.

RLS will already block cross-tenant reads, but explicit filters keep queries fast and prevent showing stale cached rows.

### Step 7 — Edge function `bdr-book` and `AdminBDRCalendars`

- `bdr-book/index.ts`: when inserting `bdr_calendar_events` from a booking, copy `client_id` from the chosen calendar row.
- `AdminBDRCalendars.tsx`: no functional change required (admin role already cross-tenant); add a "Client" column for visibility.

### Step 8 — Verification

After migration:
- `SELECT count(*) FROM nl_bdr_leads WHERE client_id IS NULL` → expect 0.
- Same for the other 3 tables.
- Spot-load BDRMyLeads + BDRDialer + BDRCalendar as an existing BDR — rows still appear (they're stamped to NewLight Internal and the user resolves to that same id).

### Out of scope (per earlier turn)
- External Google/Outlook sync stays as Coming Soon toggles.
- No changes to other employee modules (training, objections) unless they query the four tables — they don't.

### Technical notes
- `workspace_users.role_preset` already supports project/service managers; we reuse that surface for the operator-scoped admin override.
- `ON DELETE RESTRICT` on the NewLight Internal client prevents accidental deletion of the tenant that owns all legacy rows.
- No backfilling of `nl_bdr_leads.user_id → workspace` is needed — we deliberately route all legacy data to NewLight Internal per your choice.
