// MiniOps backend client (miniops-backend, Django REST Framework).
// Auth is JWT: a short-lived access token sent as `Authorization: Bearer <access>`,
// renewed with the refresh token when it expires (see miniops/users/auth.py).

import type { WorkingDays } from "./workspace-options";

export const API_URL = (
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000/api"
).replace(/\/$/, "");

const AUTH_KEY = "miniops.auth";
const LEGACY_TOKEN_KEY = "miniops.token"; // DRF token from before JWT
/** Fired on `window` when the session ends (refresh failed or signed out). */
export const SIGNED_OUT_EVENT = "miniops:signed-out";

export type TokenPair = { access: string; refresh: string };

export const tokenStore = {
  get(): TokenPair | null {
    try {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(AUTH_KEY);
      return raw ? (JSON.parse(raw) as TokenPair) : null;
    } catch {
      return null;
    }
  },
  set(tokens: TokenPair | null) {
    try {
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
      if (tokens) window.localStorage.setItem(AUTH_KEY, JSON.stringify(tokens));
      else window.localStorage.removeItem(AUTH_KEY);
    } catch {
      // Storage unavailable (private mode); the session just won't persist.
    }
  },
  clear() {
    const had = !!this.get();
    this.set(null);
    if (had && typeof window !== "undefined") window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
  },
};

/** Seconds until a JWT expires (reads its `exp` claim; no verification). */
function secondsLeft(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
    return Number(payload.exp) - Date.now() / 1000;
  } catch {
    return 0;
  }
}

let refreshing: Promise<string | null> | null = null;
/** Swap the refresh token for a new pair (once at a time). Null if the session is over. */
function refreshAccess(): Promise<string | null> {
  return (refreshing ??= (async () => {
    const tokens = tokenStore.get();
    if (!tokens?.refresh) return null;
    try {
      const res = await fetch(`${API_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });
      if (!res.ok) {
        if (res.status === 400 || res.status === 401) tokenStore.clear();
        return null;
      }
      const data = (await res.json()) as Partial<TokenPair>;
      const next = { access: data.access!, refresh: data.refresh ?? tokens.refresh };
      tokenStore.set(next);
      return next.access;
    } catch {
      return null; // offline: keep the tokens and try again later
    } finally {
      refreshing = null;
    }
  })());
}

/** A usable access token, refreshed first if it's about to expire. */
export async function getAccessToken(): Promise<string | null> {
  const tokens = tokenStore.get();
  if (!tokens) return null;
  if (secondsLeft(tokens.access) > 30) return tokens.access;
  return refreshAccess();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
  }
}

/** Machine-readable `code` from a DRF error body (e.g. "email_not_verified"). */
export function errorCode(error: unknown): string | null {
  const data =
    error instanceof ApiError ? (error.data as Record<string, unknown> | undefined) : undefined;
  const code = data?.["code"];
  return typeof code === "string"
    ? code
    : Array.isArray(code) && typeof code[0] === "string"
      ? code[0]
      : null;
}

/** Field errors from a DRF 400 (`{field: [messages]}`), for showing under inputs. */
export function fieldErrors(error: unknown): Record<string, string> {
  const data = error instanceof ApiError ? error.data : undefined;
  const out: Record<string, string> = {};
  if (data && typeof data === "object")
    for (const [k, v] of Object.entries(data as Record<string, unknown>))
      if (Array.isArray(v) && typeof v[0] === "string") out[k] = v.join(" ");
  return out;
}

/** First readable message from a DRF error body (`detail` or field errors). */
function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d["detail"] === "string") return d["detail"];
    for (const value of Object.values(d)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return fallback;
}

/** Auth endpoints that must not send (or refresh) the user's tokens. */
const PUBLIC_AUTH =
  /^\/auth\/(google|register|verify-email|login|token|logout|password\/(forgot|reset))\//;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const authed = !PUBLIC_AUTH.test(path);
  const send = async (token: string | null) => {
    if (token) headers.set("Authorization", `Bearer ${token}`);
    try {
      return await fetch(`${API_URL}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(0, "Can't reach the MiniOps server. Is the backend running?");
    }
  };

  let response = await send(authed ? await getAccessToken() : null);
  if (response.status === 401 && authed && tokenStore.get()) {
    // The access token expired or was revoked: renew once and retry.
    const fresh = await refreshAccess();
    if (fresh) response = await send(fresh);
    if (response.status === 401) tokenStore.clear();
  }
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      errorMessage(data, `Request failed (${response.status})`),
      data,
    );
  }
  return data as T;
}

/** Paginated list response from every list endpoint (`?page=&page_size=`). */
export type Page<T> = {
  count: number;
  total_pages: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

const MAX_PAGE_SIZE = 100;

/** Fetch every page of a list endpoint: first page, then the rest in parallel. */
export async function listAll<T>(path: string): Promise<T[]> {
  const sep = path.includes("?") ? "&" : "?";
  const pageUrl = (page: number) => `${path}${sep}page_size=${MAX_PAGE_SIZE}&page=${page}`;
  const first = await api<Page<T>>(pageUrl(1));
  if (first.total_pages <= 1) return first.results;
  const rest = await Promise.all(
    Array.from({ length: first.total_pages - 1 }, (_, i) => api<Page<T>>(pageUrl(i + 2))),
  );
  return [first, ...rest].flatMap((page) => page.results);
}

export type ApiUser = {
  id: number;
  email: string;
  name: string;
  title: string;
  phone: string;
  timezone: string;
  avatar_url: string | null;
  auth_provider: "email" | "google";
  email_verified: boolean;
  /** False for Google-only accounts; they can set a password without the current one. */
  has_password: boolean;
  date_joined: string;
};

export type AuthResponse = TokenPair & { user: ApiUser };
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export type ProfilePatch = Partial<Pick<ApiUser, "name" | "title" | "phone" | "timezone">>;

export const authApi = {
  async google(credential: string) {
    const res = await api<AuthResponse & { created: boolean }>(
      "/auth/google/",
      post({ credential }),
    );
    tokenStore.set(res);
    return res;
  },
  /** Creates the account and emails a confirmation link; no session yet. */
  register: (input: { name: string; email: string; password: string; next?: string }) =>
    api<{ detail: string }>("/auth/register/", post(input)),
  async login(email: string, password: string) {
    const res = await api<AuthResponse>("/auth/login/", post({ email, password }));
    tokenStore.set(res);
    return res;
  },
  /** Confirms the email. The first time it also signs in (returns tokens). */
  async verifyEmail(token: string) {
    const res = await api<Partial<AuthResponse> & { already_verified: boolean }>(
      "/auth/verify-email/",
      post({ token }),
    );
    if (res.access && res.refresh) tokenStore.set({ access: res.access, refresh: res.refresh });
    return res;
  },
  resendVerification: (email: string, next?: string) =>
    api<{ detail: string }>("/auth/verify-email/resend/", post({ email, next })),
  forgotPassword: (email: string) =>
    api<{ detail: string }>("/auth/password/forgot/", post({ email })),
  async resetPassword(uid: string, token: string, password: string) {
    const res = await api<AuthResponse>("/auth/password/reset/", post({ uid, token, password }));
    tokenStore.set(res);
    return res;
  },
  /** Other sessions are signed out; this one gets new tokens. */
  async changePassword(currentPassword: string, newPassword: string) {
    const res = await api<AuthResponse>(
      "/auth/password/change/",
      post({ current_password: currentPassword, new_password: newPassword }),
    );
    tokenStore.set(res);
    return res;
  },
  async logout() {
    const refresh = tokenStore.get()?.refresh;
    try {
      if (refresh) await api<void>("/auth/logout/", post({ refresh }));
    } finally {
      tokenStore.set(null);
    }
  },
};

let pendingMe: Promise<ApiUser> | null = null;

export const usersApi = {
  /** Shares one in-flight request, so startup doesn't ask twice. */
  me: () =>
    (pendingMe ??= api<ApiUser>("/users/me/").finally(() => {
      pendingMe = null;
    })),
  update: (patch: ProfilePatch) =>
    api<ApiUser>("/users/me/", { method: "PATCH", body: JSON.stringify(patch) }),
  uploadAvatar(image: Blob) {
    const body = new FormData();
    body.append("avatar", image, "avatar.jpg");
    return api<ApiUser>("/users/me/", { method: "PATCH", body });
  },
  removeAvatar: () =>
    api<ApiUser>("/users/me/", { method: "PATCH", body: JSON.stringify({ avatar: null }) }),
};

export type WorkspaceRole = "employer" | "employee";
export const WORKSPACE_ROLES: WorkspaceRole[] = ["employer", "employee"];

/** Access levels per module, enforced by the backend (see miniops/workspaces/permissions.py). */
export type AccessLevel = "none" | "view" | "edit";
export type PermissionModule =
  "projects" | "tasks" | "clients" | "time" | "expenses" | "reports" | "financials";
export type PermissionMap = Record<PermissionModule, AccessLevel>;
export type PermissionCatalogEntry = {
  key: PermissionModule;
  label: string;
  description: string;
  levels: AccessLevel[];
  defaults: Record<WorkspaceRole, AccessLevel>;
};

export type ApiWorkspace = {
  id: number;
  name: string;
  industry: string;
  currency: string;
  timezone: string;
  working_days: WorkingDays;
  /** Left out unless the current user can see financials. */
  default_hourly_rate?: number | null;
  weekly_hours: number;
  target_margin: number;
  role: WorkspaceRole;
  /** The current user's access in this workspace. */
  permissions: PermissionMap;
  member_slug: string;
  created_at: string;
};

export const CLIENT_STATUSES = ["Active", "Paused", "Former"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export type ApiClient = {
  slug: string;
  name: string;
  industry: string;
  status: ClientStatus;
  contact_name: string;
  email: string;
  phone: string;
  notes: string;
  /** Roll-ups across the client's projects. */
  project_count: number;
  active_projects: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  health: "Healthy" | "Attention" | "At Risk" | "Loss" | "No data";
  created_at: string;
  updated_at: string;
};

export type ClientWrite = Partial<
  Pick<ApiClient, "name" | "industry" | "status" | "contact_name" | "email" | "phone" | "notes">
>;

export const PROJECT_STATUSES = [
  "Planning",
  "Active",
  "On Hold",
  "Completed",
  "Cancelled",
] as const;
export const PROJECT_TYPES = [
  "Website",
  "Branding",
  "Web app",
  "Marketing",
  "Retainer",
  "Other",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectType = (typeof PROJECT_TYPES)[number];

export type ApiProject = {
  slug: string;
  name: string;
  client: string | null;
  client_name: string;
  project_type: ProjectType;
  status: ProjectStatus;
  description: string;
  /** Money fields are absent without the financials permission. */
  revenue: number;
  budget: number;
  cost: number;
  profit: number;
  margin: number;
  budget_used: number;
  progress: number;
  health: "Healthy" | "Attention" | "At Risk" | "Loss";
  start_date: string | null;
  end_date: string | null;
  team: number[];
  created_at: string;
  updated_at: string;
};

/** Writable project fields. Link a client by `client` (slug); `client_name` creates one. */
export type ProjectWrite = Partial<
  Pick<
    ApiProject,
    | "name"
    | "project_type"
    | "status"
    | "description"
    | "revenue"
    | "budget"
    | "cost"
    | "progress"
    | "start_date"
    | "end_date"
  >
> & {
  /** Existing client slug, or null for none. */
  client?: string | null;
  /** Creates a new client with this name (names aren't unique). */
  client_name?: string;
};

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const workspacesApi = {
  list: () => listAll<ApiWorkspace>("/workspaces/"),
  create: (input: Pick<ApiWorkspace, "name" | "industry" | "currency" | "timezone">) =>
    api<ApiWorkspace>("/workspaces/", json("POST", input)),
  update: (
    workspaceId: number,
    input: Partial<
      Pick<
        ApiWorkspace,
        | "name"
        | "industry"
        | "currency"
        | "timezone"
        | "working_days"
        | "default_hourly_rate"
        | "weekly_hours"
        | "target_margin"
      >
    >,
  ) => api<ApiWorkspace>(`/workspaces/${workspaceId}/`, json("PATCH", input)),
  remove: (workspaceId: number) => api<void>(`/workspaces/${workspaceId}/`, { method: "DELETE" }),
};

export const clientsApi = {
  list: (workspaceId: number) => listAll<ApiClient>(`/workspaces/${workspaceId}/clients/`),
  create: (workspaceId: number, input: ClientWrite) =>
    api<ApiClient>(`/workspaces/${workspaceId}/clients/`, json("POST", input)),
  update: (workspaceId: number, slug: string, input: ClientWrite) =>
    api<ApiClient>(`/workspaces/${workspaceId}/clients/${slug}/`, json("PATCH", input)),
  remove: (workspaceId: number, slug: string) =>
    api<void>(`/workspaces/${workspaceId}/clients/${slug}/`, { method: "DELETE" }),
};

export const projectsApi = {
  list: (workspaceId: number) => listAll<ApiProject>(`/workspaces/${workspaceId}/projects/`),
  create: (workspaceId: number, input: ProjectWrite) =>
    api<ApiProject>(`/workspaces/${workspaceId}/projects/`, json("POST", input)),
  update: (workspaceId: number, slug: string, input: ProjectWrite) =>
    api<ApiProject>(`/workspaces/${workspaceId}/projects/${slug}/`, json("PATCH", input)),
  remove: (workspaceId: number, slug: string) =>
    api<void>(`/workspaces/${workspaceId}/projects/${slug}/`, { method: "DELETE" }),
};

export type ApiMember = {
  slug: string;
  /** User ID (task assignees use it). */
  id: number;
  name: string;
  email: string;
  title: string;
  avatar_url: string | null;
  role: WorkspaceRole;
  permissions: PermissionMap;
  /** True when permissions differ from the role's defaults. */
  customized: boolean;
  /** Absent without the financials permission (except your own). */
  hourly_cost?: number | null;
  weekly_capacity: number;
  invited_by_name: string;
  is_me: boolean;
  joined_at: string;
};

export type MemberUpdate = {
  role?: WorkspaceRole;
  permissions?: Partial<PermissionMap>;
  hourly_cost?: number | null;
  weekly_capacity?: number;
};

export const membersApi = {
  list: (workspaceId: number) => listAll<ApiMember>(`/workspaces/${workspaceId}/members/`),
  update: (workspaceId: number, slug: string, input: MemberUpdate) =>
    api<ApiMember>(`/workspaces/${workspaceId}/members/${slug}/`, json("PATCH", input)),
  remove: (workspaceId: number, slug: string) =>
    api<void>(`/workspaces/${workspaceId}/members/${slug}/`, { method: "DELETE" }),
};

export type InvitationStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

export type ApiInvitation = {
  id: number;
  email: string;
  role: WorkspaceRole;
  permissions: PermissionMap;
  message: string;
  status: InvitationStatus;
  invited_by_name: string;
  created_at: string;
  sent_at: string | null;
  expires_at: string;
  responded_at: string | null;
  /** The emailed link; only returned when the invitation is sent or resent. */
  invite_url?: string;
};

export type InvitationCreate = {
  email: string;
  role: WorkspaceRole;
  /** Changes from the role's defaults. */
  permissions?: Partial<PermissionMap>;
  message?: string;
};

export const invitationsApi = {
  list: (workspaceId: number) => listAll<ApiInvitation>(`/workspaces/${workspaceId}/invitations/`),
  create: (workspaceId: number, input: InvitationCreate) =>
    api<ApiInvitation>(`/workspaces/${workspaceId}/invitations/`, json("POST", input)),
  resend: (workspaceId: number, id: number) =>
    api<ApiInvitation>(`/workspaces/${workspaceId}/invitations/${id}/resend/`, {
      method: "POST",
    }),
  cancel: (workspaceId: number, id: number) =>
    api<ApiInvitation>(`/workspaces/${workspaceId}/invitations/${id}/cancel/`, {
      method: "POST",
    }),
};

/** What an invite link shows to whoever holds it. */
export type PublicInvitation = {
  workspace: string;
  email: string;
  role: WorkspaceRole;
  message: string;
  invited_by_name: string;
  status: InvitationStatus;
  expires_at: string;
};

export const inviteLinkApi = {
  get: (token: string) => api<PublicInvitation>(`/invitations/${encodeURIComponent(token)}/`),
  /** Signed-in user's email must match the invitation. Returns the joined workspace. */
  accept: (token: string) =>
    api<ApiWorkspace>(`/invitations/${encodeURIComponent(token)}/accept/`, { method: "POST" }),
  decline: (token: string) =>
    api<void>(`/invitations/${encodeURIComponent(token)}/decline/`, { method: "POST" }),
};

export const permissionsApi = {
  catalog: () => api<PermissionCatalogEntry[]>("/permissions/"),
};

export const TASK_STATUSES = ["To Do", "In Progress", "In Review", "Done"] as const;
export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type ApiTask = {
  slug: string;
  title: string;
  description: string;
  project: string | null;
  project_name: string;
  assignee: number | null;
  assignee_name: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  is_overdue: boolean;
  created_by_name: string;
  created_by_me: boolean;
  /** Leads: any task; others: tasks assigned to them or that they created. */
  can_edit: boolean;
  /** Leads: any task; others: only tasks they created. */
  can_delete: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiTaskImage = { id: number; url: string; created_at: string };

/** Writable task fields; `project` is a project slug, `assignee` a member's user ID. */
export type TaskWrite = Partial<
  Pick<
    ApiTask,
    "title" | "description" | "project" | "assignee" | "priority" | "status" | "due_date"
  >
>;

export const tasksApi = {
  list: (workspaceId: number) => listAll<ApiTask>(`/workspaces/${workspaceId}/tasks/`),
  create: (workspaceId: number, input: TaskWrite) =>
    api<ApiTask>(`/workspaces/${workspaceId}/tasks/`, json("POST", input)),
  update: (workspaceId: number, slug: string, input: TaskWrite) =>
    api<ApiTask>(`/workspaces/${workspaceId}/tasks/${slug}/`, json("PATCH", input)),
  remove: (workspaceId: number, slug: string) =>
    api<void>(`/workspaces/${workspaceId}/tasks/${slug}/`, { method: "DELETE" }),
  /** An image for a task description (PNG, JPEG, GIF or WebP, up to 10 MB). */
  uploadImage(workspaceId: number, image: File) {
    const body = new FormData();
    body.append("image", image);
    return api<ApiTaskImage>(`/workspaces/${workspaceId}/tasks/images/`, { method: "POST", body });
  },
};

export const EXPENSE_CATEGORIES = [
  "Software",
  "Hosting",
  "Contractor",
  "Travel",
  "Equipment",
  "Marketing",
  "Office",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export const BILLING_CYCLES = ["Monthly", "Quarterly", "Yearly", "One Time"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];
export const SUBSCRIPTION_STATUSES = ["Active", "Paused", "Cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type ApiExpense = {
  slug: string;
  title: string;
  category: ExpenseCategory;
  /** Project slug; null = agency overhead. */
  project: string | null;
  project_name: string;
  amount: number;
  date: string;
  vendor: string;
  notes: string;
  receipt_url: string | null;
  receipt_name: string;
  /** Subscription slug when this is a recorded renewal. */
  subscription: string | null;
  subscription_name: string;
  is_recurring: boolean;
  status: ExpenseStatus;
  rejection_reason: string;
  submitted_by_name: string;
  reviewed_by_name: string;
  reviewed_at: string | null;
  is_mine: boolean;
  /** Whether the current user may change or delete it. */
  can_edit: boolean;
  created_at: string;
};

export type ExpenseWrite = {
  title: string;
  category: ExpenseCategory;
  project: string | null;
  amount: string;
  date: string;
  vendor: string;
  notes: string;
  /** A new file to upload, null to remove the current one, undefined to keep it. */
  receipt?: File | null;
};

/**
 * JSON normally; multipart when `file` is a new upload. `file` null removes the
 * current one, undefined keeps it.
 */
function bodyWithFile(
  method: string,
  fields: Record<string, string | null>,
  key: string,
  file: File | null | undefined,
): RequestInit {
  if (!(file instanceof File)) {
    return json(method, file === null ? { ...fields, [key]: null } : fields);
  }
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.append(name, value ?? "");
  body.append(key, file);
  return { method, body };
}

const expenseBody = (method: string, { receipt, ...fields }: ExpenseWrite) =>
  bodyWithFile(method, fields, "receipt", receipt);

export const expensesApi = {
  list: (workspaceId: number) => listAll<ApiExpense>(`/workspaces/${workspaceId}/expenses/`),
  create: (workspaceId: number, input: ExpenseWrite) =>
    api<ApiExpense>(`/workspaces/${workspaceId}/expenses/`, expenseBody("POST", input)),
  update: (workspaceId: number, slug: string, input: ExpenseWrite) =>
    api<ApiExpense>(`/workspaces/${workspaceId}/expenses/${slug}/`, expenseBody("PATCH", input)),
  remove: (workspaceId: number, slug: string) =>
    api<void>(`/workspaces/${workspaceId}/expenses/${slug}/`, { method: "DELETE" }),
  approve: (workspaceId: number, slug: string) =>
    api<ApiExpense>(`/workspaces/${workspaceId}/expenses/${slug}/approve/`, { method: "POST" }),
  reject: (workspaceId: number, slug: string, reason: string) =>
    api<ApiExpense>(
      `/workspaces/${workspaceId}/expenses/${slug}/reject/`,
      json("POST", { reason }),
    ),
};

export type ApiSubscription = {
  slug: string;
  name: string;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  billing_cycle: BillingCycle;
  next_renewal: string;
  payment_method: string;
  status: SubscriptionStatus;
  project: string | null;
  project_name: string;
  notes: string;
  /** The uploaded invoice file, if any. */
  invoice_file_url: string | null;
  invoice_name: string;
  /** A link to the invoice in the vendor's billing portal. */
  invoice_url: string;
  /** 0 for a one-time purchase. */
  monthly_cost: number;
  annual_cost: number;
  renewal_count: number;
  created_at: string;
};

export type SubscriptionWrite = Pick<
  ApiSubscription,
  | "name"
  | "vendor"
  | "category"
  | "billing_cycle"
  | "next_renewal"
  | "payment_method"
  | "status"
  | "project"
  | "notes"
  | "invoice_url"
> & {
  /** Per billing cycle; the full price for a one-time purchase. */
  amount: string;
  /** A new invoice file to upload, null to remove the current one, undefined to keep it. */
  invoice?: File | null;
};

const subscriptionBody = (method: string, { invoice, ...fields }: Partial<SubscriptionWrite>) =>
  bodyWithFile(method, fields as Record<string, string | null>, "invoice", invoice);

export const subscriptionsApi = {
  list: (workspaceId: number) =>
    listAll<ApiSubscription>(`/workspaces/${workspaceId}/subscriptions/`),
  create: (workspaceId: number, input: SubscriptionWrite) =>
    api<ApiSubscription>(
      `/workspaces/${workspaceId}/subscriptions/`,
      subscriptionBody("POST", input),
    ),
  update: (workspaceId: number, slug: string, input: Partial<SubscriptionWrite>) =>
    api<ApiSubscription>(
      `/workspaces/${workspaceId}/subscriptions/${slug}/`,
      subscriptionBody("PATCH", input),
    ),
  remove: (workspaceId: number, slug: string) =>
    api<void>(`/workspaces/${workspaceId}/subscriptions/${slug}/`, { method: "DELETE" }),
};

export type ApiTimeEntry = {
  slug: string;
  /** User ID of who worked. */
  member: number;
  member_name: string;
  member_slug: string;
  /** Project slug; null = agency overhead. */
  project: string | null;
  project_name: string;
  task: string | null;
  task_title: string;
  date: string;
  /** "HH:MM:SS" or null. */
  start_time: string | null;
  hours: number;
  description: string;
  billable: boolean;
  /** Absent without the financials permission. */
  hourly_cost?: number | null;
  cost?: number | null;
  can_edit: boolean;
  created_at: string;
};

export type TimeEntryWrite = {
  /** Defaults to you; only employers may log for others. */
  member?: number;
  project: string | null;
  task: string | null;
  date: string;
  start_time: string | null;
  hours: string;
  description: string;
  billable: boolean;
};

export const timeApi = {
  list: (workspaceId: number) => listAll<ApiTimeEntry>(`/workspaces/${workspaceId}/time-entries/`),
  create: (workspaceId: number, input: TimeEntryWrite) =>
    api<ApiTimeEntry>(`/workspaces/${workspaceId}/time-entries/`, json("POST", input)),
  update: (workspaceId: number, slug: string, input: Partial<TimeEntryWrite>) =>
    api<ApiTimeEntry>(`/workspaces/${workspaceId}/time-entries/${slug}/`, json("PATCH", input)),
  remove: (workspaceId: number, slug: string) =>
    api<void>(`/workspaces/${workspaceId}/time-entries/${slug}/`, { method: "DELETE" }),
};

export type ActivityVerb =
  | "task.created"
  | "task.assigned"
  | "task.completed"
  | "task.reopened"
  | "task.started"
  | "task.in_review"
  | "time.logged"
  | "project.created"
  | "project.status"
  | "expense.submitted"
  | "expense.approved"
  | "expense.rejected"
  | "member.joined";

export type ApiActivity = {
  id: number;
  verb: ActivityVerb;
  verb_label: string;
  module: string;
  actor: number | null;
  actor_name: string;
  actor_slug: string;
  target_label: string;
  target_slug: string;
  project: string | null;
  project_name: string;
  /** Who the event is about (e.g. the assignee), when that isn't the actor. */
  subject: number | null;
  subject_name: string;
  detail: string;
  created_at: string;
};

export type ActivityQuery = {
  actor?: "me" | number;
  exclude_actor?: "me";
  subject?: "me";
  project?: string;
  page_size?: number;
};

export const activityApi = {
  /** One page (newest first) — feeds don't need the whole history. */
  list: (workspaceId: number, query: ActivityQuery = {}) => {
    const params = new URLSearchParams(
      Object.entries({ page_size: 50, ...query }).map(([k, v]) => [k, String(v)]),
    );
    return api<Page<ApiActivity>>(`/workspaces/${workspaceId}/activity/?${params}`).then(
      (page) => page.results,
    );
  },
};

export type NotificationKind = "task" | "time" | "expense" | "project" | "team";

/** What a notification links to; set by the backend (miniops/notifications/services.py). */
export type NotificationData = {
  kind?: NotificationKind;
  /** Preference category (see notificationPrefsApi). */
  category?: string;
  title?: string;
  detail?: string;
  module?: string;
  slug?: string;
  label?: string;
  project?: string;
  project_name?: string;
  actor_name?: string;
  due_date?: string;
};

export type ApiNotification = {
  id: number;
  /** Machine key, e.g. "task.assigned", "task.due_today", "expense.rejected". */
  verb: string;
  level: "success" | "info" | "warning" | "error";
  description: string;
  unread: boolean;
  timestamp: string;
  data: NotificationData;
};

export const notificationsApi = {
  /** Newest first; the latest page (up to 100) is enough for the bell and page. */
  list: (workspaceId: number, pageSize = 100) =>
    api<Page<ApiNotification>>(
      `/workspaces/${workspaceId}/notifications/?page_size=${pageSize}`,
    ).then((page) => page.results),
  unreadCount: (workspaceId: number) =>
    api<{ unread: number }>(`/workspaces/${workspaceId}/notifications/unread-count/`).then(
      (r) => r.unread,
    ),
  read: (workspaceId: number, id: number) =>
    api<ApiNotification>(`/workspaces/${workspaceId}/notifications/${id}/read/`, {
      method: "POST",
    }),
  unread: (workspaceId: number, id: number) =>
    api<ApiNotification>(`/workspaces/${workspaceId}/notifications/${id}/unread/`, {
      method: "POST",
    }),
  readAll: (workspaceId: number) =>
    api<{ marked: number }>(`/workspaces/${workspaceId}/notifications/read-all/`, {
      method: "POST",
    }),
  remove: (workspaceId: number, id: number) =>
    api<void>(`/workspaces/${workspaceId}/notifications/${id}/`, { method: "DELETE" }),
};

/** A kind of notification you can switch off (applies across workspaces). */
export type NotificationCategory = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

export const notificationPrefsApi = {
  get: () => api<NotificationCategory[]>("/notification-preferences/"),
  update: (changes: Record<string, boolean>) =>
    api<NotificationCategory[]>("/notification-preferences/", json("PATCH", changes)),
};

// ---- chat (miniops/chat) -------------------------------------------------------

export type ChatPerson = { id: number; name: string; email: string; avatar_url: string | null };

export type ApiMessage = {
  id: number;
  conversation: number;
  /** User ID; null if the author's account was deleted. */
  author: number | null;
  author_name: string;
  text: string;
  image_url: string | null;
  reply_to: {
    id: number;
    author_name: string;
    text: string;
    has_image: boolean;
    deleted: boolean;
  } | null;
  deleted: boolean;
  created_at: string;
};

export type ApiConversation = {
  id: number;
  kind: "direct" | "group";
  /** Group name, or the other person's name for a direct chat. */
  name: string;
  members: ChatPerson[];
  other_user: number | null;
  unread: number;
  last_message: ApiMessage | null;
  /** Owners, admins and managers manage groups. */
  can_manage: boolean;
  created_at: string;
  last_message_at: string | null;
};

export type MessagePage = { results: ApiMessage[]; has_more: boolean };

/** Media URLs from live pushes are relative (/media/...): resolve them against the API. */
export const mediaUrl = (url: string | null) =>
  url && url.startsWith("/") ? `${new URL(API_URL).origin}${url}` : url;

const chatBase = (workspaceId: number) => `/workspaces/${workspaceId}/chat/conversations`;

export const chatApi = {
  conversations: (workspaceId: number) => listAll<ApiConversation>(`${chatBase(workspaceId)}/`),
  direct: (workspaceId: number, userId: number) =>
    api<ApiConversation>(`${chatBase(workspaceId)}/direct/`, json("POST", { user: userId })),
  createGroup: (workspaceId: number, name: string, members: number[]) =>
    api<ApiConversation>(`${chatBase(workspaceId)}/`, json("POST", { name, members })),
  updateGroup: (workspaceId: number, id: number, patch: { name?: string; members?: number[] }) =>
    api<ApiConversation>(`${chatBase(workspaceId)}/${id}/`, json("PATCH", patch)),
  deleteGroup: (workspaceId: number, id: number) =>
    api<void>(`${chatBase(workspaceId)}/${id}/`, { method: "DELETE" }),
  read: (workspaceId: number, id: number) =>
    api<void>(`${chatBase(workspaceId)}/${id}/read/`, { method: "POST" }),
  /** Newest page (oldest first within it); pass `before` for earlier messages. */
  messages: (workspaceId: number, id: number, before?: number) =>
    api<MessagePage>(
      `${chatBase(workspaceId)}/${id}/messages/${before ? `?before=${before}` : ""}`,
    ),
  send(
    workspaceId: number,
    id: number,
    input: { text?: string; image?: File | null; replyTo?: number | null },
  ) {
    const path = `${chatBase(workspaceId)}/${id}/messages/`;
    if (input.image) {
      const body = new FormData();
      if (input.text) body.append("text", input.text);
      if (input.replyTo) body.append("reply_to", String(input.replyTo));
      body.append("image", input.image);
      return api<ApiMessage>(path, { method: "POST", body });
    }
    return api<ApiMessage>(
      path,
      json("POST", { text: input.text ?? "", reply_to: input.replyTo ?? null }),
    );
  },
  deleteMessage: (workspaceId: number, id: number, messageId: number) =>
    api<void>(`${chatBase(workspaceId)}/${id}/messages/${messageId}/`, { method: "DELETE" }),
};

export type ApiProjectFolder = {
  id: number;
  name: string;
  parent: number | null;
  /** This folder and its ancestors, top-level first. */
  path: { id: number; name: string }[];
  created_by_name: string;
  created_at: string;
};

export type ApiProjectFile = {
  id: number;
  name: string;
  url: string;
  folder: number | null;
  size: number;
  content_type: string;
  uploaded_by_name: string;
  created_at: string;
};

/** Bytes sent so far and the total, while a file uploads. */
export type UploadProgress = { loaded: number; total: number };

/** POST multipart form data with upload progress (fetch can't report it). */
async function uploadForm<T>(
  path: string,
  form: FormData,
  signal?: AbortSignal,
  onProgress?: (p: UploadProgress) => void,
): Promise<T> {
  const send = (token: string | null) =>
    new Promise<{ status: number; data: unknown }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}${path}`);
      xhr.setRequestHeader("Accept", "application/json");
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) =>
        onProgress?.({ loaded: e.loaded, total: e.lengthComputable ? e.total : 0 });
      xhr.onload = () => {
        let data: unknown;
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
        } catch {
          data = undefined;
        }
        resolve({ status: xhr.status, data });
      };
      xhr.onerror = () =>
        reject(new ApiError(0, "Can't reach the MiniOps server. Is the backend running?"));
      xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
      signal?.addEventListener("abort", () => xhr.abort(), { once: true });
      xhr.send(form);
    });

  let res = await send(await getAccessToken());
  if (res.status === 401 && tokenStore.get()) {
    const fresh = await refreshAccess();
    if (fresh) res = await send(fresh);
    if (res.status === 401) tokenStore.clear();
  }
  if (res.status < 200 || res.status >= 300)
    throw new ApiError(
      res.status,
      errorMessage(res.data, `Upload failed (${res.status})`),
      res.data,
    );
  return res.data as T;
}

export const projectFilesApi = {
  /** Folders and files directly inside `folder` (null = the project's top level). */
  folders: (workspaceId: number, project: string, folder: number | null) =>
    listAll<ApiProjectFolder>(
      `/workspaces/${workspaceId}/projects/${project}/folders/${folder ? `?folder=${folder}` : ""}`,
    ),
  files: (workspaceId: number, project: string, folder: number | null) =>
    listAll<ApiProjectFile>(
      `/workspaces/${workspaceId}/projects/${project}/files/${folder ? `?folder=${folder}` : ""}`,
    ),
  folder: (workspaceId: number, project: string, id: number) =>
    api<ApiProjectFolder>(`/workspaces/${workspaceId}/projects/${project}/folders/${id}/`),
  createFolder: (workspaceId: number, project: string, name: string, parent: number | null) =>
    api<ApiProjectFolder>(
      `/workspaces/${workspaceId}/projects/${project}/folders/`,
      json("POST", { name, parent }),
    ),
  renameFolder: (workspaceId: number, project: string, id: number, name: string) =>
    api<ApiProjectFolder>(
      `/workspaces/${workspaceId}/projects/${project}/folders/${id}/`,
      json("PATCH", { name }),
    ),
  removeFolder: (workspaceId: number, project: string, id: number) =>
    api<void>(`/workspaces/${workspaceId}/projects/${project}/folders/${id}/`, {
      method: "DELETE",
    }),
  upload: (
    workspaceId: number,
    project: string,
    file: File,
    folder: number | null,
    signal?: AbortSignal,
    onProgress?: (p: UploadProgress) => void,
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (folder) form.append("folder", String(folder));
    return uploadForm<ApiProjectFile>(
      `/workspaces/${workspaceId}/projects/${project}/files/`,
      form,
      signal,
      onProgress,
    );
  },
  renameFile: (workspaceId: number, project: string, id: number, name: string) =>
    api<ApiProjectFile>(
      `/workspaces/${workspaceId}/projects/${project}/files/${id}/`,
      json("PATCH", { name }),
    ),
  removeFile: (workspaceId: number, project: string, id: number) =>
    api<void>(`/workspaces/${workspaceId}/projects/${project}/files/${id}/`, {
      method: "DELETE",
    }),
};
