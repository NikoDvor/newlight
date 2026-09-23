# Phase 3: Admin navigation cleanup

## Scope decision

The current admin **Sales Pipeline** is not a cross-client rollup. Its deal board is hard-scoped to NewLight Internal, so it duplicates the Pipeline now available through NewLight Internal’s client shell. The existing **Pipeline Insights** screen is the real cross-client view: it compares deals, meetings, conversion, no-shows, and bottlenecks across all client workspaces.

## Changes

### 1. Remove or consolidate genuine duplicates

Remove these links from the admin sidebar and admin search index, without deleting their underlying screens in this pass:

- **Sales Pipeline** — duplicates NewLight Internal’s per-workspace Pipeline. Existing deep links remain available until their remaining internal references are retired separately.
- **Signed Documents** — duplicates each workspace’s Signed Documents experience and the admin page currently displays sample-only data rather than a real cross-client view.
- **Retention** — consolidate into **Client Success**, which already contains agency-wide churn risks, renewals, support, upsells, and adoption. Keep the old route available, but remove the redundant sidebar/search entry.

### 2. Make cross-client pipeline oversight explicit

- Move **Pipeline Insights** from System into Sales.
- Rename its navigation label to **Client Pipeline Overview**.
- Give it the subtitle: “Compare pipeline performance across every client workspace.”
- Keep the existing all-client/client-filter behavior; do not invent new pipeline functionality.

### 3. Clarify and organize Sales

Keep the remaining agency sales tools and add plain-English subtitles:

- **Client Pipeline Overview** — “Compare pipeline performance across every client workspace.”
- **Sales Control Center** — “Build pricing, packages, and proposals for a client.”
- **Prospects** — “Track potential NewLight clients before they become accounts.”
- **BDR Performance** — “Review call activity and outcomes across the BDR team.”
- **BDR Meeting Analytics** — “Measure meeting attendance, progression, and close outcomes.”
- **Proposal Templates** — “Manage reusable pricing and terms for proposals.”
- **Sales Demo Creator** — “Capture a prospect and create a branded demo workspace.”

This makes the distinction explicit: the admin overview compares all client workspaces; a sub-account’s Pipeline manages only that workspace’s deals.

### 4. Add plain-English context across admin navigation

Show a short subtitle beneath every expanded admin item, while collapsed mode keeps icon tooltips. Keep the existing groups, but clarify their purpose:

- **Top:** overall agency status and urgent issues.
- **Sales:** NewLight sales operations plus the clearly labeled cross-client pipeline overview.
- **Clients & Success:** client accounts, onboarding, provisioning, health, success, and managed websites.
- **System:** agency reporting, billing, revenue attribution, and settings.

No routes or client-side navigation will be changed beyond removing redundant admin links from the admin search index.

## Kept as legitimately agency-wide

- Dashboard and Fix Now
- Sales Control Center, Prospects, BDR Performance, BDR Meeting Analytics, Proposal Templates, Sales Demo Creator
- Client Accounts, Acquisition Analytics, Onboarding Ops, Provision Queue, Client Monitoring, Client Success, Website Portfolio
- Reports, Billing, Client Revenue, System Settings
- Client Pipeline Overview, backed by the existing cross-client Pipeline Insights screen

## Technical details

- Extend the admin navigation item model with a subtitle/description.
- Render two-line items only when the sidebar is expanded; preserve compact icon mode, active-route highlighting, group expansion, and collapse behavior.
- Update the mirrored admin search index to match the cleaned navigation labels and routes.
- Do not modify `AppSidebar`, `AppLayout`, database policies, tenant filters, or any client data queries.
- Validate type checks, lint, tests, static navigation contents, and the rendered admin sidebar at desktop and mobile widths.
