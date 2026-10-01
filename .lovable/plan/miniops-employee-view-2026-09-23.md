# MiniOps Employee View

## Goal
Build a polished, frontend-only employee workspace at `/employee`, backed by one coherent in-memory mock dataset. The interface will expose only operational employee data and will contain no financial, employer, workspace-management, authentication, database, or persistence features.

## Product structure
- Create a responsive employee shell with desktop sidebar, tablet collapse, mobile drawer, workspace header, global search, notifications, and profile menu.
- Make `/` redirect to `/employee` and add dedicated routes for Home, My Projects, Project Detail, My Tasks, My Time, Activity, Notifications, Profile, and `/invite/$token`.
- Give every content route unique MiniOps metadata.

## Shared frontend architecture
- Define typed employee-safe models and coherent mock records for Jordan Lee, three projects, tasks, time entries, activity, notifications, invitation states, and mock permissions.
- Add a shared React state provider so task status changes, time logging, notifications, profile edits, filters, and invitation actions update consistently for the current session only.
- Keep permission checks centralized and omit restricted actions entirely when disabled; no financial fields will exist in the employee data model.
- Build reusable shell, badge, task, project, time, activity, empty/loading/error, dialog, drawer, search, notification, and toast patterns from the existing UI primitives.

## Core screens and interactions
- **Home:** date-aware greeting, today’s focus, task counts, assigned projects, weekly time, upcoming work, and personal activity.
- **Projects:** search/filter/sort and grid/list modes; project details with Overview, My Tasks, Team, and Activity tabs only.
- **Tasks:** list, draggable board, and calendar modes; date/project/status/priority filters; task create/edit/detail/delete flows governed by mock permissions.
- **Time:** weekly summaries and a lightweight billable/non-billable chart; add, edit, and delete own entries with validation and success feedback.
- **Activity and notifications:** chronological personal activity and a read/unread notification center with related-item navigation.
- **Profile:** employee-safe account details and editable name/display name/photo presentation.
- **Invitation:** pending, accepted, declined, expired, and cancelled mock states with simulated new-user and existing-user acceptance paths; never offer workspace creation.
- **Global search:** keyboard-accessible Cmd/Ctrl+K search across employee-safe projects, tasks, and time entries.

## Visual and interaction system
- Establish a compact, original MiniOps design using light neutrals, charcoal text, sophisticated blue actions, restrained green/amber/red statuses, subtle borders, moderate radii, and minimal shadows.
- Use a Geist-like font stack, strong spacing hierarchy, dense readable tables, visible focus states, accessible labels, keyboard behavior, and restrained motion.
- Adapt dense tables into mobile lists/cards and verify drawer, navigation, forms, board, calendar, and dialogs across desktop and mobile.

## State coverage and verification
- Include reusable skeleton, empty, and friendly error presentations for every major area, with demo-state controls kept unobtrusive.
- Validate navigation, task completion/status updates, board drag-and-drop, task and time forms, notification reads, search, profile editing, and all invitation outcomes.
- Check the running preview at desktop and mobile widths, inspect console/runtime diagnostics, and confirm no sensitive financial or employer-only terminology is rendered.
