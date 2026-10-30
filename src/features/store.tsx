import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  initialWorkspaces,
  setMoneyCurrency,
  type Client,
  type Expense,
  type Project,
  type Subscription,
  type Task,
  type TeamMember,
  type TimeEntry,
  type Workspace,
  type WorkspaceData,
} from "@/data/mock";
import { initialProfile, type AppNotification, type Profile } from "@/data/ops";
import { applyChatEvent, conversationsKey } from "@/features/chat-cache";
import { notificationKind } from "@/lib/notifications";
import { connectLive, isChatEvent } from "@/lib/live";
import {
  authApi,
  chatApi,
  type ApiConversation,
  notificationsApi,
  type ApiNotification,
  clientsApi,
  expensesApi,
  subscriptionsApi,
  timeApi,
  invitationsApi,
  inviteLinkApi,
  membersApi,
  projectsApi,
  tasksApi,
  tokenStore,
  SIGNED_OUT_EVENT,
  usersApi,
  workspacesApi,
  type AccessLevel,
  type ApiClient,
  type ApiExpense,
  type ApiTimeEntry,
  type TimeEntryWrite,
  type ApiSubscription,
  type ExpenseWrite,
  type SubscriptionWrite,
  type ApiInvitation,
  type ApiMember,
  type ApiProject,
  type ApiTask,
  type ApiUser,
  type ApiWorkspace,
  ROLE_LABELS,
  type WorkspaceRole,
  type ClientWrite,
  type InvitationCreate,
  type MemberUpdate,
  type PermissionMap,
  type PermissionModule,
  type ProfilePatch,
  type ProjectStatus,
  type ProjectType,
  type ProjectWrite,
  type TaskPriority,
  type TaskStatus,
  type TaskWrite,
} from "@/lib/api";
export type AuthStatus = "loading" | "signedIn" | "signedOut";
type WorkspaceInput = { name: string; industry: string; currency: string; timezone: string };
export type WorkspacePatch = Partial<
  Pick<
    Workspace,
    | "name"
    | "industry"
    | "currency"
    | "timezone"
    | "workingDays"
    | "defaultHourlyRate"
    | "weeklyHours"
    | "targetMargin"
  >
>;
/** Project form values: link an existing client by `clientSlug`, or create one from `newClient` (a name). */
export type ProjectInput = {
  name: string;
  clientSlug: string;
  newClient: string;
  projectType: string;
  status: string;
  description: string;
  revenue: number;
  budget: number;
  cost: number;
  progress: number;
  startDate: string;
  endDate: string;
  /** Managers' user IDs. */
  managers: string[];
};
export type LoadState = { loading: boolean; error: string | null; retry: () => void };
/** A task from the API. `project` is the project's slug; `assignee` a member's user ID. */
export type TaskItem = {
  slug: string;
  title: string;
  description: string;
  project: string | null;
  projectName: string;
  assignee: number | null;
  assigneeName: string;
  tags: string[];
  /** Slug of the task this is a sub-task of. */
  parent: string | null;
  parentTitle: string;
  subtasks: Subtask[];
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  isOverdue: boolean;
  completedAt: string | null;
  createdAt: string;
  createdByName: string;
  createdByMe: boolean;
  canEdit: boolean;
  canDelete: boolean;
};
export type Subtask = {
  slug: string;
  title: string;
  assignee: number | null;
  assigneeName: string;
  status: TaskStatus;
  dueDate: string | null;
  isOverdue: boolean;
};
/** Task form values; empty `project`/`dueDate` mean none. */
export type TaskInput = {
  title: string;
  description: string;
  project: string;
  /** User IDs. Two or more (new tasks only) gives each person their own sub-task. */
  assignees: string[];
  /** Per-person deadlines ({user ID: date}) that differ from `dueDate`. */
  dueDates?: Record<string, string>;
  /** Parent task slug, "" for none; left out to keep it unchanged. */
  parent?: string;
  tags: string[];
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
};
/** A client from the API with totals rolled up from its projects. */
export type ClientItem = {
  slug: string;
  name: string;
  industry: string;
  status: ApiClient["status"];
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  projectCount: number;
  activeProjects: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  health: ApiClient["health"];
  createdAt: string;
};
export type ClientInput = {
  name: string;
  industry: string;
  status: ApiClient["status"];
  contactName: string;
  email: string;
  phone: string;
  notes: string;
};
/** A workspace member. `id` is the user ID (task assignees); `slug` is for URLs (/team/<slug>). */
/** An expense from the API. `project` is a project slug (null = agency overhead). */
export type ExpenseItem = {
  slug: string;
  title: string;
  category: ApiExpense["category"];
  project: string | null;
  projectName: string;
  amount: number;
  date: string;
  vendor: string;
  notes: string;
  receiptUrl: string | null;
  receiptName: string;
  subscription: string | null;
  subscriptionName: string;
  isRecurring: boolean;
  status: ApiExpense["status"];
  rejectionReason: string;
  submittedByName: string;
  reviewedByName: string;
  isMine: boolean;
  canEdit: boolean;
  createdAt: string;
};
export type SubscriptionItem = {
  slug: string;
  name: string;
  vendor: string;
  category: ApiSubscription["category"];
  amount: number;
  billingCycle: ApiSubscription["billing_cycle"];
  nextRenewal: string;
  nextPaymentDate: string | null;
  paymentMethod: string;
  status: ApiSubscription["status"];
  project: string | null;
  projectName: string;
  notes: string;
  invoiceFileUrl: string | null;
  invoiceName: string;
  invoiceUrl: string;
  monthlyCost: number;
  annualCost: number;
  renewalCount: number;
};
/** A time entry from the API. `member` is a user ID; `project`/`task` are slugs. */
export type TimeItem = {
  slug: string;
  member: number;
  memberName: string;
  memberSlug: string;
  project: string | null;
  projectName: string;
  task: string | null;
  taskTitle: string;
  date: string;
  startTime: string | null;
  hours: number;
  description: string;
  billable: boolean;
  hourlyCost: number | null | undefined;
  cost: number | null | undefined;
  canEdit: boolean;
  createdAt: string;
};
export type Member = {
  id: number;
  slug: string;
  name: string;
  email: string;
  title: string;
  avatarUrl: string | null;
  role: string;
  permissions: PermissionMap;
  customized: boolean;
  hourlyCost: number | null | undefined;
  weeklyCapacity: number;
  invitedByName: string;
  isMe: boolean;
  joinedAt: string;
};
export type Invitation = {
  id: number;
  email: string;
  role: string;
  permissions: PermissionMap;
  message: string;
  status: ApiInvitation["status"];
  invitedByName: string;
  sentAt: string | null;
  expiresAt: string;
  inviteUrl?: string;
};
type Store = WorkspaceData & {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  switchWorkspace: (id: string) => void;
  createWorkspace: (input: WorkspaceInput) => void;
  /** Owner only. Deletes the workspace and everything in it, then moves to another one. */
  deleteWorkspace: (id: string) => Promise<void>;
  /** Owners and admins. Saves workspace settings (API when signed in, memory in the demo). */
  updateWorkspace: (id: string, patch: WorkspacePatch) => Promise<void>;
  notifications: number;
  markRead: () => void;
  // Signed in = `live`: workspaces and projects come from miniops-backend; otherwise demo data in memory.
  live: boolean;
  projectsState: LoadState;
  /** Signed in but the workspace list hasn't arrived yet. */
  workspacesLoading: boolean;
  /** Members of the active workspace only get the employee view (/employee). */
  employeeOnly: boolean;
  /** Does the signed-in user have at least `level` access to `module` in the active workspace? */
  can: (module: PermissionModule, level?: AccessLevel) => boolean;
  canManageTeam: boolean;
  invitations: Invitation[];
  teamState: LoadState;
  saveMember: (slug: string, update: MemberUpdate) => Promise<Member>;
  removeMember: (slug: string) => Promise<void>;
  inviteMember: (input: InvitationCreate) => Promise<Invitation>;
  resendInvitation: (id: number) => Promise<Invitation>;
  cancelInvitation: (id: number) => Promise<void>;
  acceptInvitation: (token: string) => Promise<Workspace>;
  timeList: TimeItem[];
  timeState: LoadState;
  /** Log/change anyone's time (owner, admin, manager with time:edit) — mirrors the API. */
  canManageTime: boolean;
  saveTime: (input: TimeEntryWrite, slug?: string) => Promise<TimeItem>;
  deleteTime: (slug: string) => Promise<void>;
  expenseList: ExpenseItem[];
  subscriptionList: SubscriptionItem[];
  expensesState: LoadState;
  /** Approving/rejecting spend needs expenses:edit + financials:view (same rule as the API). */
  canReviewExpenses: boolean;
  saveExpense: (input: ExpenseWrite, slug?: string) => Promise<ExpenseItem>;
  deleteExpense: (slug: string) => Promise<void>;
  reviewExpense: (slug: string, approve: boolean, reason?: string) => Promise<ExpenseItem>;
  saveSubscription: (input: SubscriptionWrite, slug?: string) => Promise<SubscriptionItem>;
  deleteSubscription: (slug: string) => Promise<void>;
  saveProject: (input: ProjectInput, slug?: string) => Promise<Project>;
  deleteProject: (slug: string) => Promise<void>;
  taskList: TaskItem[];
  tasksState: LoadState;
  members: Member[];
  clientList: ClientItem[];
  clientsState: LoadState;
  saveClient: (input: ClientInput, slug?: string) => Promise<ClientItem>;
  deleteClient: (slug: string) => Promise<void>;
  saveTask: (input: TaskInput, slug?: string) => Promise<TaskItem>;
  /** Uploads an image for a task description and returns its URL. */
  uploadTaskImage: (image: File) => Promise<string>;
  deleteTask: (slug: string) => Promise<void>;
  moveTask: (slug: string, status: TaskStatus) => Promise<void>;
  rescheduleTask: (slug: string, dueDate: string) => Promise<void>;
  notificationList: AppNotification[];
  readNotification: (id: string) => void;
  /** Raw notifications from the API (the employee view maps them itself). */
  apiNotifications: ApiNotification[];
  notificationsState: LoadState;
  unreadNotification: (id: string) => void;
  deleteNotification: (id: string) => Promise<void>;
  /** Your chat conversations in this workspace, most recent first (kept live by the socket). */
  /** Ask for lists the current page doesn't load by itself; use the useNeeds() hook. */
  need: (keys: DataKey[]) => () => void;
  chatConversations: ApiConversation[];
  chatUnread: number;
  chatState: LoadState;
  /** Owners, admins and managers create and manage chat groups. */
  canCreateGroups: boolean;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  // Backend auth (miniops-backend). Signed out = demo profile, edits stay local.
  authStatus: AuthStatus;
  user: ApiUser | null;
  signInWithGoogle: (credential: string) => Promise<ApiUser>;
  signOut: () => Promise<void>;
  /** Email + password sign-in. Throws ApiError with code `email_not_verified` for unconfirmed accounts. */
  signIn: (email: string, password: string) => Promise<ApiUser>;
  /** After an auth call that already stored tokens (email confirmation, password reset). */
  completeSignIn: (user: ApiUser) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  saveProfile: (patch: ProfilePatch) => Promise<void>;
  uploadAvatar: (image: Blob) => Promise<void>;
  removeAvatar: () => Promise<void>;
};
const C = createContext<Store | null>(null);
const emptyData = (): WorkspaceData => ({
  projects: [],
  clients: [],
  team: [],
  tasks: [],
  expenses: [],
  timeEntries: [],
  chartData: [
    { month: "Apr", revenue: 0, cost: 0, profit: 0 },
    { month: "May", revenue: 0, cost: 0, profit: 0 },
    { month: "Jun", revenue: 0, cost: 0, profit: 0 },
    { month: "Jul", revenue: 0, cost: 0, profit: 0 },
    { month: "Aug", revenue: 0, cost: 0, profit: 0 },
    { month: "Sep", revenue: 0, cost: 0, profit: 0 },
  ],
  subscriptions: [],
});
const LOADING_WORKSPACE: Workspace = {
  id: "loading",
  name: "Loading…",
  industry: "",
  currency: "USD",
  timezone: "UTC",
  workingDays: "mon_fri",
  role: "",
  data: emptyData(),
};
const WORKSPACE_KEY = "miniops.workspace";
const readSaved = () => {
  try {
    return localStorage.getItem(WORKSPACE_KEY) ?? "";
  } catch {
    return "";
  }
};
const roleLabel = (r: WorkspaceRole) => ROLE_LABELS[r] ?? r;
const fromApiWorkspace = (w: ApiWorkspace): Workspace => ({
  id: String(w.id),
  name: w.name,
  industry: w.industry,
  currency: w.currency,
  timezone: w.timezone,
  workingDays: w.working_days,
  defaultHourlyRate: w.default_hourly_rate,
  weeklyHours: w.weekly_hours,
  targetMargin: w.target_margin,
  role: roleLabel(w.role),
  data: emptyData(),
  permissions: w.permissions,
  memberSlug: w.member_slug,
});
const LEVEL_RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 };
// A project's `id` in the app is its slug, so URLs read /projects/<slug>.
const fromApiProject = (p: ApiProject): Project => ({
  id: p.slug,
  name: p.name,
  client: p.client_name,
  clientSlug: p.client,
  status: p.status,
  revenue: p.revenue ?? 0,
  budget: p.budget ?? 0,
  cost: p.cost ?? 0,
  profit: p.profit ?? 0,
  margin: p.margin ?? 0,
  progress: p.progress,
  budgetUsed: p.budget_used ?? 0,
  health: p.health ?? "Healthy",
  projectType: p.project_type,
  description: p.description,
  startDate: p.start_date,
  endDate: p.end_date,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  managers: p.managers,
  managerNames: p.manager_names,
  team: p.team,
});
const toApiProject = (i: ProjectInput): ProjectWrite => ({
  name: i.name,
  ...(i.newClient ? { client_name: i.newClient } : { client: i.clientSlug || null }),
  project_type: i.projectType as ProjectType,
  status: i.status as ProjectStatus,
  description: i.description,
  revenue: i.revenue,
  budget: i.budget,
  cost: i.cost,
  progress: i.progress,
  start_date: i.startDate || null,
  end_date: i.endDate || null,
  managers: i.managers.map(Number),
});
const fromApiTask = (t: ApiTask): TaskItem => ({
  slug: t.slug,
  title: t.title,
  description: t.description,
  project: t.project,
  projectName: t.project_name,
  assignee: t.assignee,
  assigneeName: t.assignee_name,
  tags: t.tags ?? [],
  parent: t.parent,
  parentTitle: t.parent_title,
  subtasks: (t.subtasks ?? []).map((s) => ({
    slug: s.slug,
    title: s.title,
    assignee: s.assignee,
    assigneeName: s.assignee_name,
    status: s.status,
    dueDate: s.due_date,
    isOverdue: s.is_overdue,
  })),
  priority: t.priority,
  status: t.status,
  dueDate: t.due_date,
  isOverdue: t.is_overdue,
  completedAt: t.completed_at,
  createdAt: t.created_at,
  createdByName: t.created_by_name,
  createdByMe: t.created_by_me,
  canEdit: t.can_edit,
  canDelete: t.can_delete,
});
const toApiTask = (i: TaskInput): TaskWrite => ({
  title: i.title,
  description: i.description,
  project: i.project || null,
  ...(i.parent !== undefined ? { parent: i.parent || null } : {}),
  ...(i.assignees.length > 1
    ? {
        assignees: i.assignees.map(Number),
        due_dates: Object.fromEntries(
          Object.entries(i.dueDates ?? {}).filter(([id, date]) => date && i.assignees.includes(id)),
        ),
      }
    : { assignee: i.assignees[0] ? Number(i.assignees[0]) : null }),
  tags: i.tags,
  priority: i.priority,
  status: i.status,
  due_date: i.dueDate || null,
});
const fromApiClient = (c: ApiClient): ClientItem => ({
  slug: c.slug,
  name: c.name,
  industry: c.industry,
  status: c.status,
  contactName: c.contact_name,
  email: c.email,
  phone: c.phone,
  notes: c.notes,
  projectCount: c.project_count,
  activeProjects: c.active_projects,
  revenue: c.revenue ?? 0,
  cost: c.cost ?? 0,
  profit: c.profit ?? 0,
  margin: c.margin ?? 0,
  health: c.health ?? "No data",
  createdAt: c.created_at,
});
const toApiClient = (i: ClientInput): ClientWrite => ({
  name: i.name,
  industry: i.industry,
  status: i.status,
  contact_name: i.contactName,
  email: i.email,
  phone: i.phone,
  notes: i.notes,
});
/** Search and reports still read the tuple shape: [slug, name, industry, revenue, margin]. */
const toClientTuple = (c: ClientItem): Client => [c.slug, c.name, c.industry, c.revenue, c.margin];
const fromApiTime = (e: ApiTimeEntry): TimeItem => ({
  slug: e.slug,
  member: e.member,
  memberName: e.member_name,
  memberSlug: e.member_slug,
  project: e.project,
  projectName: e.project_name,
  task: e.task,
  taskTitle: e.task_title,
  date: e.date,
  startTime: e.start_time,
  hours: Number(e.hours),
  description: e.description,
  billable: e.billable,
  hourlyCost: e.hourly_cost == null ? e.hourly_cost : Number(e.hourly_cost),
  cost: e.cost == null ? e.cost : Number(e.cost),
  canEdit: e.can_edit,
  createdAt: e.created_at,
});
/** Dashboard reads the time tuple: ['Oct 5', member, project, description, hours, 'Yes'|'No', cost]. */
const toTimeTuple = (e: TimeItem): TimeEntry => [
  new Date(`${e.date}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  e.memberName,
  e.projectName || "Agency overhead",
  e.description,
  e.hours,
  e.billable ? "Yes" : "No",
  e.cost ?? 0,
];
const fromApiExpense = (e: ApiExpense): ExpenseItem => ({
  slug: e.slug,
  title: e.title,
  category: e.category,
  project: e.project,
  projectName: e.project_name,
  amount: Number(e.amount),
  date: e.date,
  vendor: e.vendor,
  notes: e.notes,
  receiptUrl: e.receipt_url,
  receiptName: e.receipt_name,
  subscription: e.subscription,
  subscriptionName: e.subscription_name,
  isRecurring: e.is_recurring,
  status: e.status,
  rejectionReason: e.rejection_reason,
  submittedByName: e.submitted_by_name,
  reviewedByName: e.reviewed_by_name,
  isMine: e.is_mine,
  canEdit: e.can_edit,
  createdAt: e.created_at,
});
const fromApiSubscription = (s: ApiSubscription): SubscriptionItem => ({
  slug: s.slug,
  name: s.name,
  vendor: s.vendor,
  category: s.category,
  amount: Number(s.amount),
  billingCycle: s.billing_cycle,
  nextRenewal: s.next_renewal,
  nextPaymentDate: s.next_payment_date,
  paymentMethod: s.payment_method,
  status: s.status,
  project: s.project,
  projectName: s.project_name,
  notes: s.notes,
  invoiceFileUrl: s.invoice_file_url,
  invoiceName: s.invoice_name,
  invoiceUrl: s.invoice_url,
  monthlyCost: Number(s.monthly_cost),
  annualCost: Number(s.annual_cost),
  renewalCount: s.renewal_count,
});
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
/** Dashboard/search read the expense tuple: [title, category, project, amount, 'Oct 5', recurring, status]. */
const toExpenseTuple = (e: ExpenseItem): Expense => [
  e.title,
  e.category,
  e.projectName || "Agency overhead",
  e.amount,
  shortDate(e.date),
  e.isRecurring ? "Recurring" : "No",
  e.status,
];
const toSubscriptionCard = (s: SubscriptionItem): Subscription => ({
  id: s.slug,
  name: s.name,
  vendor: s.vendor,
  category: s.category,
  amount: s.amount,
  billingCycle: s.billingCycle,
  nextRenewal: new Date(`${s.nextRenewal}T00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }),
  paymentMethod: s.paymentMethod,
  status: s.status === "Active" ? "Active" : "Paused",
  notes: s.notes,
});
const fromApiMember = (m: ApiMember): Member => ({
  id: m.id,
  slug: m.slug,
  name: m.name,
  email: m.email,
  title: m.title,
  avatarUrl: m.avatar_url,
  role: roleLabel(m.role),
  permissions: m.permissions,
  customized: m.customized,
  hourlyCost: m.hourly_cost,
  weeklyCapacity: m.weekly_capacity,
  invitedByName: m.invited_by_name,
  isMe: m.is_me,
  joinedAt: m.joined_at,
});
const fromApiInvitation = (i: ApiInvitation): Invitation => ({
  id: i.id,
  email: i.email,
  role: roleLabel(i.role),
  permissions: i.permissions,
  message: i.message,
  status: i.status,
  invitedByName: i.invited_by_name,
  sentAt: i.sent_at,
  expiresAt: i.expires_at,
  ...(i.invite_url ? { inviteUrl: i.invite_url } : {}),
});
/** Dashboard, search and reports read the team tuple: [slug, name, title, hours, billable, utilization, hourly cost]. */
const toTeamTuple = (m: Member): TeamMember => [
  m.slug,
  m.name,
  m.title || m.role,
  0,
  0,
  0,
  m.hourlyCost ?? 0,
];
/** Dashboard and search still read the compact tuple shape: [title, project, assignee, priority, 'Oct 5', status]. */
const toTaskTuple = (t: TaskItem): Task => [
  t.title,
  t.projectName || "Agency overhead",
  t.assigneeName || "Unassigned",
  t.priority,
  t.dueDate
    ? new Date(`${t.dueDate}T00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "",
  t.status,
];
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
/** Short age for the bell: "now", "12m", "3h", "2d", then a date. */
const shortAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  if (m < 10080) return `${Math.round(m / 1440)}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fromApiNotification = (n: ApiNotification): AppNotification => {
  const d = n.data;
  const kind = notificationKind(n);
  const to =
    kind === "time"
      ? "/time"
      : kind === "expense"
        ? "/expenses"
        : kind === "team"
          ? "/team"
          : kind === "project"
            ? d.slug
              ? `/projects/${d.slug}`
              : "/projects"
            : n.verb === "task.deleted" || !d.slug
              ? "/tasks"
              : `/tasks/${d.slug}`;
  return {
    id: String(n.id),
    type: kind,
    title: d.title ?? "Notification",
    description: n.description,
    ago: shortAgo(n.timestamp),
    read: !n.unread,
    to,
  };
};
/** Workspace lists the store can load. Each is fetched only while something on screen needs it. */
export type DataKey =
  "projects" | "tasks" | "members" | "invitations" | "clients" | "time" | "expenses";
/** What each page shows (first match wins; a trailing "/" means "and everything below"). */
const ROUTE_NEEDS: [string, DataKey[]][] = [
  ["/app", ["projects", "tasks", "members", "expenses", "time"]],
  ["/projects/", ["projects", "clients", "tasks", "members"]],
  ["/projects", ["projects", "clients"]],
  ["/tasks", ["tasks", "projects", "members"]],
  ["/time", ["time", "projects", "members"]],
  ["/clients", ["clients", "projects"]],
  ["/team", ["members", "invitations"]],
  ["/expenses", ["expenses", "projects"]],
  ["/settings", ["members", "invitations"]],
  ["/reports", ["members", "expenses"]],
  ["/billing", ["members", "expenses"]],
  ["/admin", ["members", "expenses"]],
  // Employee pages: list each one, so "/employee" below only covers the overview.
  ["/employee/time", ["time", "members"]],
  ["/employee/tasks", ["tasks", "projects"]],
  ["/employee/projects/", ["projects", "tasks", "time", "members"]],
  ["/employee/projects", ["projects", "tasks", "time"]],
  ["/employee/team", ["members", "tasks"]],
  ["/employee/activity", []],
  ["/employee/notifications", []],
  ["/employee/chat", []],
  ["/employee/profile", []],
  ["/employee/settings", []],
  ["/employee", ["tasks", "time", "projects", "members"]],
];
const routeNeeds = (path: string) =>
  ROUTE_NEEDS.find(([p]) =>
    p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(`${p}/`),
  )?.[1] ?? [];
/** Lists don't refetch on every page change; edits update the cache directly. */
const LIST_STALE_MS = 60_000;
export function MiniOpsProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [activeId, setActiveId] = useState(initialWorkspaces[0]?.id ?? "northstar");
  const [localProfile, setProfile] = useState(initialProfile);
  const [user, setUser] = useState<ApiUser | null>(null);
  const userIdRef = useRef<number | undefined>(undefined);
  userIdRef.current = user?.id;
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  useEffect(() => {
    if (!tokenStore.get()) {
      setAuthStatus("signedOut");
      return;
    }
    usersApi
      .me()
      .then((u) => {
        setUser(u);
        setAuthStatus("signedIn");
      })
      .catch(() => setAuthStatus("signedOut"));
  }, []);
  // The signed-in user's details replace the demo profile; `id` stays ME so chat/team authorship keeps working.
  // While the session is being checked, show nobody (not the demo profile) so a reload never flashes placeholder data.
  const profile = useMemo<Profile>(
    () =>
      user
        ? {
            ...localProfile,
            name: user.name || user.email,
            title: user.title,
            email: user.email,
            phone: user.phone,
            timezone: user.timezone,
            avatar: user.avatar_url ?? undefined,
          }
        : authStatus === "loading"
          ? {
              ...localProfile,
              name: "",
              title: "",
              email: "",
              phone: "",
              timezone: "",
              avatar: undefined,
            }
          : localProfile,
    [user, localProfile, authStatus],
  );
  const signedIn = (u: ApiUser) => {
    setUser(u);
    setAuthStatus("signedIn");
  };
  const live = authStatus === "signedIn";
  const queryClient = useQueryClient();
  // The session ended elsewhere (refresh token expired or revoked, e.g. password changed on another device).
  useEffect(() => {
    const ended = () => {
      setUser(null);
      setAuthStatus("signedOut");
      queryClient.removeQueries();
    };
    addEventListener(SIGNED_OUT_EVENT, ended);
    return () => removeEventListener(SIGNED_OUT_EVENT, ended);
  }, [queryClient]);
  const workspacesQuery = useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: workspacesApi.list,
    enabled: live,
  });
  const liveWorkspaces = useMemo(
    () => (workspacesQuery.data ?? []).map(fromApiWorkspace),
    [workspacesQuery.data],
  );
  const [liveActiveId, setLiveActiveId] = useState(readSaved);
  const switchWorkspace = (id: string) => {
    if (!live) {
      setActiveId(id);
      return;
    }
    setLiveActiveId(id);
    try {
      localStorage.setItem(WORKSPACE_KEY, id);
    } catch {
      /* not persisted */
    }
  };
  const visibleWorkspaces = live ? liveWorkspaces : workspaces;
  const activeWorkspace = useMemo(
    () =>
      authStatus === "loading"
        ? LOADING_WORKSPACE
        : live
          ? (liveWorkspaces.find((w) => w.id === liveActiveId) ??
            liveWorkspaces[0] ??
            LOADING_WORKSPACE)
          : (workspaces.find((w) => w.id === activeId) ?? workspaces[0]),
    [authStatus, live, liveWorkspaces, liveActiveId, workspaces, activeId],
  );
  if (!activeWorkspace) throw new Error("MiniOps workspace missing");
  // Set during render so every amount below this provider uses the workspace's currency.
  setMoneyCurrency(activeWorkspace.currency);
  const wid = activeWorkspace.id;
  const apiWid = live && wid !== "loading" ? Number(wid) : null;
  // Load data on demand: what the current page needs, plus anything a mounted component asks for (useNeeds).
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const [extraNeeds, setExtraNeeds] = useState<Partial<Record<DataKey, number>>>({});
  const needs = useMemo(() => {
    const n = new Set<DataKey>(routeNeeds(pathname));
    for (const [k, c] of Object.entries(extraNeeds)) if (c) n.add(k as DataKey);
    return n;
  }, [pathname, extraNeeds]);
  const need = useCallback((keys: DataKey[]) => {
    const bump = (d: number) =>
      setExtraNeeds((x) => {
        const y = { ...x };
        for (const k of keys) y[k] = (y[k] ?? 0) + d;
        return y;
      });
    bump(1);
    return () => bump(-1);
  }, []);
  const can = (module: PermissionModule, level: AccessLevel = "view") =>
    live && LEVEL_RANK[activeWorkspace.permissions?.[module] ?? "none"] >= LEVEL_RANK[level];
  // Only fetch what the member may see; the backend would answer 403 anyway.
  const allowed = {
    projects: apiWid !== null && can("projects") && needs.has("projects"),
    tasks: apiWid !== null && can("tasks") && needs.has("tasks"),
    clients: apiWid !== null && can("clients") && needs.has("clients"),
    expenses: apiWid !== null && can("expenses") && needs.has("expenses"),
    time: apiWid !== null && can("time") && needs.has("time"),
    members: apiWid !== null && needs.has("members"),
  };
  const projectsQuery = useQuery({
    queryKey: ["projects", apiWid],
    queryFn: () => projectsApi.list(apiWid!),
    enabled: allowed.projects,
    staleTime: LIST_STALE_MS,
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks", apiWid],
    queryFn: () => tasksApi.list(apiWid!),
    enabled: allowed.tasks,
    staleTime: LIST_STALE_MS,
  });
  const membersQuery = useQuery({
    queryKey: ["members", apiWid],
    queryFn: () => membersApi.list(apiWid!),
    enabled: allowed.members,
    staleTime: LIST_STALE_MS,
  });
  const canManageTeam = live && activeWorkspace.role === "Employer";
  const invitationsQuery = useQuery({
    queryKey: ["invitations", apiWid],
    queryFn: () => invitationsApi.list(apiWid!),
    enabled: apiWid !== null && canManageTeam && needs.has("invitations"),
    staleTime: LIST_STALE_MS,
  });
  const clientsQuery = useQuery({
    queryKey: ["clients", apiWid],
    queryFn: () => clientsApi.list(apiWid!),
    enabled: allowed.clients,
    staleTime: LIST_STALE_MS,
  });
  const timeQuery = useQuery({
    queryKey: ["time", apiWid],
    queryFn: () => timeApi.list(apiWid!),
    enabled: allowed.time,
    staleTime: LIST_STALE_MS,
  });
  const expensesQuery = useQuery({
    queryKey: ["expenses", apiWid],
    queryFn: () => expensesApi.list(apiWid!),
    enabled: allowed.expenses,
    staleTime: LIST_STALE_MS,
  });
  // Notifications: polled so the bell picks up others' actions without a reload.
  // Loaded once per workspace, then kept current by the WebSocket (no polling or refetching).
  const liveOnly = {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  } as const;
  const notificationsQuery = useQuery({
    queryKey: ["notifications", apiWid],
    queryFn: () => notificationsApi.list(apiWid!),
    enabled: apiWid !== null,
    ...liveOnly,
  });
  const unreadQuery = useQuery({
    queryKey: ["notifications", apiWid, "unread"],
    queryFn: () => notificationsApi.unreadCount(apiWid!),
    enabled: apiWid !== null,
    ...liveOnly,
  });
  // Live updates: the server pushes over a WebSocket the moment a notification is created
  // or read elsewhere; polling above is only a slow fallback.
  useEffect(() => {
    if (!live) return;
    return connectLive(
      (m) => {
        if (m.type === "ready") return;
        if (isChatEvent(m)) {
          applyChatEvent(queryClient, m, userIdRef.current);
          return;
        }
        const key = ["notifications", m.workspace];
        queryClient.setQueryData<number>([...key, "unread"], m.unread);
        if (m.type === "notification") {
          queryClient.setQueryData<ApiNotification[]>(
            key,
            (l) => l && [m.notification, ...l.filter((x) => x.id !== m.notification.id)],
          );
          return;
        }
        queryClient.setQueryData<ApiNotification[]>(
          key,
          (l) =>
            l &&
            (m.action === "deleted"
              ? l.filter((x) => !m.ids.includes(x.id))
              : l.map((x) =>
                  m.action === "read_all" || m.ids.includes(x.id)
                    ? { ...x, unread: m.action === "unread" }
                    : x,
                )),
        );
      },
      // Only after a dropped connection: catch up on what was missed.
      () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        void queryClient.invalidateQueries({ queryKey: ["chat"] });
      },
    );
  }, [live, user?.id, queryClient]);
  const apiNotifications = notificationsQuery.data ?? [];
  // Chat: loaded once per workspace, then kept current by the socket (see chat-cache.ts).
  const chatQuery = useQuery({
    queryKey: conversationsKey(apiWid),
    queryFn: () => chatApi.conversations(apiWid!),
    enabled: apiWid !== null,
    ...liveOnly,
  });
  const chatConversations = chatQuery.data ?? [];
  const chatState: LoadState = {
    loading: chatQuery.isPending && apiWid !== null,
    error: chatQuery.error ? errorText(chatQuery.error) : null,
    retry: () => void chatQuery.refetch(),
  };
  // Optimistic updates; the socket then confirms them with the server's unread count.
  const setUnread = (fn: (n: number) => number) =>
    queryClient.setQueryData<number>(["notifications", apiWid, "unread"], (n) => fn(n ?? 0));
  const undo = (e: unknown) => {
    toast.error(errorText(e));
    void queryClient.invalidateQueries({ queryKey: ["notifications", apiWid] });
  };
  const readNotification = (id: string) => {
    if (apiWid === null) return;
    const n = apiNotifications.find((x) => String(x.id) === id);
    if (!n?.unread) return;
    queryClient.setQueryData<ApiNotification[]>(["notifications", apiWid], (l) =>
      l?.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
    );
    setUnread((c) => Math.max(0, c - 1));
    notificationsApi.read(apiWid, n.id).catch(undo);
  };
  const unreadNotification = (id: string) => {
    if (apiWid === null) return;
    const n = apiNotifications.find((x) => String(x.id) === id);
    if (!n || n.unread) return;
    queryClient.setQueryData<ApiNotification[]>(["notifications", apiWid], (l) =>
      l?.map((x) => (x.id === n.id ? { ...x, unread: true } : x)),
    );
    setUnread((c) => c + 1);
    notificationsApi.unread(apiWid, n.id).catch(undo);
  };
  async function deleteNotification(id: string) {
    if (apiWid === null) throw notSignedIn();
    const wasUnread = apiNotifications.some((x) => String(x.id) === id && x.unread);
    await notificationsApi.remove(apiWid, Number(id));
    queryClient.setQueryData<ApiNotification[]>(["notifications", apiWid], (l) =>
      l?.filter((x) => String(x.id) !== id),
    );
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));
  }
  const notificationsState: LoadState = {
    loading: notificationsQuery.isPending && apiWid !== null,
    error: notificationsQuery.error ? errorText(notificationsQuery.error) : null,
    retry: () => void notificationsQuery.refetch(),
  };
  // Pop up notifications that arrive while you're here (not the ones already waiting on load).
  const seenNotes = useRef<{ wid: number | null; ids: Set<number> } | null>(null);
  useEffect(() => {
    const list = notificationsQuery.data;
    if (!list) return;
    const seen = seenNotes.current;
    if (!seen || seen.wid !== apiWid) {
      seenNotes.current = { wid: apiWid, ids: new Set(list.map((n) => n.id)) };
      return;
    }
    const fresh = list.filter((n) => n.unread && !seen.ids.has(n.id));
    for (const n of list) seen.ids.add(n.id);
    for (const n of fresh.slice(0, 3))
      toast(n.data.title ?? "New notification", { description: n.description });
    if (fresh.length > 3) toast(`${fresh.length - 3} more new notifications`);
  }, [notificationsQuery.data, apiWid]);
  const markRead = () => {
    if (apiWid === null) return;
    queryClient.setQueryData<ApiNotification[]>(["notifications", apiWid], (l) =>
      l?.map((x) => ({ ...x, unread: false })),
    );
    setUnread(() => 0);
    notificationsApi.readAll(apiWid).catch(undo);
  };
  const subscriptionsQuery = useQuery({
    queryKey: ["subscriptions", apiWid],
    queryFn: () => subscriptionsApi.list(apiWid!),
    enabled: allowed.expenses,
    staleTime: LIST_STALE_MS,
  });
  const liveProjects = useMemo(
    () => (projectsQuery.data ?? []).map(fromApiProject),
    [projectsQuery.data],
  );
  const taskList = useMemo(
    () => (live ? (tasksQuery.data ?? []).map(fromApiTask) : []),
    [live, tasksQuery.data],
  );
  const members = useMemo(() => (membersQuery.data ?? []).map(fromApiMember), [membersQuery.data]);
  const clientList = useMemo(
    () => (live ? (clientsQuery.data ?? []).map(fromApiClient) : []),
    [live, clientsQuery.data],
  );
  const timeList = useMemo(
    () => (live ? (timeQuery.data ?? []).map(fromApiTime) : []),
    [live, timeQuery.data],
  );
  const expenseList = useMemo(
    () => (live ? (expensesQuery.data ?? []).map(fromApiExpense) : []),
    [live, expensesQuery.data],
  );
  const subscriptionList = useMemo(
    () => (live ? (subscriptionsQuery.data ?? []).map(fromApiSubscription) : []),
    [live, subscriptionsQuery.data],
  );
  // Real workspaces only show real records; sections not yet on the API stay empty rather than borrowing demo data.
  // Projects only ever come from the API — never demo data, not even while sign-in is being checked.
  const invitations = useMemo(
    () => (invitationsQuery.data ?? []).map(fromApiInvitation),
    [invitationsQuery.data],
  );
  const data: WorkspaceData = {
    ...activeWorkspace.data,
    projects: live ? liveProjects : [],
    // A shared task's work is counted on each person's sub-task.
    tasks: taskList.filter((t) => !t.subtasks.length).map(toTaskTuple),
    clients: clientList.map(toClientTuple),
    team: live ? members.map(toTeamTuple) : [],
    expenses: expenseList.map(toExpenseTuple),
    subscriptions: subscriptionList.map(toSubscriptionCard),
    timeEntries: timeList.map(toTimeTuple),
  };
  const projectsState: LoadState = live
    ? {
        loading: workspacesQuery.isPending || (allowed.projects && projectsQuery.isPending),
        error: workspacesQuery.error
          ? errorText(workspacesQuery.error)
          : projectsQuery.error
            ? errorText(projectsQuery.error)
            : null,
        retry: () => {
          void workspacesQuery.refetch();
          void projectsQuery.refetch();
        },
      }
    : { loading: authStatus === "loading", error: null, retry: () => {} };
  const tasksState: LoadState = live
    ? {
        loading: workspacesQuery.isPending || (allowed.tasks && tasksQuery.isPending),
        error: workspacesQuery.error
          ? errorText(workspacesQuery.error)
          : tasksQuery.error
            ? errorText(tasksQuery.error)
            : null,
        retry: () => {
          void workspacesQuery.refetch();
          void tasksQuery.refetch();
        },
      }
    : { loading: authStatus === "loading", error: null, retry: () => {} };
  const clientsState: LoadState = live
    ? {
        loading: workspacesQuery.isPending || (allowed.clients && clientsQuery.isPending),
        error: workspacesQuery.error
          ? errorText(workspacesQuery.error)
          : clientsQuery.error
            ? errorText(clientsQuery.error)
            : null,
        retry: () => {
          void workspacesQuery.refetch();
          void clientsQuery.refetch();
        },
      }
    : { loading: authStatus === "loading", error: null, retry: () => {} };
  const teamState: LoadState = live
    ? {
        loading: workspacesQuery.isPending || (allowed.members && membersQuery.isPending),
        error: workspacesQuery.error
          ? errorText(workspacesQuery.error)
          : membersQuery.error
            ? errorText(membersQuery.error)
            : null,
        retry: () => {
          void workspacesQuery.refetch();
          void membersQuery.refetch();
          void invitationsQuery.refetch();
        },
      }
    : { loading: authStatus === "loading", error: null, retry: () => {} };
  async function saveMember(slug: string, update: MemberUpdate) {
    if (apiWid === null) throw notSignedIn();
    const saved = await membersApi.update(apiWid, slug, update);
    queryClient.setQueryData<ApiMember[]>(["members", apiWid], (l) =>
      l?.map((m) => (m.slug === slug ? saved : m)),
    );
    return fromApiMember(saved);
  }
  async function removeMember(slug: string) {
    if (apiWid === null) throw notSignedIn();
    await membersApi.remove(apiWid, slug);
    queryClient.setQueryData<ApiMember[]>(["members", apiWid], (l) =>
      l?.filter((m) => m.slug !== slug),
    );
    void queryClient.invalidateQueries({ queryKey: ["tasks", apiWid] });
  }
  async function inviteMember(input: InvitationCreate) {
    if (apiWid === null) throw notSignedIn();
    const sent = await invitationsApi.create(apiWid, input);
    void queryClient.invalidateQueries({ queryKey: ["invitations", apiWid] });
    return fromApiInvitation(sent);
  }
  async function resendInvitation(id: number) {
    if (apiWid === null) throw notSignedIn();
    const sent = await invitationsApi.resend(apiWid, id);
    void queryClient.invalidateQueries({ queryKey: ["invitations", apiWid] });
    return fromApiInvitation(sent);
  }
  async function cancelInvitation(id: number) {
    if (apiWid === null) throw notSignedIn();
    await invitationsApi.cancel(apiWid, id);
    queryClient.setQueryData<ApiInvitation[]>(["invitations", apiWid], (l) =>
      l?.filter((i) => i.id !== id),
    );
  }
  /** Join a workspace from an invite link, then make it the active workspace. */
  async function acceptInvitation(token: string) {
    const joined = fromApiWorkspace(await inviteLinkApi.accept(token));
    await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    switchWorkspace(joined.id);
    return joined;
  }
  const notSignedIn = () => new Error("Sign in to make changes.");
  async function saveProject(input: ProjectInput, slug?: string): Promise<Project> {
    if (apiWid === null) throw notSignedIn();
    const saved = fromApiProject(
      slug
        ? await projectsApi.update(apiWid, slug, toApiProject(input))
        : await projectsApi.create(apiWid, toApiProject(input)),
    );
    void queryClient.invalidateQueries({ queryKey: ["projects", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["clients", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["tasks", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["expenses", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["subscriptions", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["time", apiWid] });
    return saved;
  }
  async function deleteProject(slug: string) {
    if (apiWid === null) throw notSignedIn();
    await projectsApi.remove(apiWid, slug);
    queryClient.setQueryData<ApiProject[]>(["projects", apiWid], (l) =>
      l?.filter((p) => p.slug !== slug),
    );
    void queryClient.invalidateQueries({ queryKey: ["tasks", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["clients", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["expenses", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["subscriptions", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["time", apiWid] });
  }
  async function saveClient(input: ClientInput, slug?: string): Promise<ClientItem> {
    if (apiWid === null) throw notSignedIn();
    const saved = await (slug
      ? clientsApi.update(apiWid, slug, toApiClient(input))
      : clientsApi.create(apiWid, toApiClient(input)));
    void queryClient.invalidateQueries({ queryKey: ["clients", apiWid] });
    // Renaming a client changes the client name shown on its projects.
    if (slug) void queryClient.invalidateQueries({ queryKey: ["projects", apiWid] });
    return fromApiClient(saved);
  }
  async function deleteClient(slug: string) {
    if (apiWid === null) throw notSignedIn();
    await clientsApi.remove(apiWid, slug);
    queryClient.setQueryData<ApiClient[]>(["clients", apiWid], (l) =>
      l?.filter((c) => c.slug !== slug),
    );
  }
  const expensesState: LoadState = live
    ? {
        loading:
          workspacesQuery.isPending ||
          (allowed.expenses && (expensesQuery.isPending || subscriptionsQuery.isPending)),
        error: workspacesQuery.error
          ? errorText(workspacesQuery.error)
          : expensesQuery.error
            ? errorText(expensesQuery.error)
            : subscriptionsQuery.error
              ? errorText(subscriptionsQuery.error)
              : null,
        retry: () => {
          void workspacesQuery.refetch();
          void expensesQuery.refetch();
          void subscriptionsQuery.refetch();
        },
      }
    : { loading: authStatus === "loading", error: null, retry: () => {} };
  const timeState: LoadState = live
    ? {
        loading: workspacesQuery.isPending || (allowed.time && timeQuery.isPending),
        error: workspacesQuery.error
          ? errorText(workspacesQuery.error)
          : timeQuery.error
            ? errorText(timeQuery.error)
            : null,
        retry: () => {
          void workspacesQuery.refetch();
          void timeQuery.refetch();
        },
      }
    : { loading: authStatus === "loading", error: null, retry: () => {} };
  const canManageTime = activeWorkspace.role === "Employer" && can("time", "edit");
  async function saveTime(input: TimeEntryWrite, slug?: string) {
    if (apiWid === null) throw notSignedIn();
    const saved = await (slug
      ? timeApi.update(apiWid, slug, input)
      : timeApi.create(apiWid, input));
    queryClient.setQueryData<ApiTimeEntry[]>(
      ["time", apiWid],
      (l) => l && (slug ? l.map((e) => (e.slug === slug ? saved : e)) : [saved, ...l]),
    );
    return fromApiTime(saved);
  }
  async function deleteTime(slug: string) {
    if (apiWid === null) throw notSignedIn();
    await timeApi.remove(apiWid, slug);
    queryClient.setQueryData<ApiTimeEntry[]>(["time", apiWid], (l) =>
      l?.filter((e) => e.slug !== slug),
    );
  }
  const canReviewExpenses = can("expenses", "edit") && can("financials");
  const putExpense = (saved: ApiExpense, slug?: string) =>
    queryClient.setQueryData<ApiExpense[]>(
      ["expenses", apiWid],
      (l) => l && (slug ? l.map((e) => (e.slug === slug ? saved : e)) : [saved, ...l]),
    );
  async function saveExpense(input: ExpenseWrite, slug?: string) {
    if (apiWid === null) throw notSignedIn();
    const saved = await (slug
      ? expensesApi.update(apiWid, slug, input)
      : expensesApi.create(apiWid, input));
    putExpense(saved, slug);
    return fromApiExpense(saved);
  }
  async function deleteExpense(slug: string) {
    if (apiWid === null) throw notSignedIn();
    await expensesApi.remove(apiWid, slug);
    queryClient.setQueryData<ApiExpense[]>(["expenses", apiWid], (l) =>
      l?.filter((e) => e.slug !== slug),
    );
  }
  async function reviewExpense(slug: string, approve: boolean, reason = "") {
    if (apiWid === null) throw notSignedIn();
    const saved = await (approve
      ? expensesApi.approve(apiWid, slug)
      : expensesApi.reject(apiWid, slug, reason));
    putExpense(saved, slug);
    return fromApiExpense(saved);
  }
  // Saving a subscription can record due renewals as expenses, so refresh those too.
  async function saveSubscription(input: SubscriptionWrite, slug?: string) {
    if (apiWid === null) throw notSignedIn();
    const saved = await (slug
      ? subscriptionsApi.update(apiWid, slug, input)
      : subscriptionsApi.create(apiWid, input));
    void queryClient.invalidateQueries({ queryKey: ["subscriptions", apiWid] });
    void queryClient.invalidateQueries({ queryKey: ["expenses", apiWid] });
    return fromApiSubscription(saved);
  }
  async function deleteSubscription(slug: string) {
    if (apiWid === null) throw notSignedIn();
    await subscriptionsApi.remove(apiWid, slug);
    queryClient.setQueryData<ApiSubscription[]>(["subscriptions", apiWid], (l) =>
      l?.filter((s) => s.slug !== slug),
    );
    void queryClient.invalidateQueries({ queryKey: ["expenses", apiWid] });
  }
  async function saveTask(input: TaskInput, slug?: string): Promise<TaskItem> {
    if (apiWid === null) throw notSignedIn();
    const saved = await (slug
      ? tasksApi.update(apiWid, slug, toApiTask(input))
      : tasksApi.create(apiWid, toApiTask(input)));
    queryClient.setQueryData<ApiTask[]>(["tasks", apiWid], (l) =>
      slug ? l?.map((t) => (t.slug === slug ? saved : t)) : l && [...l, saved],
    );
    void queryClient.invalidateQueries({ queryKey: ["tasks", apiWid] });
    return fromApiTask(saved);
  }
  async function uploadTaskImage(image: File): Promise<string> {
    if (apiWid === null) throw notSignedIn();
    return (await tasksApi.uploadImage(apiWid, image)).url;
  }
  async function deleteTask(slug: string) {
    if (apiWid === null) throw notSignedIn();
    await tasksApi.remove(apiWid, slug);
    queryClient.setQueryData<ApiTask[]>(["tasks", apiWid], (l) =>
      l?.filter((t) => t.slug !== slug),
    );
    void queryClient.invalidateQueries({ queryKey: ["time", apiWid] });
  }
  /** Board drag-and-drop: show the new status immediately, roll back if the save fails. */
  async function moveTask(slug: string, status: TaskStatus) {
    if (apiWid === null) throw notSignedIn();
    const key = ["tasks", apiWid];
    const before = queryClient.getQueryData<ApiTask[]>(key);
    queryClient.setQueryData<ApiTask[]>(key, (l) =>
      l?.map((t) => (t.slug === slug ? { ...t, status } : t)),
    );
    try {
      const saved = await tasksApi.update(apiWid, slug, { status });
      queryClient.setQueryData<ApiTask[]>(key, (l) => l?.map((t) => (t.slug === slug ? saved : t)));
      // The shared task's status follows its sub-tasks.
      if (saved.parent) void queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      queryClient.setQueryData(key, before);
      throw e;
    }
  }
  /** Change one task's due date, e.g. one person's part of a shared task. */
  async function rescheduleTask(slug: string, dueDate: string) {
    if (apiWid === null) throw notSignedIn();
    await tasksApi.update(apiWid, slug, { due_date: dueDate || null });
    await queryClient.invalidateQueries({ queryKey: ["tasks", apiWid] });
  }
  const updateData = (update: (data: WorkspaceData) => WorkspaceData) =>
    setWorkspaces((current) =>
      current.map((w) => (w.id === wid ? { ...w, data: update(w.data) } : w)),
    );
  const createWorkspace = (input: WorkspaceInput) => {
    if (live) {
      workspacesApi
        .create(input)
        .then((w) => {
          void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
          switchWorkspace(String(w.id));
        })
        .catch((e) => toast.error(errorText(e)));
      return;
    }
    const id = `workspace-${Date.now()}`;
    const workspace: Workspace = {
      id,
      name: input.name,
      industry: input.industry,
      currency: input.currency,
      timezone: input.timezone,
      workingDays: "mon_fri",
      role: "Employer",
      data: emptyData(),
    };
    setWorkspaces((current) => [...current, workspace]);
    setActiveId(id);
  };
  const updateWorkspace = async (id: string, patch: WorkspacePatch) => {
    if (live) {
      const { workingDays, defaultHourlyRate, weeklyHours, targetMargin, ...rest } = patch;
      const saved = await workspacesApi.update(Number(id), {
        ...rest,
        ...(workingDays && { working_days: workingDays }),
        ...(defaultHourlyRate !== undefined && { default_hourly_rate: defaultHourlyRate }),
        ...(weeklyHours !== undefined && { weekly_hours: weeklyHours }),
        ...(targetMargin !== undefined && { target_margin: targetMargin }),
      });
      queryClient.setQueryData<ApiWorkspace[]>(["workspaces", user?.id], (current) =>
        current?.map((w) => (w.id === saved.id ? { ...w, ...saved } : w)),
      );
      return;
    }
    setWorkspaces((current) => current.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };
  const deleteWorkspace = async (id: string) => {
    const next = visibleWorkspaces.find((w) => w.id !== id);
    if (live) {
      await workspacesApi.remove(Number(id));
      queryClient.setQueryData<ApiWorkspace[]>(["workspaces", user?.id], (current) =>
        current?.filter((w) => String(w.id) !== id),
      );
      // The list endpoint gives a user left with no workspace a fresh default one.
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      if (next) switchWorkspace(next.id);
      return;
    }
    if (!next) throw new Error("You need at least one workspace.");
    setWorkspaces((current) => current.filter((w) => w.id !== id));
    setActiveId(next.id);
  };
  const notificationList = apiNotifications.map(fromApiNotification);
  return (
    <C.Provider
      value={{
        ...data,
        workspaces: visibleWorkspaces,
        activeWorkspace,
        workspacesLoading: live && workspacesQuery.isPending,
        employeeOnly:
          live && activeWorkspace.id !== "loading" && activeWorkspace.role === "Employee",
        switchWorkspace,
        createWorkspace,
        deleteWorkspace,
        updateWorkspace,
        live,
        can,
        canManageTeam,
        invitations,
        teamState,
        saveMember,
        removeMember,
        inviteMember,
        resendInvitation,
        cancelInvitation,
        acceptInvitation,
        projectsState,
        saveProject,
        deleteProject,
        timeList,
        timeState,
        canManageTime,
        saveTime,
        deleteTime,
        expenseList,
        subscriptionList,
        expensesState,
        canReviewExpenses,
        saveExpense,
        deleteExpense,
        reviewExpense,
        saveSubscription,
        deleteSubscription,
        taskList,
        tasksState,
        members,
        saveTask,
        uploadTaskImage,
        deleteTask,
        moveTask,
        rescheduleTask,
        clientList,
        clientsState,
        saveClient,
        deleteClient,
        notifications: unreadQuery.data ?? notificationList.filter((n) => !n.read).length,
        markRead,
        notificationList,
        readNotification,
        apiNotifications,
        notificationsState,
        unreadNotification,
        deleteNotification,
        need,
        chatConversations,
        chatUnread: chatConversations.reduce((n, c) => n + c.unread, 0),
        chatState,
        canCreateGroups:
          live && activeWorkspace.id !== "loading" && activeWorkspace.role !== "Employee",
        profile,
        updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
        authStatus,
        user,
        signInWithGoogle: async (credential) => {
          const { user: u } = await authApi.google(credential);
          signedIn(u);
          return u;
        },
        signIn: async (email, password) => {
          const { user: u } = await authApi.login(email, password);
          signedIn(u);
          return u;
        },
        completeSignIn: signedIn,
        changePassword: async (current, next) => {
          const { user: u } = await authApi.changePassword(current, next);
          setUser(u);
        },
        signOut: async () => {
          try {
            await authApi.logout();
          } finally {
            setUser(null);
            setAuthStatus("signedOut");
            queryClient.removeQueries();
          }
        },
        saveProfile: async (patch) => signedIn(await usersApi.update(patch)),
        uploadAvatar: async (image) => signedIn(await usersApi.uploadAvatar(image)),
        removeAvatar: async () => signedIn(await usersApi.removeAvatar()),
      }}
    >
      {children}
    </C.Provider>
  );
}
export function useMiniOps() {
  const c = useContext(C);
  if (!c) throw new Error("MiniOpsProvider missing");
  return c;
}
/** Load these lists while the calling component is mounted (e.g. search, quick-create dialogs). */
export function useNeeds(...keys: DataKey[]) {
  const { need } = useMiniOps();
  const id = keys.join();
  useEffect(() => need(id ? (id.split(",") as DataKey[]) : []), [need, id]);
}
/** Tags used on the workspace's tasks, most used first; for suggestions and filters. */
export function useTaskTags() {
  const { taskList } = useMiniOps();
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of taskList) for (const tag of t.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
  }, [taskList]);
}
