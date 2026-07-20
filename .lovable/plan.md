
## Where calendars render today

**Full month/week grids**
- `src/pages/employee/BDRCalendar.tsx` — MonthView + WeekView + DayAgenda + ShareDialog (BDR's personal pipeline calendar). **Already migrated last turn** to shared `MonthGrid` / `DayAgendaSheet` / skeletons / empty state.
- `src/pages/CalendarPage.tsx` — client-facing workspace calendar; month grid rendered via inline `grid grid-cols-7 grid-preserve` (lines ~449, ~460). Still uses its own week view and event chips.

**Read-only month renders**
- `src/pages/CalendarManagement.tsx` — availability preview.
- `src/pages/admin/AdminStaffCalendars.tsx` — table of staff calendars (no grid; just a list — out of scope).
- `src/pages/admin/AdminBDRCalendars.tsx` — same (list, out of scope).

**Date + slot pickers (booking flows)**
- `src/components/CalendarSlotPicker.tsx` — used inside activation wizard for internal booking.
- `src/components/BookingSlotPicker.tsx` — public booking (`BDRBookingPublic.tsx`, `BookingPage.tsx`) — horizontal date strip + slot buttons.
- `src/components/ui/calendar.tsx` — shadcn/react-day-picker primitive, wrapped by `Popover` date inputs across ~20 pages (Meetings, CRM, Tasks, ContactDetail, admin activation steps, etc.).

**Note:** the ui/calendar primitive is a solved, consistent surface (shadcn). Standardizing it is out of scope; the redesign target is the *event-bearing* month/week/day views.

## Shared component system (already scaffolded in `src/components/calendar/`)

Built last turn:
- `types.ts` — `CalendarEventLike`, `EventKind`.
- `tokens.ts` — `resolveEventKind`, `eventColor`, `EVENT_LABEL` mapping (Discovery / Closing / Dialer / Manual / Booking Form / SDR Mirror), backed by CSS tokens in `src/index.css` (`--cal-dot-*`, `--cal-today`, `--cal-selected`, `--cal-grid-line`, `--cal-dim`).
- `EventDots.tsx` — up to 3 dots + `+N`.
- `DayCell.tsx` — a11y button, ≥44px, today (filled accent circle) vs. selected (ring), dim for non-current-month.
- `MonthGrid.tsx` — flex-based 7-col grid (immune to mobile grid-collapse), DOW header, 6 week rows.
- `DayAgendaSheet.tsx` — bottom sheet on mobile / inline panel on desktop.
- `CalendarSkeleton.tsx` — `CalendarGridSkeleton` + `CalendarAgendaSkeleton`.
- `CalendarEmptyState.tsx` — descriptive zero-state.
- `BookingLinkCard.tsx` — Copy primary CTA + inline active toggle + ⋯ overflow.
- `MonthNavigator.tsx` — ‹ Today › + month label.
- `index.ts` — barrel export.

BDRCalendar now consumes: `MonthGrid`, `DayAgendaSheet`, `CalendarGridSkeleton`, `CalendarAgendaSkeleton`, `CalendarEmptyState`, and shared `resolveEventKind` / `eventColor` / `EVENT_LABEL` for its per-event chips.

## Rollout order (front-end only — no data / query changes)

**Phase 1 — Finish primary parity**
1. **`src/pages/CalendarPage.tsx`** — replace the inline month grid + DOW header block with `<MonthGrid>`, map its event objects to `CalendarEventLike`, swap the spinner for `CalendarGridSkeleton`, use `CalendarEmptyState` for no-events days, and wire `DayAgendaSheet` for mobile day taps. Keep its week view for now (Phase 3).
2. **`src/pages/employee/BDRCalendar.tsx`** — ShareDialog reconciliation. The dialog currently renders **two** links per calendar (Discovery + Closing) inside a `CalendarBlock`. Refactor each URL row (`Row`) to reuse `BookingLinkCard`'s visual language: prominent Copy CTA, ⋯ overflow (Open / Rename-parent / Delete-parent), preserving the existing rename/delete/active-toggle logic that lives on the parent calendar (not the URL).

**Phase 2 — Skeletons + empty states everywhere**
3. `CalendarManagement.tsx` availability preview → shared skeleton on load.
4. Any calendar page still showing a bare `Loader2` on initial load → skeleton.

**Phase 3 — Week view + gestures (TIER 2)**
5. Extract `WeekGrid.tsx` (columnar 7-day view with hour rail) from BDRCalendar's `WeekView` and reuse in `CalendarPage.tsx`.
6. Add `useSwipeMonth` hook + `prefers-reduced-motion` guard on framer-motion transitions in `MonthGrid` / `DayAgendaSheet`.

**Phase 4 — Slot pickers (TIER 3 consistency)**
7. Align `CalendarSlotPicker.tsx` and `BookingSlotPicker.tsx` on a shared `<DateStrip>` + `<SlotButton>` from the calendar package. Same tokens, same ≥44px hit targets, same focus rings. Data-fetching untouched.

**Phase 5 — Accessibility + contrast sweep**
8. Verify aria-labels on every icon-only calendar button.
9. Verify dark-theme contrast on `--cal-dim`, dot colors, and agenda chips against `bg-card` (target 4.5:1 for text, 3:1 for non-text).
10. Add `@media (prefers-reduced-motion: reduce)` overrides in `src/index.css` for calendar transitions.

## Scope guardrails

- No changes to Supabase queries, `bdrCalendar.ts`, `provision-from-booking`, `bdr-book`, availability/blackout logic, or any RPC.
- Event → `CalendarEventLike` mapping stays at each consumer site (page-owned); the shared components never talk to the DB.
- ui/calendar (shadcn day-picker) untouched — different use case (single date input).

## Deliverable per phase

TypeScript passes; each page swap is a same-turn diff you can review; no visual regression on desktop (existing Flexbox month grid is preserved semantics-wise).

Ready to proceed with **Phase 1 → CalendarPage.tsx migration + ShareDialog card refactor** on approval.
