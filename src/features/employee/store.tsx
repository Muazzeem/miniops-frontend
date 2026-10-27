import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  activityApi,
  type ApiActivity,
  type ApiNotification,
  type TimeEntryWrite,
} from "@/lib/api";
import { fmtHours } from "@/lib/hours";
import { notificationKind, type NotificationDisplayKind } from "@/lib/notifications";
import {
  useMiniOps,
  type Member,
  type TaskInput,
  type TaskItem,
  type TimeItem,
} from "@/features/store";
import type { TaskStatus } from "@/lib/api";

/**
 * The employee area ("My work") is a personal view over the same workspace data
 * as the employer side: tasks assigned to me, my time, projects I work on, and
 * activity — straight from miniops-backend, with the same permissions. It never
 * shows money (rates, costs, revenue), whatever the person's role.
 */

export type Me = {
  userId: number;
  name: string;
  displayName: string;
  title: string;
  roleLabel: string;
  email: string;
  workspace: string;
  initials: string;
  photo?: string | undefined;
  phone: string;
  timezone: string;
};

export type MyProject = {
  id: string;
  name: string;
  client: string;
  type: string;
  status: string;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  description: string;
  /** My open tasks in it. */
  openTasks: number;
  /** Earliest due date among its open tasks (ISO), if any. */
  nextDeadline: string | null;
  /** Latest thing that happened in it (ISO). */
  lastActivity: string | null;
  /** People who have tasks or logged time on it. */
  team: Member[];
};

export type Activity = {
  id: string;
  kind: "task" | "time" | "project" | "expense" | "team";
  /** "You completed “QA pages”" / "Maya completed “QA pages”". */
  text: string;
  detail: string;
  at: string;
  actorName: string;
  actorSlug: string;
  project: string | null;
  taskSlug: string | null;
};

export type Notification = {
  id: string;
  kind: NotificationDisplayKind;
  title: string;
  message: string;
  at: string;
  read: boolean;
  taskSlug?: string | undefined;
  projectSlug?: string | undefined;
};

export type LoadStatus = "signedOut" | "loading" | "error" | "ready";

interface EmployeeStore {
  status: LoadStatus;
  error: string | null;
  retry: () => void;
  me: Me;
  can: {
    projects: boolean;
    tasks: boolean;
    createTasks: boolean;
    time: boolean;
    logTime: boolean;
    team: boolean;
  };
  projects: MyProject[];
  tasks: TaskItem[];
  timeEntries: TimeItem[];
  people: Member[];
  myActivity: Activity[];
  teamActivity: Activity[];
  notifications: Notification[];
  markNotification: (id: string) => void;
  markAllNotifications: () => void;
  // Drawer and form state shared by the shell.
  selectedTask: TaskItem | null;
  openTask: (slug: string | null) => void;
  taskFormOpen: boolean;
  setTaskFormOpen: (open: boolean) => void;
  editingTask: TaskItem | null;
  editTask: (task: TaskItem | null) => void;
  timeFormOpen: boolean;
  setTimeFormOpen: (open: boolean) => void;
  editingTime: TimeItem | null;
  setEditingTime: (entry: TimeItem | null) => void;
  timeFormProject: string;
  logTimeFor: (projectSlug?: string) => void;
  // Actions (all go to the API).
  setTaskStatus: (slug: string, status: TaskStatus) => Promise<void>;
  saveTask: (input: TaskInput, slug?: string) => Promise<void>;
  deleteTask: (slug: string) => Promise<void>;
  saveTime: (input: TimeEntryWrite, slug?: string) => Promise<void>;
  deleteTime: (slug: string) => Promise<void>;
}

const StoreContext = createContext<EmployeeStore | null>(null);

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
const first = (name: string) => name.split(/\s+/)[0] ?? name;

/** "1.5h on Oct 6" (from the API) → "1h 30m". */
const loggedHours = (detail: string) => {
  const n = parseFloat(detail);
  return Number.isFinite(n) ? fmtHours(n) : detail.split(" on ")[0];
};

function describe(e: ApiActivity, myId: number): Activity {
  const you = e.actor === myId;
  const who = you ? "You" : first(e.actor_name);
  const target = e.target_label ? `“${e.target_label}”` : "";
  const text: Record<ApiActivity["verb"], string> = {
    "task.created": `${who} created ${target}`,
    "task.assigned":
      e.subject === myId
        ? `${who} assigned you ${target}`
        : `${who} assigned ${target} to ${first(e.subject_name)}`,
    "task.completed": `${who} completed ${target}`,
    "task.reopened": `${who} reopened ${target}`,
    "task.started": `${who} started ${target}`,
    "task.in_review": `${who} moved ${target} to review`,
    "time.logged": `${who} logged ${loggedHours(e.detail)}`,
    "project.created": `${who} created the project ${target}`,
    "project.status": `${who} changed ${target} to ${e.detail.split("→ ")[1] ?? "a new status"}`,
    "expense.submitted": `${who} submitted the expense ${target}`,
    "expense.approved": `${who} approved the expense ${target}`,
    "expense.rejected": `${who} rejected the expense ${target}`,
    "member.joined": `${who} joined the workspace`,
  };
  const kind: Activity["kind"] = e.verb.startsWith("task")
    ? "task"
    : e.verb.startsWith("time")
      ? "time"
      : e.verb.startsWith("project")
        ? "project"
        : e.verb.startsWith("expense")
          ? "expense"
          : "team";
  const detail =
    e.verb === "time.logged"
      ? [e.project_name || "Agency overhead", e.target_label].filter(Boolean).join(" · ")
      : e.verb === "expense.rejected" && e.detail
        ? `Reason: ${e.detail}`
        : e.project_name;
  return {
    id: String(e.id),
    kind,
    text: text[e.verb],
    detail,
    at: e.created_at,
    actorName: e.actor_name,
    actorSlug: e.actor_slug,
    project: e.project,
    taskSlug: kind === "task" ? e.target_slug : null,
  };
}

function fromApiNotification(n: ApiNotification): Notification {
  const d = n.data;
  const kind = notificationKind(n);
  return {
    id: String(n.id),
    kind,
    title: d.title ?? "Notification",
    message: n.description,
    at: n.timestamp,
    read: !n.unread,
    taskSlug:
      (kind === "task" || kind === "deadline") && n.verb !== "task.deleted" ? d.slug : undefined,
    projectSlug: d.project || undefined,
  };
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const ops = useMiniOps();
  const queryClient = useQueryClient();
  const { live, authStatus, activeWorkspace, user, profile } = ops;
  const wid = activeWorkspace.id;
  const apiWid = live && wid !== "loading" ? Number(wid) : null;
  const myId = user?.id ?? -1;

  const can = {
    projects: ops.can("projects"),
    tasks: ops.can("tasks"),
    createTasks: ops.can("tasks", "edit"),
    time: ops.can("time"),
    logTime: ops.can("time", "edit"),
    team: live,
  };

  const feed = (key: string, query: Parameters<typeof activityApi.list>[1]) => ({
    queryKey: ["activity", apiWid, key],
    queryFn: () => activityApi.list(apiWid!, query),
    enabled: apiWid !== null,
  });
  const mineQuery = useQuery(feed("mine", { actor: "me", page_size: 60 }));
  const teamQuery = useQuery(feed("team", { exclude_actor: "me", page_size: 30 }));
  const refreshActivity = useCallback(
    () => void queryClient.invalidateQueries({ queryKey: ["activity", apiWid] }),
    [queryClient, apiWid],
  );

  const tasks = useMemo(
    () => ops.taskList.filter((t) => t.assignee === myId || (t.createdByMe && !t.assignee)),
    [ops.taskList, myId],
  );
  const timeEntries = useMemo(
    () => ops.timeList.filter((e) => e.member === myId),
    [ops.timeList, myId],
  );
  const myActivity = useMemo(
    () => (mineQuery.data ?? []).map((e) => describe(e, myId)),
    [mineQuery.data, myId],
  );
  const teamActivity = useMemo(
    () => (teamQuery.data ?? []).map((e) => describe(e, myId)),
    [teamQuery.data, myId],
  );
  const allActivity = useMemo(() => [...myActivity, ...teamActivity], [myActivity, teamActivity]);

  const projects = useMemo<MyProject[]>(() => {
    const mine = new Set([
      ...tasks.map((t) => t.project),
      ...timeEntries.map((e) => e.project),
      ...ops.projects.filter((p) => p.team?.includes(myId)).map((p) => p.id),
    ]);
    return ops.projects
      .filter((p) => mine.has(p.id))
      .map((p) => {
        const open = tasks.filter((t) => t.project === p.id && t.status !== "Done");
        const deadlines = open
          .map((t) => t.dueDate)
          .filter((d): d is string => !!d)
          .sort();
        const people = new Set([
          ...ops.taskList.filter((t) => t.project === p.id && t.assignee).map((t) => t.assignee!),
          ...ops.timeList.filter((e) => e.project === p.id).map((e) => e.member),
          ...(p.team ?? []),
        ]);
        const last = allActivity
          .filter((a) => a.project === p.id)
          .map((a) => a.at)
          .sort()
          .at(-1);
        return {
          id: p.id,
          name: p.name,
          client: p.client || "Internal",
          type: p.projectType ?? "Project",
          status: p.status,
          progress: p.progress,
          startDate: p.startDate ?? null,
          endDate: p.endDate ?? null,
          description: p.description ?? "",
          openTasks: open.length,
          nextDeadline: deadlines[0] ?? null,
          lastActivity: last ?? p.createdAt ?? null,
          team: ops.members.filter((m) => people.has(m.id)),
        };
      });
  }, [
    ops.projects,
    ops.taskList,
    ops.timeList,
    ops.members,
    tasks,
    timeEntries,
    allActivity,
    myId,
  ]);

  // ---- notifications: stored by the backend (miniops/notifications) ----
  const notifications = useMemo<Notification[]>(
    () => ops.apiNotifications.map(fromApiNotification),
    [ops.apiNotifications],
  );

  // ---- drawer / forms ----
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selectedTask = ops.taskList.find((t) => t.slug === selectedSlug) ?? null;
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [timeFormOpen, setTimeFormOpen] = useState(false);
  const [editingTime, setEditingTime] = useState<TimeItem | null>(null);
  const [timeFormProject, setTimeFormProject] = useState("");

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      refreshActivity();
      if (done) toast.success(done);
    } catch (e) {
      toast.error(errorText(e));
      throw e;
    }
  };

  const me: Me = {
    userId: myId,
    name: profile.name,
    displayName: first(profile.name),
    title: profile.title,
    roleLabel: activeWorkspace.role || "Employee",
    email: profile.email,
    workspace: activeWorkspace.name,
    initials: initialsOf(profile.name),
    photo: profile.avatar,
    phone: profile.phone,
    timezone: profile.timezone,
  };

  const loading =
    authStatus === "loading" ||
    (live && (ops.tasksState.loading || ops.timeState.loading || ops.projectsState.loading));
  const error = ops.tasksState.error ?? ops.timeState.error ?? ops.projectsState.error ?? null;
  const status: LoadStatus =
    authStatus === "signedOut" ? "signedOut" : loading ? "loading" : error ? "error" : "ready";

  const value: EmployeeStore = {
    status,
    error,
    retry: () => {
      ops.tasksState.retry();
      ops.timeState.retry();
      ops.projectsState.retry();
      refreshActivity();
    },
    me,
    can,
    projects,
    tasks,
    timeEntries,
    people: ops.members,
    myActivity,
    teamActivity,
    notifications,
    markNotification: ops.readNotification,
    markAllNotifications: () => {
      ops.markRead();
      toast.success("All notifications marked as read");
    },
    selectedTask,
    openTask: setSelectedSlug,
    taskFormOpen,
    setTaskFormOpen,
    editingTask,
    editTask: (task) => {
      setEditingTask(task);
      setTaskFormOpen(true);
    },
    timeFormOpen,
    setTimeFormOpen,
    editingTime,
    setEditingTime,
    timeFormProject,
    logTimeFor: (projectSlug = "") => {
      setEditingTime(null);
      setTimeFormProject(projectSlug);
      setTimeFormOpen(true);
    },
    setTaskStatus: (slug, status) =>
      run(() => ops.moveTask(slug, status), status === "Done" ? "Task completed" : "Task updated"),
    saveTask: (input, slug) =>
      run(() => ops.saveTask(input, slug), slug ? "Task updated" : "Task created"),
    deleteTask: (slug) =>
      run(async () => {
        await ops.deleteTask(slug);
        setSelectedSlug(null);
      }, "Task deleted"),
    saveTime: (input, slug) =>
      run(() => ops.saveTime(input, slug), slug ? "Time entry updated" : "Time logged"),
    deleteTime: (slug) => run(() => ops.deleteTime(slug), "Time entry deleted"),
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useEmployee() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("EmployeeProvider missing");
  return value;
}
