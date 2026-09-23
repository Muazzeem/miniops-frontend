# MiniOps Employer Frontend

## Goal
Build a complete, frontend-only MiniOps experience for Northstar Digital: a polished public website plus a navigable employer application focused on agency profitability, project health, client value, utilization, expenses, and lightweight task coordination.

## Product boundaries
- Use realistic, internally consistent mock data and in-memory React state only.
- Do not add authentication, database, APIs, payments, email delivery, persistence, or employee-facing screens.
- Simulate create/edit/invite/save/read interactions with immediate UI updates and polished feedback.
- Preserve the supplied positioning, pricing, financial example, health thresholds, and no-fake-social-proof rule.

## Information architecture

### Public site
- `/` — Marketing page with hero, problem, solution, real product preview, profitability, utilization, leakage, client insight, three-step workflow, audiences, pricing, FAQ, final CTA, and footer.
- “Start Free” and product-preview actions lead into the employer demo at `/app`.

### Employer application
- `/app` — Executive dashboard.
- `/projects`, `/projects/$projectId` — Project list, creation, and tabbed project detail.
- `/tasks` — List, draggable board, and lightweight calendar.
- `/clients`, `/clients/$clientId` — Client list, creation, and profitability detail.
- `/team`, `/team/$memberId` — Team operations, invitations, member detail, and grouped permissions.
- `/time` — Time summaries, filters, and log-time flow.
- `/expenses` — Expense summaries, recurring costs, filters, and creation flow.
- `/reports` plus dedicated profitability, utilization, revenue/cost, and expense report routes.
- `/settings` — Workspace, financial, notification, team, billing, and preference sections.
- `/billing` — Frontend-only plan comparison, current plan, usage, and payment placeholder.
- `/notifications` and `/profile` — Read-state controls and account preferences.
- Every route gets distinct page metadata and all navigation destinations are implemented.

## Visual system
- Define a complete semantic token system in the global stylesheet using restrained blue, charcoal neutrals, green, amber, and red states.
- Use Geist for a precise, compact interface with tabular financial figures, minimal shadows, fine borders, soft surfaces, and 4–8px corner radii.
- Create a dense desktop shell with a collapsible sidebar, compact top bar, keyboard-visible focus, tablet adaptation, and mobile sheet navigation.
- Avoid glass effects, decorative gradients, oversized cards, noisy charts, fake logos, and generic admin-dashboard composition.
- Use tables, dividers, inline metrics, charts, compact panels, and lists according to information importance.

## Shared frontend architecture
- Central mock-data module with typed projects, clients, team, tasks, expenses, time entries, notifications, dashboard metrics, reports, and settings.
- Context/store layer for frontend-only mutations, filters, created records, task movement, notification read state, sidebar state, and preferences.
- Shared application shell, page header, metric strip, status badge, data table, filter bar, empty state, loading skeleton, error state, modal/drawer form, command palette, tabs, and chart primitives.
- Reusable financial formatting and health calculation utilities; margin statuses use the supplied thresholds and budget-burn risk compares budget used with progress.
- Shared form fields and modal behavior support labels, Escape/close/cancel, pending feedback, success/error presentation, and toasts.

## Build sequence

### 1. Foundation and shell
- Establish tokens, typography, global responsive behavior, shared component variants, mock data types, and frontend state.
- Build public/app layout separation, responsive sidebar/top bar/mobile navigation, workspace selector, profile menu, notifications access, and global Cmd/Ctrl+K search.
- Add route-specific metadata and accessible not-found/error experiences.

### 2. Executive dashboard
- Build greeting, date-range state, four KPI metrics, interactive revenue/cost/profit chart, project-health summary/table, attention list, profit leakage, utilization table, and compact task summary.
- Date selection updates the displayed mock series and headline metrics.

### 3. Core operating modules
- Projects: searchable/filterable/sortable/paginated table, create flow, immediate insertion, and detailed tabs for overview, financials, team/time, expenses, and activity.
- Clients: list/create flow and detail views with financial trends, project performance, and insight.
- Team: operational table, invite success simulation, member detail, edit controls, and grouped access permissions.
- Tasks: list filters defaulting to This Week, overdue treatment, create flow, drag-and-drop board, and day/week/month calendar.
- Time and expenses: summary metrics, data tables, filters, create flows, and recurring expense panel.

### 4. Reports and administration
- Build the reports hub and five dedicated report pages with shared filters, minimal interactive charts, summary metrics, and aligned financial tables.
- Build settings sections with local editable state and save feedback.
- Build billing, profile, and notifications pages with realistic frontend-only controls and explicit non-payment placeholder language.

### 5. Public marketing experience
- Build the full landing page around the actual MiniOps interface, not a generic illustration.
- Reuse a polished dashboard-preview composition and preserve the profitability-first narrative.
- Include supplied pricing and FAQ content without fabricated testimonials, customer logos, or usage claims.

### 6. Quality and verification
- Add contextual empty, skeleton, and recoverable error states across major modules.
- Verify keyboard navigation, dialog semantics, labels, focus treatment, contrast, and non-color status cues.
- Exercise primary interactions: navigation, search, filters, sorting, pagination, creation flows, task movement, settings saves, notification reads, and simulated sign-out.
- Validate desktop, tablet, and mobile layouts with browser screenshots, checking table overflow, chart sizing, sidebar behavior, dialogs, and text fit.

## Acceptance criteria
- All named sidebar destinations and report cards open complete screens.
- The Northstar Digital dataset is consistent across dashboard, projects, clients, team, expenses, and reports.
- Acme Website Redesign displays $8,500 revenue, $3,200 team cost, $600 direct expenses, $700 overhead, $4,000 profit, and 47.1% margin.
- Atlas Client Portal clearly shows 92% budget use against 63% progress as a risk.
- Create and management actions update the current session immediately and trigger subtle toasts.
- No backend, auth, persistence, real invitation, payment, or employee-product logic is introduced.
