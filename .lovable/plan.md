## Scope guardrails

- **`BDRBookingPublic.tsx` is untouched** — Form 1 stays exactly as-is. Only a registration row referencing its route.
- **The 23 activation wizard step components stay intact** — Form 4 only adds a new unified entry-point page that mounts them; underlying step logic is not rewritten.
- **`document-envelope-action` edge function is reused** as-is for signing (already verified this session).
- **`create-stripe-checkout-session` edge function is reused** as-is for payment link generation.

## Phase 1 — Schema (one migration)

Add global-form scoping so Forms 0-4 live once as NewLight-owned rows, not per client.

- `forms`: add `is_global boolean NOT NULL DEFAULT false`, `form_slug text UNIQUE NULL` (for stable lookup like `discovery`, `get-started`, `pay-sign`, `activation`, `meeting-cancel`), `external_route text NULL` (for Forms 0/1/3/4 that live in dedicated pages rather than FormBuilder-rendered field lists), `sequence_number int NULL` (0..4 or NULL).
- Make `client_id` nullable on `forms` **only when `is_global=true`**, enforced by a CHECK: `((is_global AND client_id IS NULL) OR (NOT is_global AND client_id IS NOT NULL))`.
- Keep `form_fields.client_id` and `form_submissions.client_id` NOT NULL — global forms 0/1/3/4 don't use `form_fields` (they're external routes); Form 2 also lives as a dedicated page. If future global forms need `form_fields`, we'll revisit; not needed for this build.
- New RLS policies on `forms`:
  - Existing per-client policies keep working for `is_global=false` rows.
  - Add: admins/operators can `SELECT/INSERT/UPDATE/DELETE` any `is_global=true` row (via `private.is_admin_or_operator(auth.uid())`).
  - Add: authenticated users can `SELECT` `is_global=true` rows (needed so employees can render "Your Forms" and admin Forms list can show global entries) — read-only.
  - Explicitly ensure per-client `SELECT` policies filter `is_global=false` so tenants can't see global rows through their client-scoped path.
- Seed 5 rows (Forms 0-4) via the migration (they're structure/config, not user data).

New column on `crm_deals` (for Form 3 status wiring):
- `pay_sign_status text` — `pending | invoice_sent | paid | signed | complete` (default `pending`).
- `service_agreement_envelope_id uuid` FK reference to `document_envelopes(id)`.
- `payment_invoice_id uuid` FK reference to `invoices(id)`.

## Phase 2 — Form 2 rebuild: `close-prep-submit` edge function

Extend the existing function (do not fork) to also, atomically-ish:

1. Create `proposals` row (using existing table) tied to the deal, with the pricing terms and a generated share token.
2. Create `document_envelopes` row with `envelope_type='service_agreement'`, `related_type='crm_deal'`, `related_id=deal_id`, recipient = lead owner.
3. Insert two `document_envelope_items` rows: (a) "Service Agreement", (b) "Receipt/Terms Summary". Both start with `document_url=NULL`; a follow-up admin step attaches PDFs — but the envelope is created and signable via `/sign/:share_token` once URLs are attached. For the automated-generation piece, generate a simple HTML data-URL summary as the initial `document_url` so it's signable immediately (real PDFs can replace later).
4. Update `crm_deals`: `service_agreement_envelope_id`, `pay_sign_status='pending'`.
5. Existing closing-meeting insertion unchanged.
6. Response includes: `deal_id`, `event_id`, `proposal_id`, `envelope_id`, `envelope_share_token`, `pay_sign_url` (server constructs the Form 3 URL).

`ClosePrep.tsx` UI: add a completion screen showing all three artifacts (proposal link, envelope signing link, closing meeting) and a "Send Pay & Sign to client" button that copies the Form 3 URL for that lead.

## Phase 3 — Form 3 new page: `/pay-sign/:leadId`

Public route (no auth required — client opens link from email). Server-side lookup uses lead → deal → envelope + invoice.

- New page `src/pages/PaySign.tsx`.
- New route in `App.tsx`: `<Route path="/pay-sign/:leadId" element={<PaySign />} />`.
- New edge function `pay-sign-context` that returns (given `lead_id`): business_name, envelope share_token + status, invoice status + payment_link_url, deal `pay_sign_status`. No auth (uses public share pattern like the existing sign flow), but only exposes data if the lead has a Form-2-generated envelope.
- On page load:
  - If no `payment_invoice_id` on deal → call existing `createBillingFromProposal` (or a new small edge function `create-pay-sign-invoice` that runs it server-side + generates the Stripe checkout link via `create-stripe-checkout-session`). Store `payment_invoice_id` + `payment_link_url` on the deal.
  - Show two panels side-by-side: **Pay** (Stripe checkout button opening `payment_link_url`), **Sign** (embedded `SignatureDialog` or open `/sign/:share_token`).
- New edge function `pay-sign-status-check` that polls / is called on webhook:
  - When both invoice.status='paid' AND envelope.status='signed' → set `crm_deals.pay_sign_status='complete'`, insert `audit_logs` row, fire `automation_events` `client_onboarded_pay_sign_complete`.
- Add polling on the page (5s interval) that calls `pay-sign-status-check` to catch webhook-driven state changes and re-renders.

Also add `/sign/:share_token` route in `App.tsx` — this was missing. New page `SignEnvelope.tsx` that uses `document-envelope-action` (view/sign/decline). This is required for the sign side to actually work.

## Phase 4 — Form 4 unified activation entry

New page `src/pages/Activation.tsx` at route `/activation` (auth required, admin only). This is the **entry point**, not a rebuild.

Renders a segmented control with 4 sections that each mount the existing components as-is:

1. **Onboarding intake** — mounts existing `Onboarding.tsx` content.
2. **Client intake form** — links to existing `/intake` route (opens in new tab, since it's token-based external).
3. **Webinar registration** — mounts existing `WebinarRegistration.tsx` content.
4. **Master activation wizard** — mounts existing `AdminMasterActivation.tsx`.

Existing routes `/onboarding`, `/intake`, `/webinar-register`, `/admin/master-activation` all stay live — this page is purely a unified launcher. Registered as Form 4 with `external_route='/activation'`.

## Phase 5 — Dashboard widget

Update `src/components/employee/GenericPipelineDashboard.tsx`:

- Add `YourForms` component at the top (above pipeline table).
- Shows three cards:
  - **Form 1 — Discovery**: pulls current user's `bdr_calendars.booking_slug`, renders `/bdr/book/:slug` link. Reuses `BookingLinkCard`.
  - **Form 2 — Get Started (Close Prep)**: renders `/employee/leads` link with a "Select a lead to start" helper, since Form 2 requires a specific `leadId`.
  - **Form 3 — Pay & Sign**: renders `/employee/leads` link with a "Send to closed-won leads only" helper — the actual per-client URL is copied from ClosePrep's completion screen.
- Copy-to-clipboard on each; open-in-new-tab.

## Phase 6 — Admin Forms module

Update `src/pages/FormBuilder.tsx` (`/forms`):

- New "Global Forms (NewLight)" section at the top, above the per-client form list.
- Renders the 5 global forms with badges: Form 0 (labeled "Utility" — separate from numbered sequence), Forms 1-4 (labeled by sequence number).
- Each row links to its `external_route` (open in new tab) plus shows the `form_slug` and description. Read-only — this is a registry, not an editor.

## Phase 7 — Verification (before publish)

Real verification via `psql` and `curl` where possible; report actual output:

1. **Schema**: query `information_schema.columns` for `forms` new columns; verify 5 seed rows exist with correct slugs.
2. **Form 2 chain**: call `close-prep-submit` against a real test lead, verify by querying: one new `crm_deals` row updated, one `proposals` row, one `document_envelopes` row (envelope_type='service_agreement'), two `document_envelope_items`, one `bdr_calendar_events` row. Return the actual IDs.
3. **Form 3 pay+sign**: hit `/pay-sign/:leadId` for the test lead, screenshot via Playwright, verify Stripe checkout URL is generated (not just a placeholder) and envelope signing link resolves.
4. **Dashboard widget**: Playwright screenshot of `/employee/generic` showing "Your Forms" widget with three real links.
5. **Admin Forms module**: Playwright screenshot of `/forms` showing global forms section with 5 entries.

## Technical details

- **Files created**: `src/pages/PaySign.tsx`, `src/pages/SignEnvelope.tsx`, `src/pages/Activation.tsx`, `src/components/employee/YourForms.tsx`, `supabase/functions/pay-sign-context/index.ts`, `supabase/functions/create-pay-sign-invoice/index.ts`, `supabase/functions/pay-sign-status-check/index.ts`.
- **Files modified**: `supabase/functions/close-prep-submit/index.ts` (extend), `src/pages/employee/ClosePrep.tsx` (completion screen), `src/components/employee/GenericPipelineDashboard.tsx` (widget mount), `src/pages/FormBuilder.tsx` (global section), `src/App.tsx` (new routes).
- **Files NOT touched**: `src/pages/BDRBookingPublic.tsx`, the 23 activation step components under `src/components/activation/`, `document-envelope-action`, `create-stripe-checkout-session`.
- **Reused edge functions**: `document-envelope-action`, `create-stripe-checkout-session`.
- **Reused DB tables**: `proposals`, `document_envelopes`, `document_envelope_items`, `invoices`, `crm_deals`, `bdr_calendar_events`, `bdr_calendars`, `forms`.

## Open assumptions (flag now, change if wrong)

1. Form 3 URL pattern: `/pay-sign/:leadId` (public, keyed by lead so client email links are stable). Alternative: `/pay-sign/:envelope_share_token` (keyed by envelope, more secure). I'll go with **envelope share token** as the actual route (`/pay-sign/:token`) for security, and `pay-sign-context` will resolve token → deal + invoice.
2. Form 2 initial signable document: an auto-generated HTML summary is attached as `document_url` at creation time so the envelope is immediately signable. Admin can replace with a real PDF later via the existing bundle widget pattern.
3. Global forms are visible read-only to all authenticated users so the salesman dashboard can render them; admins can create/edit. Sub-account queries filtered by `client_id=X` never surface global rows because their explicit policies scope to `client_id`.
4. Form 4 is a launcher, not a merge. If you want the four flows literally consolidated into one linear wizard (single set of steps that replaces all four), that's a much larger refactor — flag before I start.

Approve or send changes.