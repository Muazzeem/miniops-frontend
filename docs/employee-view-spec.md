# My MiniOps Hub

Build the **Employee View frontend for MiniOps**, a lightweight profitability and operations SaaS for small agencies and service teams.

This is a **FRONTEND-ONLY build**.

Do NOT build or configure:

* Backend
* Database
* Supabase
* Real authentication
* Real authorization
* Server-side permissions
* RLS
* Stripe
* Real email delivery
* Real invitation processing
* Real API integrations
* Real persistence

Use realistic mock data and frontend state only.

The frontend must be structured cleanly so a real backend and authentication system can be connected later without rebuilding the UI architecture.

---

# 1. PRODUCT CONTEXT

Product name: **MiniOps**

Domain: **myminiops.com**

Core positioning:

**Know exactly where your agency makes money.**

MiniOps helps small agencies and service teams manage projects, tasks, team time, expenses and profitability without the complexity of a large project-management platform.

MiniOps has two primary experiences:

1. Employer View
2. Employee View

This prompt is ONLY for the **Employee View**.

The Employer View is a separate frontend build.

The Employee View should feel like the same product, but it must be clearly designed around an employee's day-to-day work.

---

# 2. CORE EMPLOYEE PRINCIPLE

Employees should see the information they need to do their work.

They should NOT automatically see sensitive business information.

The Employee View should prioritize:

* My work
* My projects
* My tasks
* My time
* My activity
* Relevant project information
* Relevant team information
* Personal profile
* Notifications

The Employee View should NOT expose:

* Agency revenue
* Agency profit
* Profit margin
* Client profitability
* Project profitability
* Project revenue
* Employee hourly cost
* Other employees' costs
* Company-wide financial reports
* Billing
* Workspace financial settings
* Employer-only settings
* Employer permission management
* Employee management
* Organization creation
* Workspace creation

Do not create a visible role switcher.

Do not create an "Employer Mode" button.

Do not make employees look like administrators.

---

# 3. EMPLOYEE EXPERIENCE

The experience should feel:

* Simple
* Focused
* Professional
* Calm
* Fast
* Modern
* Operational
* Minimal
* Easy to understand

The employee should immediately understand:

**What do I need to do today?**

and

**What work am I responsible for?**

Avoid turning MiniOps into a generic project-management platform.

This is a lightweight operational workspace.

---

# 4. DESIGN SYSTEM

Use the same overall visual language as the Employer View so both experiences clearly belong to the same MiniOps product.

Design references:

* Linear
* Stripe
* Notion
* Vercel
* Attio
* Ramp
* Modern B2B SaaS dashboards

Do not copy any existing product.

Create an original MiniOps interface.

Use:

* White / very light neutral background
* Dark charcoal typography
* Subtle gray borders
* Clean surfaces
* Sophisticated blue as the primary action color
* Green for positive/completed states
* Amber for warnings
* Red for overdue/critical states
* Minimal shadows
* Moderate corner radius
* High information density without clutter
* Strong spacing hierarchy

Avoid:

* Excessive gradients
* Glassmorphism
* Neon colors
* Giant illustrations
* Excessive rounded cards
* Childish UI
* Overly colorful dashboards
* Excessive animations
* Heavy decorative elements

Typography should feel similar to Inter or Geist.

Use consistent:

* Font sizes
* Line heights
* Button styles
* Input styles
* Badges
* Status indicators
* Tables
* Cards
* Modals
* Drawers
* Dropdowns
* Tooltips
* Toasts

---

# 5. EMPLOYEE APP SHELL

Create a responsive application shell.

Desktop:

Left sidebar navigation.

Top header containing:

* Workspace name
* Global search
* Notifications
* Employee profile menu

Mobile:

* Compact top navigation
* Hamburger/menu drawer
* Responsive content layout

The employee should only see employee-relevant navigation.

Primary navigation:

1. Home
2. My Projects
3. My Tasks
4. My Time
5. Activity

Secondary:

* Notifications
* Profile

Do not show:

* Reports
* Billing
* Financial Settings
* Employee Management
* Workspace Settings
* Client profitability
* Agency financial dashboard

---

# 6. MOCK EMPLOYEE ACCOUNT

Create a realistic demo employee.

Example:

Name: Jordan Lee

Role: Senior Product Designer

Workspace: Northstar Digital

Email:
[jordan@northstardigital.demo](mailto:jordan@northstardigital.demo)

Status:
Active

Use realistic data throughout the application.

Do not use random lorem ipsum.

---

# 7. EMPLOYEE HOME

The default employee landing page should be **Home**.

Header:

**Good morning, Jordan**

Supporting text:

**Here’s what you have on your plate today.**

Show a simple date-aware mock greeting.

Primary sections:

## Today's Focus

Show the most important tasks due today.

Example:

* Finalize homepage design
* Review mobile onboarding screens
* Prepare client presentation
* Update design handoff

Each task should display:

* Task name
* Project
* Priority
* Due time/date
* Status

Allow:

* Open task
* Mark complete
* Change status
* Quick edit

---

## My Tasks

Show a compact task summary:

* To Do
* In Progress
* Done
* Overdue

Example:

To Do: 5
In Progress: 3
Done: 12
Overdue: 1

Clicking a status should filter/open My Tasks.

---

## My Projects

Show projects currently assigned to the employee.

Example:

Acme Website Redesign
Bloom Brand Identity
Nova Education Platform

Display:

* Project name
* Client name
* Role
* Current status
* Task count
* Progress

IMPORTANT:

Do NOT show:

* Revenue
* Profit
* Profit margin
* Budget
* Team cost
* Financial performance

unless a future permission system explicitly allows a non-sensitive field.

For this frontend, keep employee project information operational.

---

## Time This Week

Show:

Hours Logged:
32.5h

Billable:
28h

Non-billable:
4.5h

Remaining planned hours:
7.5h

Display a simple weekly visualization.

Do not expose hourly cost or financial value.

---

## Upcoming

Show:

* Upcoming tasks
* Upcoming deadlines
* Important project dates

Example:

Today
Homepage design due

Tomorrow
Client presentation

Friday
Design handoff

---

## Recent Activity

Show the employee's recent activity:

* Logged 2.5 hours
* Completed homepage task
* Updated project task
* Added time entry
* Changed task status

Keep activity focused on the employee.

---

# 8. MY PROJECTS

Create a dedicated **My Projects** page.

This page shows only projects assigned to the employee or projects the employee is allowed to access.

Top:

**My Projects**

Supporting text:

**Projects you're currently working on.**

Controls:

* Search
* Status filter
* Sort
* Grid/List toggle

Project cards/table should show:

* Project
* Client
* Status
* My Tasks
* Progress
* Next Deadline
* Last Activity

Do NOT show:

* Revenue
* Budget
* Cost
* Profit
* Margin
* Financial health

---

# 9. PROJECT DETAIL

Create an employee-safe Project Detail page.

Header:

Project name

Example:

**Acme Website Redesign**

Show:

* Client name
* Project type
* Project status
* Start date
* End date
* Employee's role on project

Tabs:

1. Overview
2. My Tasks
3. Team
4. Activity

Do NOT include a Financials tab in Employee View.

---

## PROJECT OVERVIEW

Show:

* Project description
* Goals
* Current status
* Timeline
* Progress
* Upcoming deadlines
* Recent activity

Progress can be shown as:

63% complete

This is operational progress, not financial progress.

---

# 10. PROJECT MY TASKS

Show tasks belonging to the employee within the selected project.

Columns:

* Task
* Priority
* Due Date
* Status

Allow:

* Open task
* Change status
* Mark complete
* Edit permitted fields

Task detail can include:

* Description
* Project
* Assigned to
* Priority
* Due date
* Status
* Activity

Do not add unnecessary project-management features.

No:

* Gantt
* Sprint planning
* Dependencies
* Subtask systems
* Burndown
* Complex automation

---

# 11. PROJECT TEAM

Show the team members assigned to the project.

Example:

Jordan Lee
Senior Product Designer

Alex Morgan
Product Designer

Chris Walker
Developer

Show only operational information:

* Name
* Role
* Availability/status

Do NOT show:

* Hourly cost
* Salary
* Revenue contribution
* Individual profitability
* Internal financial information

---

# 12. MY TASKS

Create a dedicated **My Tasks** command center.

This is one of the most important employee pages.

Header:

**My Tasks**

Supporting text:

**Everything you need to get done.**

Views:

1. List
2. Board
3. Calendar

Default view:

**List**

---

## LIST VIEW

Columns:

* Task
* Project
* Priority
* Due Date
* Status

Example:

Finalize homepage design
Acme Website Redesign
High
Today
In Progress

Create mobile responsive screens
Acme Website Redesign
Medium
Tomorrow
To Do

Prepare brand presentation
Bloom Brand Identity
High
Friday
To Do

---

# 13. TASK FILTERS

Provide:

* Today
* This Week
* This Month
* All
* Overdue

Additional filters:

* Project
* Status
* Priority

Search:

**Search tasks...**

Keep filtering fast and simple.

---

# 14. TASK BOARD

Board columns:

To Do
In Progress
Done

Allow frontend drag-and-drop between columns.

Use realistic visual feedback.

Do not build complicated workflow systems.

No custom statuses.

---

# 15. TASK CALENDAR

Provide:

* Day
* Week
* Month

Show employee tasks based on due dates.

Use clear priority/status indicators.

Clicking a task opens its detail drawer/modal.

---

# 16. CREATE TASK

Employees should NOT automatically be allowed to create tasks.

The UI should demonstrate permission-aware behavior.

For the demo frontend:

Create a mock permission configuration.

Example:

Task creation:
Allowed

If allowed, show:

**+ New Task**

Fields:

* Task title
* Description
* Project
* Priority
* Due date
* Status

Default status:

To Do

Do NOT allow the employee to:

* Assign tasks to arbitrary employees
* Modify workspace-level settings
* Create organization
* Change financial information

If task creation permission is disabled, hide the button rather than showing a broken action.

---

# 17. TASK DETAIL DRAWER

Clicking a task should open a clean detail drawer.

Show:

* Task title
* Description
* Project
* Assigned employee
* Priority
* Due date
* Status
* Activity

Actions:

* Mark complete
* Change status
* Edit
* Delete if permitted

Include confirmation for destructive actions.

---

# 18. MY TIME

Create a dedicated **My Time** page.

Header:

**My Time**

Supporting text:

**Track the time you spend on your work.**

Summary:

Hours This Week
32.5h

Billable Hours
28h

Non-Billable Hours
4.5h

Utilization
86.2%

Do NOT show monetary value.

Do NOT show:

* Hourly cost
* Payroll
* Salary
* Cost contribution

---

# 19. TIME LOG TABLE

Columns:

* Date
* Project
* Task
* Description
* Hours
* Billable
* Status

Example:

Sep 23
Acme Website Redesign
Homepage Design
Homepage UI refinement
3.5h
Billable

Sep 22
Bloom Brand Identity
Brand Exploration
Moodboard exploration
2h
Billable

---

# 20. LOG TIME

Provide:

**+ Log Time**

Form:

* Date
* Project
* Task
* Description
* Hours
* Billable / Non-billable

Allow editing/deleting own time entries where appropriate in the frontend demo.

Use validation:

* Hours must be greater than 0
* Date required
* Project required
* Description optional
* Billable status required

Show success toast:

**Time entry added**

---

# 21. WEEKLY TIME SUMMARY

Include a clean weekly chart.

Example:

Monday 7.5h
Tuesday 8h
Wednesday 6.5h
Thursday 7h
Friday 3.5h

Separate:

* Billable
* Non-billable

Do not make this chart visually heavy.

---

# 22. ACTIVITY

Create an **Activity** page focused on the employee.

Show:

* Tasks completed
* Tasks updated
* Time entries
* Project updates
* Profile changes
* Comments/activity only if represented as simple mock activity

Example:

Today
10:42 AM
Completed “Homepage Design”

Today
9:18 AM
Logged 3.5 hours on Acme Website Redesign

Yesterday
4:30 PM
Moved “Mobile Screens” to In Progress

Use a clean chronological timeline.

---

# 23. NOTIFICATIONS

Create an employee notification center.

Examples:

**Task due soon**
“Finalize homepage design” is due today.

**Project update**
Acme Website Redesign was updated.

**Time reminder**
You haven't logged time for today.

**Task assigned**
You were assigned “Prepare client presentation.”

**Deadline reminder**
Bloom Brand Identity presentation is due tomorrow.

Allow:

* Mark as read
* Mark all as read
* Open related item

Notification badge should show unread count.

---

# 24. SEARCH

Create global search using:

Cmd/Ctrl + K

Search across employee-accessible:

* Projects
* Tasks
* Time entries

Do NOT return restricted financial information.

Example:

Search:
“Acme”

Results:

Acme Website Redesign
Project

Finalize homepage design
Task

Homepage QA
Task

---

# 25. PROFILE

Create a clean employee profile page.

Show:

* Profile photo/avatar
* Name
* Role
* Email
* Workspace
* Account status

Allow frontend editing of basic personal information:

* Name
* Profile photo
* Preferred display name

Do NOT expose:

* Workspace ownership
* Billing
* Financial settings
* Company-wide permissions
* Other employees' information

---

# 26. PROFILE MENU

Top-right profile dropdown:

* Profile
* Notifications
* Help
* Sign Out

Do NOT include:

* Switch workspace
* Switch to employer
* Admin settings
* Billing
* Workspace management

---

# 27. INVITATION EXPERIENCE

Include the frontend screens necessary to demonstrate the employee invitation experience.

IMPORTANT:

This is only a frontend mock flow.

Do NOT build real email or invitation processing.

Create a dedicated invitation screen.

Example:

**You're invited to join Northstar Digital**

You've been invited by Alex Morgan to join the Northstar Digital workspace on MiniOps.

Buttons:

**Accept Invitation**

**Decline**

The invitation screen must NOT ask:

* Do you want to create a workspace?
* Do you already have a workspace?
* Create or Join Workspace?
* Are you an employer?
* Are you an employee?

There should be no organization creation flow.

---

# 28. ACCEPT INVITATION

When the user clicks:

**Accept Invitation**

Show a simple signup/login experience.

For a new user:

Name
Email
Password

Then show:

**You're joining Northstar Digital**

Role:

Employee

Then enter the Employee View.

For an existing user:

Show Login.

After login:

**Accept Invitation**

Then enter Employee View.

This is only simulated frontend behavior.

Do NOT implement actual authentication.

---

# 29. DECLINE INVITATION

Clicking:

**Decline**

should show a simple confirmation:

**Decline this invitation?**

Buttons:

Cancel
Decline Invitation

After declining:

**Invitation declined**

Do not redirect to workspace creation.

Do not create a workspace.

---

# 30. INVITATION STATES

Create mock frontend states for:

* Pending
* Accepted
* Declined
* Expired
* Cancelled

The UI should handle each state cleanly.

Expired:

**This invitation has expired.**

Cancelled:

**This invitation is no longer available.**

Do not expose technical errors.

---

# 31. PERMISSION-AWARE UI

Although this is frontend-only, structure the interface around future permissions.

Create a mock permission object/state such as:

* viewProjects
* viewTasks
* createTasks
* editTasks
* deleteTasks
* logTime
* editTime
* deleteTime
* viewTeam
* viewActivity

Use these permissions to control UI visibility.

For example:

If createTasks = false:

Do not show:

**+ New Task**

If deleteTime = false:

Do not show:

**Delete Time Entry**

This is ONLY frontend behavior.

Do not claim this is secure authorization.

The future backend must enforce the same permissions server-side.

---

# 32. EMPLOYEE DATA VISIBILITY

The Employee View must intentionally exclude sensitive business fields.

Never display:

* Project Revenue
* Project Cost
* Project Profit
* Project Margin
* Client Revenue
* Client Profit
* Agency Revenue
* Agency Profit
* Agency Expenses
* Employee Hourly Cost
* Other Employee Cost
* Payroll
* Billing
* Stripe
* Subscription revenue
* Financial reports

Do not merely hide these using CSS.

Do not include them in the mock employee data model.

The employee frontend should conceptually receive only employee-safe data.

---

# 33. EMPTY STATES

Every major employee page needs a useful empty state.

Examples:

No projects:

**No projects yet**

“You don't have any projects assigned to you.”

No tasks:

**You're all caught up**

“No tasks need your attention right now.”

No time entries:

**No time logged yet**

“Start tracking your work to keep your week up to date.”

No notifications:

**You're all caught up**

“No new notifications.”

Keep empty states minimal and professional.

---

# 34. LOADING STATES

Create skeleton loaders for:

* Dashboard
* Projects
* Tasks
* Time
* Activity
* Notifications

Avoid unnecessary full-screen spinners.

Use skeleton rows/cards matching the actual content structure.

---

# 35. ERROR STATES

Create friendly frontend error states.

Example:

**Something went wrong**

“We couldn't load this information.”

Button:

**Try Again**

Do not expose:

* Database errors
* API stack traces
* Permission implementation details
* Technical backend messages

---

# 36. TOASTS

Use lightweight toast notifications.

Examples:

**Task updated**

**Task completed**

**Time entry added**

**Time entry updated**

**Profile updated**

**Notification marked as read**

**Invitation accepted**

**Invitation declined**

Keep toasts subtle.

---

# 37. MODALS AND DRAWERS

Use drawers/modals for:

* Task details
* Create task
* Edit task
* Log time
* Edit time entry
* Profile editing
* Delete confirmation
* Invitation confirmation

Do not navigate away unnecessarily.

---

# 38. RESPONSIVE DESIGN

The employee experience must work extremely well on:

* Desktop
* Laptop
* Tablet
* Mobile

Desktop:

Sidebar + content.

Tablet:

Collapsed sidebar.

Mobile:

Drawer navigation.

Tables should become:

* Stacked cards
* Horizontally scrollable where appropriate
* Mobile-friendly lists

Never allow critical content to become unusably compressed.

---

# 39. ACCESSIBILITY

Use:

* Semantic HTML
* Keyboard navigation
* Visible focus states
* Accessible form labels
* ARIA labels where necessary
* Sufficient contrast
* Clear button states
* Proper error messages

Interactive elements should work with keyboard navigation.

---

# 40. MICROINTERACTIONS

Use subtle interactions:

* Hover states
* Button feedback
* Smooth drawer opening
* Toast animations
* Drag/drop feedback
* Checkbox completion animation
* Status changes

Do not over-animate the application.

The product should feel fast.

---

# 41. MOCK DATA

Use one coherent dataset across the entire Employee View.

Workspace:

Northstar Digital

Employee:

Jordan Lee
Senior Product Designer

Projects:

1. Acme Website Redesign
2. Bloom Brand Identity
3. Nova Education Platform

Example tasks:

Acme Website Redesign:

* Finalize homepage design
* Mobile responsive screens
* Review accessibility states
* Prepare developer handoff

Bloom Brand Identity:

* Explore logo directions
* Prepare color system
* Build presentation deck

Nova Education Platform:

* Review onboarding flow
* Design dashboard states

Time:

Use realistic daily entries totaling approximately 30–40 hours per week.

Activity:

Generate realistic employee activity connected to the projects/tasks.

All mock data should be internally consistent.

---

# 42. FRONTEND STATE ARCHITECTURE

Keep mock data organized.

Prefer a structure similar to:

/data
employees
projects
tasks
timeEntries
activities
notifications
permissions

Create reusable components:

* AppShell
* Sidebar
* Header
* Search
* NotificationCenter
* ProfileMenu
* StatCard
* ProjectCard
* TaskRow
* TaskBoard
* TaskDrawer
* TimeEntryForm
* ActivityTimeline
* StatusBadge
* PriorityBadge
* EmptyState
* LoadingState
* ErrorState
* ConfirmDialog
* Toast

Keep business logic separate from presentation where practical.

The future backend should be able to replace mock data without redesigning the application.

---

# 43. ROUTING

Create frontend routes similar to:

/employee
/employee/projects
/employee/projects/:id
/employee/tasks
/employee/time
/employee/activity
/employee/notifications
/employee/profile

Invitation routes:

/invite/:token

Again, these are frontend mock routes only.

---

# 44. IMPORTANT ROLE BEHAVIOR

The employee must always remain in Employee View.

Do not build a role switcher.

Do not create a UI where an employee can select:

Employer
Admin
Manager
Employee

The future authenticated role/membership will determine the correct experience.

For this frontend prototype, assume the logged-in user is:

**Employee**

---

# 45. NO WORKSPACE CREATION

This is extremely important.

An invited employee must NOT see:

Create Workspace
Create Organization
Set Up Workspace
Choose Workspace Type
Company Setup

The workspace already exists.

The employee is joining an existing workspace.

---

# 46. NO EMPLOYER UI LEAKAGE

Do not accidentally reuse employer navigation or employer dashboard components.

Do not display:

* Revenue KPI
* Cost KPI
* Profit KPI
* Profit Margin
* Profit Leakage
* Client Profitability
* Team Cost
* Agency Expenses
* Billing
* Financial Reports

The Employee Home should be operational, not financial.

---

# 47. PRODUCT FEEL

The Employee View should feel like:

**“I open MiniOps and immediately know what I need to work on.”**

Not:

**“I opened another complicated project management system.”**

Prioritize:

Clarity
Speed
Focus
Work visibility
Time tracking
Task completion

---

# 48. QUALITY BAR

This should look like a production-quality premium B2B SaaS frontend.

It should not look like:

* A generic dashboard template
* A school project
* A CRUD admin panel
* A colorful productivity app
* A prototype with placeholder content

Pay attention to:

* Spacing
* Typography
* Hierarchy
* Alignment
* Table density
* Empty states
* Responsive behavior
* Interaction states
* Consistency
* Information architecture

---

# 49. LANDING PAGE NOTE

Do NOT build the public MiniOps marketing landing page in this Employee frontend.

The public landing page belongs to the main MiniOps marketing experience and is handled separately.

This build is specifically:

**Employee Application Frontend**

---

# 50. FINAL EMPLOYEE NAVIGATION

The final employee navigation should be:

PRIMARY

Home
My Projects
My Tasks
My Time
Activity

SECONDARY

Notifications
Profile

No:

Reports
Billing
Settings
Team Management
Financials
Workspace Management
Employer Dashboard

---

# 51. FINAL EXPERIENCE CHECK

Before considering the frontend complete, verify:

1. Employee can open Home.
2. Employee can see today's tasks.
3. Employee can see assigned projects.
4. Employee can open a project.
5. Employee can see project-safe information.
6. Employee cannot see financial information.
7. Employee can manage permitted tasks.
8. Employee can view tasks in List, Board and Calendar.
9. Employee can log time.
10. Employee can see weekly time.
11. Employee can see personal activity.
12. Employee can receive/read notifications.
13. Employee can search employee-accessible data.
14. Employee can edit basic profile information.
15. Invitation screen has Accept and Decline.
16. Invitation flow never asks the employee to create a workspace.
17. Employee never gets Employer View.
18. Permission-aware UI is demonstrated through mock state.
19. Responsive behavior works across desktop/tablet/mobile.
20. Loading, empty, error and success states exist.
21. No backend or database is implemented.
22. Mock data is coherent and realistic.
23. UI is ready for future API integration.

---

# 52. FINAL IMPLEMENTATION INSTRUCTION

Build this as a polished, coherent Employee frontend for MiniOps.

Do not overbuild it.

Do not turn it into ClickUp, Asana, Monday, Jira or another full project-management platform.

MiniOps Employee View should remain lightweight.

The employee needs a focused workspace for:

**Projects → Tasks → Time → Activity**

with a clean Home dashboard tying everything together.

The Employer View will handle business management and financial intelligence separately.

Build the frontend with clean reusable components, realistic mock data, responsive layouts, polished interaction states and a clear separation between employee-safe information and employer-only information.

The final result should feel like a premium SaaS product that is ready to connect to a real backend later.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://myminiops.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/480eaad1-1cdb-4e26-b5cd-45239f189590).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
