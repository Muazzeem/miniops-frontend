# MiniOps workspace, leads, and subscriptions refinement

## Goal
Evolve the existing Employer View into a focused multi-workspace agency operations product. Preserve the current project, client, team, task, time, expense, reporting, settings, and billing flows while adding only lightweight workspace switching, lead response tracking, and subscription monitoring. Everything remains frontend-only with realistic in-memory mock state.

## What will change

### 1. Workspace-aware application state
- Expand the existing MiniOps store into an account with three mock workspaces: Northstar Digital, Crevion Studio, and BrightLabs.
- Keep each workspace’s projects, clients, leads, team, tasks, time, expenses, subscriptions, reports, settings, and financial totals separate.
- Make switching workspaces immediately refresh visible values and lists without combining financial data.
- Add a compact workspace menu beneath the MiniOps identity with the active workspace, checkmark, workspace list, and Create Workspace action.
- Add a simple create-workspace dialog with name, industry, currency, timezone, and optional logo input. Newly created workspaces open immediately with useful empty states.

### 2. Focused Leads module
- Add Leads to the primary navigation and global search; remove Activity and Admin from the visible navigation so it matches the requested final structure while preserving their files unless removal is necessary.
- Add a Leads page with search and simple Status, Assigned To, and Source filters; a compact table/card layout; and one Add Lead action.
- Add a lead detail drawer with contact information, message, assignment, response state, and Mark as Responded / Assign / Close Lead actions.
- Use only New, Waiting, Responded, and Closed states. Waiting leads show elapsed response time and a clear overdue state after the mock threshold.
- Add a compact “Leads need attention” dashboard block and overdue-lead notification entries, without pipeline, scoring, automation, or forecasting features.

### 3. Subscription tracking inside Expenses
- Keep the existing expense tracker and add All Expenses / Subscriptions tabs.
- Add subscription summary metrics for monthly cost, annualized cost, renewals this month, and next renewal.
- Add a compact subscription list, Add Subscription dialog, and detail drawer with renewal reminder.
- Link the dashboard’s recurring-subscriptions profit leakage item to the Expenses page with the Subscriptions tab selected.
- Keep this strictly to recurring cost visibility—no procurement, license, contract, vendor, cancellation, or bank workflows.

### 4. Visual and responsive refinement
- Update the landing message and product preview to include subscriptions and leads needing attention while preserving the current two-column composition.
- Reuse the existing Ink + Cobalt design tokens and shared buttons, tables, tabs, dialogs, drawers, statuses, and typography.
- Correct scoped style conflicts and layout issues rather than adding global overrides or `!important`.
- Ensure dense tables become usable compact mobile views or contained horizontal regions, with no page-level overflow.
- Keep one primary action per page and make empty, loading, error, and success states concise and consistent for major modules.

## Technical approach
- Extend `MiniOpsProvider` with normalized workspace records and active workspace actions; keep state in memory only.
- Move workspace-dependent mock collections behind the store so pages no longer read shared global rows directly.
- Add focused lead and subscription components and route files using existing TanStack Router conventions and route-specific metadata.
- Use existing dialog/sheet/select/table primitives and semantic design tokens; no backend libraries or persistence.
- Preserve existing profitability calculations and all established Employer routes.

## Verification
- Verify switching among all three workspaces changes revenue and workspace data independently.
- Verify workspace creation, lead creation/actions, lead response timing, subscription creation/detail, and subscription-tab deep linking.
- Check landing, dashboard, Leads, Expenses, Projects, Clients, Team, and mobile navigation at 1440, 1280, 1024, 768, and 390 widths.
- Confirm no page-level overflow, overlap, chart clipping, console errors, type errors, or build errors.
