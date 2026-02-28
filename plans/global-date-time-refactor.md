# Global Date & Time Audit and Refactor Plan

This plan outlines the systematic replacement of decentralized date/time calls (`new Date()`, `Date.now()`) with offset-aware utilities and timezone-safe filtering across the entire RMS project.

## 1. Audit Phase (Global Search)
We will target the following patterns in current implementation:
- `new Date()`
- `Date.now()`
- Any manual UTC manipulations (split, slice on ISO strings)

### Targeted Modules
- **Backend:** Analytics, Reports (Sales, Inventory, Finance), Audit, QR-Guest, Cash.
- **Frontend:** Orders (Board, Card), Inventory, Tables, Dashboard, Shared Components.

---

## 2. Rule Enforcement (Documentation Updates)

### [MODIFY] [backend-rules.md](file:///home/cinar/projects/restaruant-management-system/.agent/rules/backend-rules.md)
Add "Forbidden Pattern" section:
- **Forbidden:** Using `new Date()` within business logic (services/use-cases) without converting to local timezone for reports.
- **Mandatory:** Use shared `Intl.DateTimeFormat` with `Europe/Istanbul` for "Today" calculations.

### [MODIFY] [page-modul-design-rules.md](file:///home/cinar/projects/restaruant-management-system/.agent/rules/page-modul-design-rules.md)
Add **Section 7.1: Audit & Compliance**:
- Code using raw `new Date()` for business logic or form defaults will not pass review.
- All time-sensitive logic must pass through `getNow()` (Frontend) or explicitly handle Istanbul timezone (Backend).

---

## 3. Implementation Scenarios

### A. Backend: Reports & Analytics
- **Sales/Finance Reports:** Update SQL/QueryBuilder to use `AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul'` for all `created_at` or `transaction_date` comparisons.
- **Inventory Service:** Update count-time logic to use local day matching.
- **Audit Interceptors:** Ensure `created_at` remains UTC (system standard) but display/filtering handles timezone.

### B. Frontend: Business Logic
- **Orders Board (`BoardFilters.tsx`, `OrderCard.tsx`):**
    - Replace time-elapsed calculations with `getNow()`.
    - Fix delay alerts (e.g., "Mutfakta 15dk gecikti") to be server-time synchronized.
- **Tables Module (`TableCard.tsx`):**
    - "Stay duration" calculation (Masa ne kadar süredir dolu?) must use `getNow()`.
- **Form Defaults:**
    - Update `defaultValue` in all modals (Reservation, Order, Expense) to use `getNow()`.

---

## 4. Module Specific Critical Points

| Module | Critical Point | Change |
| :--- | :--- | :--- |
| **Orders** | Kitchen delay alerts | Use `getNow()` vs `order_time`. |
| **Inventory** | Expiry / Count time | Compare against `getNow()` normalized to day. |
| **Tables** | Occupancy time | `getNow() - opened_at`. |
| **Payments** | Z-Report / Closing | Explicit `Europe/Istanbul` lock for day closing. |

---

## 5. Execution Strategy

1. **Step-by-Step Refactor**: Do NOT use "Replace All".
2. **Layered Rollout**:
    - **Layer 1**: Shared Utilities (Already Done).
    - **Layer 2**: Backend Services & Filtering.
    - **Layer 3**: Frontend Hooks and State.
    - **Layer 4**: UI/Form defaults.
3. **Verification**: Verify midnight rollover in a staging/local environment using simulated timezone offsets.

## 6. [APPROVAL NEEDED]
Please confirm with **PLAN APPROVED** or **PROCEED** to start the refactor based on these categories.
