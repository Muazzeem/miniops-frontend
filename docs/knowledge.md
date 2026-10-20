# MiniOps — Frontend Knowledge

MiniOps is an operations workspace for small agencies (3–15 people): projects, tasks, clients, team, chat, time and expenses, with a light profitability layer. **This build is frontend-only.** There is no backend, database, auth or persistence, and all state is mock data in React context that resets on reload. Keep shapes backend-ready so an API can replace the seeds later.

## Stack

- **TanStack Start** (SSR, file-based routing), **React 19**, **Vite 8**, TypeScript (very strict: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`)
- **Tailwind v4**, CSS-first. Tokens live in `src/styles.css` (`@theme inline` + `:root`). There is no `tailwind.config`. Light theme only.
- **shadcn/Radix** primitives in `src/components/ui`, `lucide-react` icons, `recharts`, `sonner` toasts, `zod`, `react-hook-form`, `date-fns`
- **Bun** package manager (`bun.lock`). `bunfig.toml` blocks package versions younger than 24h; don't add exclusions without asking.
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, which already bundles TanStack Start, React, Tailwind, tsconfig paths and Nitro. **Never add those plugins manually.**
- Deploy: Nitro defaults to Cloudflare and auto-detects Vercel. Live at https://miniops-seven.vercel.app (Vercel project `muazzeems-projects/miniops`).
- The repo is synced with **Lovable**. Never force-push or rewrite pushed history, and keep `main` buildable.

## Two apps in one

| | Employer (agency owner) | Employee |
|---|---|---|
| URLs | `/app` + `_workspace.*` routes | `/employee/*`, `/invite/$token` |
| Code | `src/features/*.tsx`, `src/components/miniops/*` | `src/features/employee/*` only |
| State | `MiniOpsProvider` / `useMiniOps()` (`src/features/store.tsx`) | `EmployeeProvider` / `useEmployee()` (`src/features/employee/store.tsx`) |
| Data | `src/data/mock.ts` + `src/data/ops.ts` | `src/data/employee.ts` |
| Shell | `AppShell` in `components/miniops/core.tsx` | `EmployeeShell` in `features/employee/ui.tsx` |

Both providers wrap the whole app in `src/routes/__root.tsx`. **Employee code must never import employer data/stores or show financials** (revenue, cost, margin, profit, hourly cost). The two parts share only `src/components/ui`, `src/lib/utils.ts` (`cn`) and the design tokens. Profile menus cross-link with "Switch to Employee/Employer View".

## Routes

`src/routes/` uses flat file routing (`routeTree.gen.ts` is generated, so don't edit it). Route files are thin: `head()` meta plus a component imported from `src/features`. Search params are validated with `zod`.

**Public:** `/` → `Landing` (`features/landing.tsx`), with a header Login button → `LoginDialog` (`features/login-dialog.tsx`, Google Identity Services, reads `VITE_GOOGLE_CLIENT_ID` from `.env`, client-only, redirects to `/app`).

**Employer** (`_workspace.tsx` is a pathless layout that wraps children in `AppShell`):

| URL | Component (file) |
|---|---|
| `/app` | `Dashboard` (dashboard.tsx) |
| `/projects`, `/projects/$projectId` | `Projects`, `ProjectDetail` (pages.tsx) |
| `/tasks` | `Tasks` (pages.tsx) |
| `/clients`, `/clients/$clientId` | `Clients`, `ClientDetail` (pages.tsx) |
| `/team`, `/team/$memberId` | `Team`, `MemberDetail` (pages.tsx) |
| `/chat?c=<conversationId>` | `ChatPage` (chat.tsx) |
| `/time` | `TimePage` (pages.tsx) |
| `/expenses` | `Expenses` → `ExpensesPage` (expenses.tsx; includes subscriptions) |
| `/settings?section=<name>` | `SettingsPage` (account.tsx; sections include Billing and Security) |
| `/profile` | `Profile` (account.tsx) |
| `/activity`, `/admin` | `ActivityPage`, `AdminPage` (admin-activity.tsx; not in the sidebar) |
| `/billing` | redirects to `/settings?section=Billing` |
| `/notifications`, `/reports`, `/reports/*` | redirect to `/app` |

The sidebar (`primaryNav`/`adminNav` in `core.tsx`) has Overview, Projects, Tasks, Clients, Team, Chat, Time, Expenses, then Settings. Notifications and profile live in the header (`NotificationCenter`, `ProfileMenu` in `components/miniops/header.tsx`), not the sidebar. ⌘K opens a workspace-scoped search.

**Employee** (`employee.tsx` layout → `EmployeeShell`): `/employee` (HomePage), `/employee/projects` and `/employee/projects/$id`, `/employee/tasks`, `/employee/team`, `/employee/chat`, `/employee/time`, `/employee/activity`, `/employee/settings`, `/employee/profile`. Pages are in `features/employee/{pages,collab-pages,secondary-pages}.tsx`. `/invite/$token` → `InvitePage` (mock invitation states).

## Employer state & data model

`useMiniOps()` returns the **active workspace's** `WorkspaceData` spread at the top level, plus actions:

- Workspaces: `workspaces`, `activeWorkspace`, `switchWorkspace(id)`, `createWorkspace(input)`. Three seeds: Northstar Digital, Crevion Studio and BrightLabs. Each has its own data, scaled from the Northstar base by `workspaceData(factor, prefix)`.
- Data mutations: `addProject`, `addSubscription`. Most other "Create" dialogs are visual only.
- Chat (`conversations`, `sendMessage`, `deleteMessage`, `readConversation`, `createGroup`) and notifications (`notificationList`, `notifications` unread count, `markRead`, `readNotification`) are **keyed per workspace id**.
- `profile` / `updateProfile` is global (the current user is `ME = 'alex'`).

**Rule:** every record and every financial total must come from the active workspace, so switching agencies never mixes data. New mock data goes inside the provider's workspace-scoped state, not module-level globals read directly by pages.

Types (`src/data/mock.ts`). `Project`, `Subscription` and `ChartPoint` are objects. **The others are positional tuples:**

- `Client` = `[id, name, industry, revenue, marginPct]`
- `TeamMember` = `[id, name, role, hoursWorked, billableHours, utilizationPct, hourlyCost]`
- `Task` = `[title, projectName, assignee, priority, due, status]`
- `Expense` = `[name, category, projectOrOverhead, amount, date, recurrence, status]`
- `TimeEntry` = `[date, member, project, description, hours, billable 'Yes'|'No', cost]`

Access these by index with `String(x[i])` / `Number(x[i])` (strict index typing). Format money with `money()` from `mock.ts`.

`src/data/ops.ts` holds the chat/notification/profile types and seed functions (`seedConversations`, `seedNotifications`), plus image helpers `validateImage` (JPG/PNG/WEBP, ≤5MB) and `readImage` (→ data URL).

## Employee state

`useEmployee()` holds the signed-in employee (Jordan Lee), `projects`, `tasks`, `timeEntries`, `notifications`, `people`, `conversations`/`messages`, `activities` and a `permissions` object (all true today). It also owns UI state such as `selectedTask`, `taskFormOpen`, `timeFormOpen` and `editingTime`, with actions like `saveTask`, `updateTaskStatus`, `deleteTask`, `saveTime`, `deleteTime`, `sendMessage`, `startDirect`, `markNotification` and `updateProfile`. Employee data types are separate from employer ones, even where the names match.

## Shared building blocks

- **Employer UI** (`components/miniops`): `PageHeader`, `Metric`, `SummaryCard`, `Status` (core.tsx); `CreateDialog`, `Section` (forms.tsx); `FinanceChart`, `ExpenseChart`, `UtilizationChart` (charts.tsx); `SearchableSelect`.
- **Employee UI** (`features/employee/ui.tsx`): its own `PageHeader`, `Section`, `SummaryCard`, `StatusBadge`, `PriorityBadge`, `EmptyState`, `ErrorState`, `LoadingRows`, `ConfirmDialog`, `Avatar`, `Field`.
- **Dates/times:** employer forms must use `DateInput` / `TimeInput` / `DateRangePicker` from `components/miniops/date-time.tsx` (ISO values, displayed as `Sep 29, 2026`). The employee app has a parallel `features/employee/date-time.tsx` to stay self-contained.
- **Styling:** use semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-primary-soft`, `text-success`, `text-danger`, `shadow-card`…) instead of raw colors. Custom utilities in `styles.css` include `num` (right-aligned tabular mono numbers), `toolbar`, `metric-grid`, `eyebrow`, `marketing-section` and `avatar`. The font is Geist / Geist Mono and the primary color is violet (`oklch(.56 .20 281)`).
- **Feedback:** use `toast` from `sonner` (the `<Toaster>` is mounted in the root).

## Conventions

- Pages live in `src/features`, and routes only wire them up. Add a route as a new file in `src/routes` with `head()` meta (title `X — MiniOps`, description, og/twitter tags), matching the existing files.
- Older employer/employee files are written in a dense one-line style. Match the file you're editing. New standalone files may be Prettier-formatted (`.prettierrc`).
- Server code (`src/server.ts`, `src/start.ts`, `src/lib/error-*`) only renders a friendly SSR error page and adds CSRF protection for server functions. Leave it alone unless you're working on SSR errors.
- Env vars exposed to the client must be prefixed with `VITE_`. `.env*` files are git-ignored, so set the same variables in Vercel/Lovable separately.
- Checks: `bunx tsc --noEmit`, `bun run lint`, `bun run build`, `bun test tests` (verifies a single React copy, which guards against Radix "reading 'useRef'" crashes).

## Known gaps / cleanup candidates

- `features/pages.tsx` still exports legacy `Billing`, `Reports`, `ReportPage`, `SettingsPage` and `Profile`. No route uses them; the live ones are in `account.tsx`.
- Several employer KPIs are hard-coded strings (e.g. Team "1,440h", "81.1%") rather than derived from workspace data.
- The Google login is client-side only: the ID token is decoded but not verified, and the session isn't stored.
- The specs in `docs/employee-view-spec.md`, `README.md` and `.lovable/plan/*` describe the original intent. `roadmap.md` tracks what's done.
