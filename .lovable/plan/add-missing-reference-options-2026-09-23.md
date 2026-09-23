# Add Missing Reference Options

## Goal
Add only the options visible in the supplied references that MiniOps does not already provide, while preserving the current Employer product and its lightweight frontend-only scope.

## Changes
- Add an **Activity** destination to the main Employer navigation with a compact workspace activity feed for project, time, expense, budget, task, and invitation events.
- Add an **Admin** destination to the lower navigation with four simple tabs: **Users**, **Organizations**, **Plans**, and **Subscriptions**.
- Keep Admin management frontend-only: invite form, role selector, compact mock tables, and immediate success feedback; no authentication, backend, payment processing, or persistence.
- Add the compact current-workspace selector shown beneath the MiniOps identity, without introducing multi-workspace logic.
- Reuse existing MiniOps buttons, tabs, tables, status labels, colors, spacing, and responsive sidebar behavior rather than copying the reference styling.
- Add route-specific metadata for both new pages and include their records in global search where useful.

## Verification
- Confirm Activity and Admin open from desktop and mobile navigation.
- Exercise the invite interaction and all four Admin tabs.
- Check desktop and 390px layouts for overflow or overlapping controls.
- Run the existing type and development build checks.
