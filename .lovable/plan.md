# Client sidebar information architecture cleanup

## Outcome

Rebuild the client sidebar as exactly ten ordered, collapsible modules with the supplied plain-English subtitles. Existing pages remain intact; only their client navigation placement changes, except Email is hidden from client navigation.

## Navigation structure

1. **Dashboard** — links to the existing overview.
2. **AI Insights** — AI Insights, Reviews, Market Research, Competitor Tracking, Meeting Intelligence, Automation Workflows, Signed Documents.
3. **AI Growth Advisor** — Growth Advisor and Revenue Expansion.
4. **Client Acquisition** — Lead Sourcing, Dialer, Street Walk, Referral Program, Lifecycle & Nurture.
5. **Pipeline** — Deals Kanban, Tasks, Approvals.
6. **CRM** — Contacts, Companies, AI Calendar, Call Tracking.
7. **Growth Systems** — Website, SEO, Ads, Social Media, AI Visibility, Tracking & Attribution only.
8. **Communications** — Inbox, Follow-Ups, Templates, Forms; Email will not appear.
9. **Client Overview** — a new clean coming-soon page, with room reserved for Financial Compliance, Retention, Reports, Help Center, Billing, and Audit Logs in the follow-up phase.
10. **Team & Training** — Team, Staff Calendars, Employee Performance, Training Center, Onboarding.

Every moved item keeps its current permission key and any workspace eligibility rule. Enterprise Services and Account will no longer exist as client sidebar groups, and no moved item will remain duplicated elsewhere.

## Client routes and account access

- Add client-shell routes for Dialer and Street Walk so client workspace users can open those existing tools without entering the employee shell.
- Add stable CRM links for Contacts and Companies that open the corresponding existing CRM view.
- Reuse the real client Documents page for Signed Documents rather than exposing the admin-only mock view.
- Keep old page routes available for bookmarks, including Email, while removing Email from navigation as requested.
- Turn the existing avatar/sign-out controls into a standard user menu containing Settings and Sign out, keeping account access outside the sidebar.
- Do not modify the admin sidebar or admin routes.

## UI behavior

- Show each module subtitle directly below its module name when expanded.
- Automatically keep the module containing the active page open.
- Preserve icon-only collapsed navigation with tooltips and the always-available sidebar trigger.
- Use the existing dark visual system, spacing, icons, and permission filtering.

## Verification

- Run the project’s automated checks.
- Verify the ten modules, exact order, subtitles, expansion, active states, and collapsed sidebar in the live preview.
- Verify representative moved links, CRM Contacts/Companies, client Dialer/Street Walk, Client Overview, and the avatar menu on desktop and mobile widths.
- Confirm Email, Enterprise Services, and Account are absent from the client sidebar and the admin navigation is unchanged.
