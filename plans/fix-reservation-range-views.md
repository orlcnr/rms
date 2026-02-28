# Plan - Fix Weekly and Monthly Reservation Views

The user reported that switching to weekly or monthly views still only displays reservations for the selected single day. This is because the `useReservations` hook always prioritizes the `date` parameter (fetching only one day) as long as `selectedDate` is defined.

## Analysis
- **`useReservations` Hook**: The `fetchReservations` logic uses a strict `if (selectedDate)` block which ignores the range logic below it.
- **`ReservationClient`**: Holds the local `view` state but doesn't share it with the hook, so the hook doesn't know it needs a wider range.
- **Backend**: The `findAll` method still uses a problematic `BETWEEN` logic for `startDate`/`endDate` ranges which might omit records at day boundaries (timezone shifts).

## Steps to Fix

1.  **Update Backend (`ReservationsService.ts`)**:
    - Update the `startDate`/`endDate` filtering to use a `DATE()` comparison in the `BETWEEN` clause to match our single-day fix.
2.  **Update Frontend Hook (`useReservations.ts`)**:
    - Add an optional `view` parameter (`'agenda' | 'weekly' | 'monthly'`) to the hook.
    - Update `fetchReservations` to calculate the range (7 days for weekly, whole month for monthly) based on the current `view` and `selectedDate`.
    - Add `view` to the `useEffect` dependencies to trigger a refetch when switching views.
3.  **Update Frontend Component (`ReservationClient.tsx`)**:
    - Pass the current `view` to the `useReservations` hook.

## [APPROVAL NEEDED]
Please confirm with PROCEED to implement these fixes across backend and frontend.
