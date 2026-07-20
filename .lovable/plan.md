## 1. Calendar surfaces found

**Full month/week/day calendars**
- `src/pages/employee/BDRCalendar.tsx` — inline `MonthView` (already migrated to `MonthGrid`), inline `WeekView` (still local), Share dialog with booking-link rows.
- `src/pages/CalendarPage.tsx` — workspace calendar, month view migrated to shared `MonthGrid`; week/day still local.
- `src/pages/CalendarManagement.tsx` — admin calendar list/management (booking-link cards).
- `src/pages/CalendarDetail.tsx` — individual calendar detail.
- `src/pages/admin/AdminStaffCalendars.tsx`, `src/pages/admin/AdminBDRCalendars.tsx` — admin oversight of rep calendars + booking links.
- `src/pages/BookingPage.tsx`, `src/pages/BDRBookingPublic.tsx` — public booking; use `BookingSlotPicker`.
- `src/pages/MeetingCancel.tsx`, `src/pages/AppointmentDetail.tsx`, `src/pages/Meetings.tsx`, `src/pages/MeetingIntelligence.tsx` — meeting surfaces referencing calendars but no grid.
- `src/pages/CalendarIntegrations.tsx` — integration config, no grid.

**Slot / date pickers**
- `src/components/BookingSlotPicker.tsx` (used by `BDRBookingPublic.tsx`).
- `src/components/ui/calendar.tsx` (shadcn wrapper) — not currently imported anywhere; safe to leave as-is.
- `src/components/activation/StepCalendar.tsx`, `StepQualification.tsx`, `StepProposalClosePrep.tsx` — reference booking links, no grid rendering.

**Existing shared calendar system** (`src/components/calendar/`)
`MonthGrid`, `DayCell`, `EventDots`, `DayAgendaSheet`, `CalendarSkeleton`, `CalendarEmptyState`, `BookingLinkCard`, `MonthNavigator`, `tokens.ts`, `types.ts`, `index.ts`. Phase 1 already wired into `BDRCalendar` (month) and `CalendarPage` (month) + `BDRCalendar` ShareDialog.

## 2. Proposed shared component structure

Extend `src/components/calendar/` with:

```text
src/components/calendar/
  MonthGrid.tsx          (exists)  — TIER 1 dots + "+N", today filled circle, selected ring, dimmed OOM
  WeekGrid.tsx           (new)     — 7-col time-axis week view; same DayCell header
  DayView.tsx            (new)     — single-day time-axis agenda
  DayCell.tsx            (exists)  — 44x44 hit target, aria-label, today/selected states
  EventDots.tsx          (exists)  — up to 3 colored dots + "+N"
  DayAgendaSheet.tsx     (exists)  — bottom-sheet on mobile, inline panel ≥md
  MonthNavigator.tsx     (exists)  — ‹ Month YYYY › + Today, view-switcher slot
  ViewSwitcher.tsx       (new)     — Month / Week / Day segmented control
  CalendarSkeleton.tsx   (exists)  — grid + agenda skeletons
  CalendarEmptyState.tsx (exists)  — illustration + CTA
  BookingLinkCard.tsx    (exists)  — reconciled version below
  useCalendarA11y.ts     (new)     — keyboard nav + reduced-motion hook
  tokens.ts / types.ts / index.ts
```

**`BookingLinkCard` reconciliation** — replaces both the split "Open Booking Link + dropdown" and ShareDialog's `CalendarBlock`/`Row`:
- Header: label + kind pill (Discovery / Closing / Custom).
- Primary CTA: **Copy link** (full-width on mobile).
- Inline **Active / Paused** switch (no backend change — reuses existing `is_active`).
- Overflow `⋯` menu: Open, Edit, Duplicate, Delete.
- Secondary row: truncated URL + "Open ↗".

**Token additions** (in `tokens.ts` / `index.css`):
- `--cal-today` (filled accent bg), `--cal-selected-ring`, `--cal-oom-fg` (dimmed), `--cal-grid-line`.
- Event-kind dots already tokenized; verify AA contrast on `--background`.

## 3. TIER coverage

- **T1** — MonthGrid (dots+N, today filled vs selected ring, dimmed OOM, day-agenda sheet), reconciled BookingLinkCard.
- **T2** — Keep existing month/week transition; swap remaining spinners for `CalendarSkeleton`; wire `CalendarEmptyState` everywhere.
- **T3** — 44×44 min hit targets in `DayCell` + `BookingLinkCard` menu items; `aria-label` on day cells ("Tuesday July 21, 3 events"); `prefers-reduced-motion` → disable transitions in `useCalendarA11y`; audit dark-theme contrast for dot colors + OOM text.

## 4. Implementation order (front-end only, no backend/query changes)

1. **Foundation polish** — audit `tokens.ts` for T3 contrast; add `useCalendarA11y` + reduced-motion; ensure DayCell has full a11y + 44px.
2. **BookingLinkCard reconciliation** — one canonical card; update `BDRCalendar` ShareDialog + split-button call sites to consume it.
3. **WeekGrid + DayView** — extract from `BDRCalendar`'s local `WeekView`; migrate `BDRCalendar` and `CalendarPage` week/day views to shared.
4. **ViewSwitcher + MonthNavigator** integration across `BDRCalendar`, `CalendarPage`, `CalendarDetail`.
5. **Admin surfaces** — migrate `CalendarManagement`, `AdminStaffCalendars`, `AdminBDRCalendars` booking-link lists to `BookingLinkCard`; any embedded month previews to `MonthGrid`.
6. **Skeletons + empty states** — replace remaining spinners across all migrated files.
7. **Slot picker alignment** — restyle `BookingSlotPicker` to share tokens/typography (no logic change).
8. **QA pass** — typecheck, dark-mode visual check, keyboard nav, reduced-motion, mobile hit targets.

No Supabase queries, RPCs, edge functions, or booking-link generation logic will be modified.