# Plan: Reservations Module Advanced UI/UX & Conflict Management Upgrade

This plan outlines the modernization of the reservation system, focusing on hourly conflict management, a split-view layout, and enhanced component integration.

## 1. Utilities & Hooks (Backend-ready hourly logic)
- **Refactor `reservation.utils.ts`**:
    - Update `checkTableConflict` to use a sliding window (default 2 hours).
    - Add helper `calculateTimeOccupancy(tableId, date, reservations)` to return 30-min slot states.
- **Refactor `useReservationConflicts.ts`**:
    - Update `checkConflict` to return detailed conflict information (start/end times of blocking reservation).
    - Ensure `busyTableIds` calculation is optimized for real-time form updates.

## 2. Shared Component Modernization
- **Refactor `DateTimePicker.tsx`**:
    - **Layout**: Switch to a wider Popover (min-w-[360px]) with a side-by-side Grid (Calendar vs Time).
    - **Quick Actions**: Add "Bugün", "Yarın", "Hafta Sonu" buttons at the top using a segmented control style.
    - **Time Selection**: Replace standard time input with a scrollable 30-min slot list.
    - **Localization**: Ensure all labels and date formats are Turkish (`tr-TR`).
- **Update `NewCustomerModal.tsx`**:
    - Change z-index to `z-[9999]` to ensure it stays above the expanded `ReservationModal`.

## 3. New Reservation Components
- **`TableTimeline.tsx`**:
    - Create a vertical/scrollable timeline for the selected table.
    - Display 09:00 - 00:00 range in 30-min intervals.
    - Visuals: Use `bg-danger-main/10` for occupied slots and `bg-bg-muted` for available ones.
- **`TableSelector.tsx` (v2)**:
    - Group tables by `Area`.
    - Add "Conflict Badge" on table cards showing if a table is free or occupied at the selected time.
    - Highlight conflicting table in Red if selected.

## 4. Main Modal Refactoring (`ReservationModal.tsx`)
- **Layout Change**:
    - Expand to `max-w-6xl` (Split-View).
    - Left Panel (8/12): Form inputs (Customer, Date/Time, Table, Guests, Notes).
    - Right Panel (4/12): `TableTimeline` component.
- **Component Integration**:
    - Integrate `CustomerSelector` from `orders` module.
    - Add "Son Rezervasyon Bilgisi" (Last Reservation Info) display below the customer selector.
- **State Management**:
    - Wrap all inputs in `react-hook-form` `Controller`.
    - Implement reactive `busyTableIds` update when `reservation_time` changes.
    - Implement "Save" button disabling logic on conflict.

## 5. Technical Requirements
- Use `date-fns` for all date/time calculations.
- Adhere to **RMS Core Rules**:
    - No gradients/neon.
    - 8px grid system.
    - Max 200 lines per component (split sub-components into separate files).
- Run `npm run lint` and `npm run test` after implementation.

## 6. Verification Steps
1. Verify overlapping reservations (e.g., 18:00-20:00 and 19:00-21:00) trigger conflict.
2. Verify `NewCustomerModal` appears correctly over `ReservationModal`.
3. Verify `TableTimeline` reflects data changes immediately.
4. Check mobile responsiveness (Stack the split-view).
