# 💰 Plan: Cash Module Design & Layout Refactor

This plan outlines the steps to refactor the Cash (Kasa) module to align with the `.agent/rules/page-modul-design-rules.md` guidelines.

## 🎯 Objectives
- Implement `SubHeaderSection`, `FilterSection`, and `BodySection` layout layers.
- Standardize the module branding with the `bg-warning-main` color.
- Align summary stats (Net Sales, Tips, Cash) with the "Stats Summary" pattern in the `FilterSection`.
- Ensure full-width alignment of content with the header.
- Use internal scrolling for the `BodySection`.

## 🛠 Features Modified
- `web/app/(main)/cash/_components/CashClient.tsx`: Main layout refactor.
- `web/modules/cash/components/CashSummaryCard.tsx`: Standardize summary display (will be integrated into `FilterSection`).

## 📋 Implementation Checklist

### 1. Preparation [APPROVAL NEEDED]
- [ ] Review `page-modul-design-rules.md` for `Cash` module specifics (marks: `bg-warning-main`).
- [ ] Research `useSocketStore` or `useSocket` for connection indicator in `SubHeader`.

### 2. CashClient Refactor [APPROVAL NEEDED]
- [ ] Import `SubHeaderSection`, `FilterSection`, `BodySection`, `Button` from shared components.
- [ ] Replace custom header with `SubHeaderSection`.
- [ ] Wrap summary stats in `FilterSection` using the standardized "Stats Summary" layout (aligned right).
- [ ] Wrap `ActiveSessionCard` and `RegistersList` in `BodySection` with `overflow-y-auto`.
- [ ] Ensure `<main>` has `flex flex-col flex-1 pb-6 min-h-0`.

### 3. Cleanup & Verification
- [ ] Remove `p-6` from the outer container of `CashClient`.
- [ ] Verify alignment with the global header.
- [ ] Check mobile responsiveness.
- [ ] Run `npx tsc --noEmit` to verify type safety.

## 🚀 Execution
PROCEED after plan approval.
