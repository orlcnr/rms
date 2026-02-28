# Timezone Synchronization Implementation Plan

Fix the timezone mismatch issue (Client-Server offset) where reservations made after midnight local time are incorrectly recorded or displayed.

## Proposed Changes

### [Backend] Reservations Module

#### [MODIFY] [reservations.service.ts](file:///home/cinar/projects/restaruant-management-system/backend/src/modules/reservations/reservations.service.ts)
- Update `findAll` query to use `AT TIME ZONE` for accurate date filtering on `reservation_time` while preserving UTC for `created_at`:
  ```sql
  WHERE (reservation.reservation_time AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::date = :date
  ```
- Use `DATE()` on the result of the conversion to match strictly the localized day.
- Ensure all incoming date strings for `reservation_time` are treated as UTC ISO strings.

#### [MODIFY] [app.controller.ts](file:///home/cinar/projects/restaruant-management-system/backend/src/app.controller.ts)
- Add a `@Get('system/status')` or similar endpoint to return the current server time: `{ serverTime: new Date().toISOString() }`.

---

### [Frontend] Shared Utilities

#### [MODIFY] [date.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/shared/utils/date.ts)
- Add `getNow()` helper that accounts for `serverOffset`.
- Add global `serverOffset` state (e.g., in a Context or Zustand store) initialized at app start.
- Ensure `formatDate` and related functions correctly handle ISO UTC strings.

#### [NEW] [useServerTime.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/shared/hooks/useServerTime.ts)
- Create a hook to fetch `/api/status` or similar to get `serverTime` and calculate `$Offset = ServerTime - LocalTime$`.

---

### [Frontend] Reservations Module

#### [MODIFY] [ReservationModal.tsx](file:///home/cinar/projects/restaruant-management-system/web/modules/reservations/components/ReservationModal.tsx)
- Ensure the `reservation_time` sent via the form is an ISO UTC string (`new Date(value).toISOString()`).

#### [MODIFY] [reservation.schema.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/reservations/validations/reservation.schema.ts)
- Update past-date validation to use `getNow()` instead of `new Date()`.

#### [MODIFY] [ReservationCard.tsx](file:///home/cinar/projects/restaruant-management-system/web/modules/reservations/components/ReservationCard.tsx)
- Pass all `reservation_time` values through the centralized formatting utility to ensure local display.

#### [MODIFY] [useReservations.ts](file:///home/cinar/projects/restaruant-management-system/web/modules/reservations/hooks/useReservations.ts)
- Update date range calculation logic to be consistent with the new UTC-centric strategy.

---

### [Documentation] Rules

#### [MODIFY] [page-modul-design-rules.md](file:///home/cinar/projects/restaruant-management-system/.agent/rules/page-modul-design-rules.md)
- Add "Time Consistency" requirements to the "Teknik Gereksinimler" section.

## Verification Plan

### Automated Tests
- Run backend tests to ensure `findAll` filtering still works for basic scenarios:
  ```bash
  cd backend && npm run test
  ```

### Manual Verification
1. **Midnight Rollover Test**:
   - Change system time to 00:30 Istanbul time.
   - Create a reservation for "Today" (00:00).
   - Verify DB record has `21:00:00.000Z` for the previous day.
   - Verify UI displays `00:00` for the current day.
2. **Date Range Test**:
   - Switch between Weekly and Monthly views.
   - Verify all reservations appear in their respective local date slots.
