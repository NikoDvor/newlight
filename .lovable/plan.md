# Calendar UI Unification Plan

Goal: one shared calendar component system, adopted everywhere, matching the Tier 1/2/3 spec. Backend, queries, and booking-link generation stay untouched.

## 1. Calendar surfaces found

**Full month/week grids (primary targets)**
- `src/pages/employee/BDRCalendar.tsx` — MonthView (flexbox), WeekView, DayAgenda, ShareDialog with per-calendar cards
- `src/pages/CalendarPage.tsx` — client-facing month/week/day + agenda (uses `grid-cols-7 grid-preserve`)
- `src/pages/CalendarManagement.tsx` — per-calendar management view (event list; verify if a grid exists)

**Mini date-pickers / slot pickers (secondary targets — same visual language)**
- `src/components/BookingSlotPicker.tsx` — public booking slot grid
- `src/components/CalendarSlotPicker.tsx` — internal booking slot picker
- `src/components/ui/calendar.tsx` — shadcn/react-day-picker wrapper (used in date filters)
- `src/pages/BookingPage.tsx`, `src/pages/BDRBookingPublic.tsx` — consume the pickers

**Grid-lookalikes (NOT true calendars — leave alone)**
- `AdminTrainingHealth`, `AdminImplementationRequests/Queue/Detail`, `AdminClientLifecycle` — use `grid-cols-7` for layout, not date grids. Exclude from refactor.

**Related management/list views (not grids, but share tokens)**
- `AdminStaffCalendars`, `AdminBDRCalendars` — calendar list tables; will adopt shared BookingLinkCard where booking-link cards exist.

## 2. Proposed shared module: `src/components/calendar/`

```text
src/components/calendar/
├── types.ts              # CalendarEvent, EventKind, EventSource, dot color map
├── tokens.ts             # semantic dot colors (discovery, closing, dialer, manual, booking_form, sdr_mirror, generic)
├── MonthGrid.tsx         # 7-col flex grid, header row, 6 week rows, day cells with dots + "+N"
├── WeekGrid.tsx          # 7-col week strip w/ hour rail
├── DayCell.tsx           # today ring/fill, selected outline, dim other-month, ≥44px, aria-label
├── EventDots.tsx         # up to 3 dots + "+N" overflow chip
├── DayAgendaSheet.tsx    # bottom-sheet on mobile (shadcn Sheet, side="bottom"), inline panel ≥md
├── CalendarSkeleton.tsx  # grid + list skeleton
├── CalendarEmptyState.tsx
├── BookingLinkCard.tsx   # Copy-link primary CTA, active/paused toggle, ⋯ menu (Open/Edit/Duplicate/Delete)
├── MonthNavigator.tsx    # ‹ Month YYYY › + Today, swipe handlers
└── useCalendarSwipe.ts   # touch swipe + prefers-reduced-motion aware
```

Design tokens live in `src/index.css` as CSS vars — no hardcoded colors:
- `--cal-today`, `--cal-selected`, `--cal-dim`, `--cal-grid-line`
- `--cal-dot-discovery`, `--cal-dot-closing`, `--cal-dot-dialer`, `--cal-dot-manual`, `--cal-dot-booking-form`, `--cal-dot-sdr-mirror`, `--cal-dot-default`

## 3. Spec mapping

**Tier 1**
- Dots: `EventDots` maps `event.kind`/`event.source` → token color; renders up to 3, then `+N` chip. Legend rendered by `MonthGrid` prop.
- Day tap: `MonthGrid` calls `onDaySelect`; parent renders `DayAgendaSheet` (Sheet side="bottom" on mobile via `useIsMobile`, inline panel on desktop).
- Today vs selected: today = filled accent circle on date number; selected = ring-2 outline (never simultaneously identical — today+selected gets ring on filled circle).
- Other-month dimming: `text-muted-foreground/40` + `bg-transparent`, verified against WCAG.
- Booking-link cards: `BookingLinkCard` replaces bespoke rows in `BDRCalendar` `ShareDialog` and in `AdminBDRCalendars` / `AdminStaffCalendars` link columns. Reconciles the current split-button in `BDRCalendar` header by keeping the header's primary "Open" split-button (rep's own quick action) AND using `BookingLinkCard` inside the ShareDialog list.

**Tier 2**
- `MonthNavigator` + `useCalendarSwipe` for month↔week and swipe.
- `CalendarSkeleton` replaces spinners in BDRCalendar, CalendarPage.
- `CalendarEmptyState` for zero-events days + empty booking-link lists.

**Tier 3**
- `DayCell` and action buttons min-h-11 min-w-11, `aria-label` on all icon-only buttons, `focus-visible:ring-2 ring-ring`.
- All motion wrapped in `motion-safe:` / respects `prefers-reduced-motion`.
- Contrast pass on dark theme tokens against `--background` (target 4.5:1 for text, 3:1 for large/UI).

## 4. Rollout order

1. **Foundation (no visual change yet):** add `src/components/calendar/*` with types, tokens, MonthGrid, DayCell, EventDots, CalendarSkeleton, CalendarEmptyState, DayAgendaSheet, MonthNavigator, BookingLinkCard. Add CSS vars to `index.css`. Typecheck.
2. **Migrate `BDRCalendar.tsx`:** swap MonthView/WeekView/DayAgenda/ShareDialog rows to shared components. Keep all Supabase calls, event fetching, slug logic, and existing split-button header intact.
3. **Migrate `CalendarPage.tsx`:** same swap; keep data hooks.
4. **Migrate `CalendarManagement.tsx`** if it renders a grid (verify during build); otherwise only adopt `BookingLinkCard`.
5. **Adopt `BookingLinkCard` in `AdminBDRCalendars` and `AdminStaffCalendars`** link columns.
6. **Mini pickers:** align `BookingSlotPicker`, `CalendarSlotPicker`, and shadcn `ui/calendar.tsx` styles to the same tokens (dot color, today/selected treatment). No API changes.
7. **A11y + reduced-motion + contrast audit pass** with Playwright screenshots at mobile + desktop; typecheck.

## Assumptions / open items
- Assuming `DayAgenda` becomes a shadcn Sheet on mobile and stays inline ≥md — confirms your "bottom-feeling panel" instruction.
- Assuming `AdminTrainingHealth`, `AdminImplementation*`, `AdminClientLifecycle` `grid-cols-7` usages are non-calendar layouts and stay out of scope. Will double-check during step 1.
- No backend/data/query changes anywhere. No booking-link generation logic changes.
