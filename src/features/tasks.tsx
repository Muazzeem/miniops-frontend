import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  List,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileCard, MobileField, PageHeader, Status } from "@/components/miniops/core";
import { Section } from "@/components/miniops/forms";
import { RichText, RichTextEditor } from "@/components/miniops/rich-text";
import { SearchableMultiSelect, SearchableSelect } from "@/components/miniops/select-search";
import { TagList } from "@/components/miniops/tag-input";
import {
  DateInput,
  DateRangePicker,
  formatDisplayDate,
  toIso,
  type IsoRange,
} from "@/components/miniops/date-time";
import { ROLE_LABELS, TASK_PRIORITIES, TASK_STATUSES, type TaskStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ErrorState, NoAccess, SignInPrompt } from "./projects";
import { useMiniOps, useTaskTags, type TaskInput, type TaskItem } from "./store";

const NO_PROJECT = "__none__";
const UNASSIGNED = "__unassigned__";
const OVERDUE = "__overdue__";
const PRIORITY_RANK = { Urgent: 0, High: 1, Medium: 2, Low: 3 } as const;

/** Open work first, by due date (undated last), then priority; finished work at the end. */
function byUrgency(a: TaskItem, b: TaskItem) {
  const done = Number(a.status === "Done") - Number(b.status === "Done");
  if (done) return done;
  const due = (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  return due || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

function DueDate({ task, className }: { task: TaskItem; className?: string }) {
  if (!task.dueDate) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn(task.isOverdue && "font-medium text-destructive", className)}>
      {formatDisplayDate(task.dueDate)}
      {task.isOverdue && " · Overdue"}
    </span>
  );
}

export function Tasks() {
  const { taskList, tasksState, projects, members, can, authStatus } = useMiniOps();
  const canEdit = can("tasks", "edit");
  const [view, setView] = useState<"list" | "board" | "calendar">("list");
  const [q, setQ] = useState("");
  const [project, setProject] = useState("");
  const [assignee, setAssignee] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [range, setRange] = useState<IsoRange>({ from: "", to: "" });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    // Shared tasks are listed once; each person's part is on the task's page.
    return taskList
      .filter((t) => !t.parent)
      .filter((t) => !term || `${t.title} ${t.projectName}`.toLowerCase().includes(term))
      .filter((t) => !project || (project === NO_PROJECT ? !t.project : t.project === project))
      .filter(
        (t) =>
          !assignee ||
          (assignee === UNASSIGNED
            ? !t.assignee && !t.subtasks.length
            : assigneeIds(t).includes(Number(assignee))),
      )
      .filter((t) =>
        status === "all" ? true : status === OVERDUE ? t.isOverdue : t.status === status,
      )
      .filter((t) => !tag || t.tags.includes(tag))
      .filter((t) => priority === "all" || t.priority === priority)
      .filter((t) => {
        if (!range.from) return true;
        return !!t.dueDate && t.dueDate >= range.from && t.dueDate <= (range.to || range.from);
      })
      .sort(byUrgency);
  }, [taskList, q, project, assignee, tag, status, priority, range]);
  const allTags = useTaskTags();
  const filtered = Boolean(
    q || project || assignee || tag || status !== "all" || priority !== "all" || range.from,
  );
  const clearFilters = () => {
    setQ("");
    setProject("");
    setAssignee("");
    setTag("");
    setStatus("all");
    setPriority("all");
    setRange({ from: "", to: "" });
  };

  const body = () => {
    if (authStatus === "signedOut") return <SignInPrompt what="tasks" />;
    if (tasksState.error)
      return <ErrorState what="tasks" message={tasksState.error} onRetry={tasksState.retry} />;
    if (tasksState.loading)
      return (
        <div aria-busy="true" aria-label="Loading tasks" className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      );
    if (!can("tasks")) return <NoAccess what="tasks" />;
    if (taskList.length === 0) return <EmptyTasks canEdit={canEdit} />;
    return (
      <>
        <div className="toolbar justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["list", "List", <List key="i" />],
                ["board", "Board", <LayoutGrid key="i" />],
                ["calendar", "Calendar", <CalendarDays key="i" />],
              ] as const
            ).map(([key, label, icon]) => (
              <Button
                key={key}
                variant={view === key ? "secondary" : "ghost"}
                onClick={() => setView(key)}
                aria-pressed={view === key}
              >
                {icon} {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="w-56 pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tasks…"
                aria-label="Search tasks"
              />
            </div>
            <SearchableSelect
              variant="filter"
              clearable
              aria-label="Project"
              placeholder="All projects"
              searchPlaceholder="Search projects…"
              options={[
                ...projects.map((p) => ({ value: p.id, label: p.name })),
                { value: NO_PROJECT, label: "No project" },
              ]}
              value={project}
              onChange={setProject}
            />
            <SearchableSelect
              variant="filter"
              clearable
              aria-label="Assignee"
              placeholder="Anyone"
              searchPlaceholder="Search people…"
              options={[
                ...members.map((m) => ({ value: String(m.id), label: m.name })),
                { value: UNASSIGNED, label: "Unassigned" },
              ]}
              value={assignee}
              onChange={setAssignee}
            />
            {allTags.length > 0 && (
              <SearchableSelect
                variant="filter"
                clearable
                aria-label="Tag"
                placeholder="Any tag"
                searchPlaceholder="Search tags…"
                options={allTags}
                value={tag}
                onChange={setTag}
              />
            )}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value={OVERDUE}>Overdue</SelectItem>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-36" aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any priority</SelectItem>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker value={range} onChange={setRange} />
            {filtered && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center shadow-card">
            <p className="font-medium">No tasks match these filters.</p>
            <Button variant="link" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : view === "list" ? (
          <TaskTable rows={rows} />
        ) : view === "board" ? (
          <TaskBoard rows={rows} canEdit={canEdit} />
        ) : (
          <TaskCalendar rows={rows} />
        )}
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        description="What is everyone doing, and what is due?"
        action={
          canEdit && (
            <TaskFormDialog>
              <Button>
                <Plus /> New Task
              </Button>
            </TaskFormDialog>
          )
        }
      />
      {body()}
    </>
  );
}

/** Who works on a task: its assignee and the people on its sub-tasks. */
const assigneeIds = (t: TaskItem) => [t.assignee, ...t.subtasks.map((s) => s.assignee)];

/** The assignee, or the people on its sub-tasks; plus sub-task progress. */
function Assignees({ task }: { task: TaskItem }) {
  const done = task.subtasks.filter((s) => s.status === "Done").length;
  const names =
    task.assigneeName ||
    [...new Set(task.subtasks.map((s) => s.assigneeName).filter(Boolean))].join(", ");
  return (
    <span>
      {names || <span className="text-muted-foreground">Unassigned</span>}
      {task.subtasks.length > 0 && (
        <small className="block text-xs text-muted-foreground">
          {done}/{task.subtasks.length} sub-tasks done
        </small>
      )}
    </span>
  );
}

function TaskLink({ task, className }: { task: TaskItem; className?: string }) {
  return (
    <Link
      to="/tasks/$taskSlug"
      params={{ taskSlug: task.slug }}
      className={cn("font-medium hover:text-primary", className)}
    >
      {task.title}
    </Link>
  );
}

function ProjectLink({ task }: { task: TaskItem }) {
  if (!task.project) return <span className="text-muted-foreground">No project</span>;
  return (
    <Link
      to="/projects/$projectSlug"
      params={{ projectSlug: task.project }}
      className="hover:text-primary"
    >
      {task.projectName}
    </Link>
  );
}

/** Shared by the Tasks page and a project's Tasks tab. Tasks with sub-tasks expand to show them. */
export function TaskTable({
  rows,
  showProject = true,
}: {
  rows: TaskItem[];
  showProject?: boolean;
}) {
  const { taskList } = useMiniOps();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (slug: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  const subtasksOf = (t: TaskItem) =>
    t.subtasks.flatMap((s) => taskList.find((x) => x.slug === s.slug) ?? []);

  const row = (t: TaskItem, nested: boolean) => (
    <TableRow
      key={t.slug}
      className={cn(t.isOverdue && "bg-danger-soft/30", nested && "bg-muted/30")}
    >
      <TableCell>
        <div className={cn("flex items-start gap-1.5", nested && "pl-7")}>
          {!nested &&
            (t.subtasks.length ? (
              <button
                type="button"
                onClick={() => toggle(t.slug)}
                aria-expanded={expanded.has(t.slug)}
                aria-label={`${expanded.has(t.slug) ? "Hide" : "Show"} sub-tasks of ${t.title}`}
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ChevronRight
                  className={cn("size-4 transition-transform", expanded.has(t.slug) && "rotate-90")}
                />
              </button>
            ) : (
              <span className="size-5 shrink-0" />
            ))}
          <div className="min-w-0">
            <TaskLink task={t} />
            {t.subtasks.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {t.subtasks.length} sub-task{t.subtasks.length === 1 ? "" : "s"}
              </span>
            )}
            <TagList tags={t.tags} className="mt-1" />
          </div>
        </div>
      </TableCell>
      {showProject && (
        <TableCell>
          <ProjectLink task={t} />
        </TableCell>
      )}
      <TableCell>
        <Assignees task={t} />
      </TableCell>
      <TableCell>
        <Status>{t.priority}</Status>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <DueDate task={t} />
      </TableCell>
      <TableCell>
        <Status>{t.status}</Status>
      </TableCell>
      <TableCell className="text-right">
        <TaskRowActions task={t} />
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <div className="desktop-table">
        <TaskDesktopTable rows={rows} showProject={showProject} />
      </div>
      <div className="mobile-list space-y-3">
        {rows.map((task) => (
          <MobileCard key={task.slug}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <TaskLink task={task} />
                {showProject && (
                  <div className="mt-0.5 truncate text-xs">
                    <ProjectLink task={task} />
                  </div>
                )}
              </div>
              <TaskRowActions task={task} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <MobileField label="Assigned to">{task.assigneeName || "Unassigned"}</MobileField>
              <MobileField label="Due date">
                <DueDate task={task} />
              </MobileField>
              <MobileField label="Priority">
                <Status>{task.priority}</Status>
              </MobileField>
              <MobileField label="Status">
                <Status>{task.status}</Status>
              </MobileField>
            </dl>
          </MobileCard>
        ))}
      </div>
    </>
  );
}

function TaskDesktopTable({ rows, showProject }: { rows: TaskItem[]; showProject: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          {showProject && <TableHead>Project</TableHead>}
          <TableHead>Assigned to</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Due date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12 text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.flatMap((t) => [
          row(t, false),
          ...(expanded.has(t.slug) ? subtasksOf(t).map((c) => row(c, true)) : []),
        ])}
      </TableBody>
    </Table>
  );
}

function TaskBoard({ rows, canEdit }: { rows: TaskItem[]; canEdit: boolean }) {
  const { moveTask } = useMiniOps();
  const [over, setOver] = useState<TaskStatus | null>(null);

  async function drop(e: DragEvent, status: TaskStatus) {
    e.preventDefault();
    setOver(null);
    const slug = e.dataTransfer.getData("text/plain");
    const task = rows.find((t) => t.slug === slug);
    if (!task || task.status === status) return;
    try {
      await moveTask(slug, status);
      toast.success(`Moved to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't move the task.");
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const column = rows.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className={cn(
              "rounded-xl bg-muted/60 p-3 transition-shadow",
              over === status && "ring-2 ring-primary/40",
            )}
            onDragOver={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((s) => (s === status ? null : s))}
            onDrop={(e) => void drop(e, status)}
          >
            <h2 className="mb-3 flex justify-between text-sm font-semibold">
              {status}
              <span className="text-muted-foreground">{column.length}</span>
            </h2>
            <div className="space-y-2">
              {column.map((t) => (
                <div
                  key={t.slug}
                  draggable={canEdit && t.canEdit && !t.subtasks.length}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.slug)}
                  className={cn(
                    "rounded-lg border bg-card p-3 shadow-xs",
                    canEdit &&
                      t.canEdit &&
                      !t.subtasks.length &&
                      "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <TaskLink task={t} className="text-sm" />
                  <TagList tags={t.tags} className="mt-1.5" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.projectName || "No project"}
                    {t.assigneeName && ` · ${t.assigneeName}`}
                    {t.subtasks.length > 0 &&
                      ` · ${t.subtasks.filter((s) => s.status === "Done").length}/${t.subtasks.length} sub-tasks done`}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <Status>{t.priority}</Status>
                    <DueDate task={t} />
                  </div>
                </div>
              ))}
              {column.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  {canEdit ? "Drop a task here" : "No tasks"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month grid starting Monday, with each task on its due date. */
function TaskCalendar({ rows }: { rows: TaskItem[] }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = toIso(new Date());
  const byDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const t of rows) if (t.dueDate) map.set(t.dueDate, [...(map.get(t.dueDate) ?? []), t]);
    return map;
  }, [rows]);
  const undated = rows.filter((t) => !t.dueDate).length;

  const lead = (month.getDay() + 6) % 7; // days shown before the 1st (week starts Monday)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const days = Array.from({ length: cells }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), i - lead + 1);
    return { iso: toIso(d), day: d.getDate(), inMonth: d.getMonth() === month.getMonth() };
  });
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <b>{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</b>
        <div className="flex items-center gap-2">
          {undated > 0 && (
            <small className="mr-2 text-muted-foreground">{undated} without a due date</small>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date();
              setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-b p-2 text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {days.map((d) => {
            const due = byDate.get(d.iso) ?? [];
            return (
              <div
                key={d.iso}
                className={cn(
                  "min-h-24 border-b border-r p-1.5 text-xs",
                  !d.inMonth && "bg-muted/40 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-grid size-6 place-items-center rounded-full",
                    d.iso === today && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {d.day}
                </span>
                <div className="mt-1 space-y-1">
                  {due.slice(0, 3).map((t) => (
                    <Link
                      key={t.slug}
                      to="/tasks/$taskSlug"
                      params={{ taskSlug: t.slug }}
                      title={t.title}
                      className={cn(
                        "block truncate rounded px-1.5 py-1 hover:ring-1 hover:ring-primary/40",
                        t.status === "Done"
                          ? "bg-muted text-muted-foreground line-through"
                          : t.isOverdue
                            ? "bg-danger-soft text-destructive"
                            : "bg-accent text-accent-foreground",
                      )}
                    >
                      {t.title}
                    </Link>
                  ))}
                  {due.length > 3 && (
                    <small className="block px-1.5 text-muted-foreground">
                      +{due.length - 3} more
                    </small>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyTasks({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-12 text-center shadow-card">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <ClipboardList className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold">No tasks yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Add a task, assign it to someone, and give it a due date to keep work moving.
      </p>
      {canEdit && (
        <TaskFormDialog>
          <Button className="mt-5">
            <Plus /> New Task
          </Button>
        </TaskFormDialog>
      )}
    </div>
  );
}

export function TaskDetail({ slug }: { slug: string }) {
  const { taskList, tasksState, can, authStatus, saveTask } = useMiniOps();
  const canEdit = can("tasks", "edit");
  const task = taskList.find((t) => t.slug === slug);

  if (authStatus === "signedOut") return <SignInPrompt what="tasks" />;
  if (tasksState.error)
    return <ErrorState what="tasks" message={tasksState.error} onRetry={tasksState.retry} />;
  if (!tasksState.loading && !can("tasks")) return <NoAccess what="tasks" />;
  if (tasksState.loading)
    return (
      <div aria-busy="true" aria-label="Loading task" className="space-y-6">
        <Skeleton className="h-12 w-96 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  if (!task)
    return (
      <div className="rounded-2xl bg-card p-12 text-center shadow-card">
        <h1 className="font-display text-xl font-semibold">Task not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or it belongs to another workspace.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/tasks">Back to tasks</Link>
        </Button>
      </div>
    );

  async function changeStatus(status: string) {
    if (!task || status === task.status) return;
    try {
      await saveTask({ ...toInput(task), status: status as TaskStatus }, task.slug);
      toast.success(`Marked as ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the task.");
    }
  }

  return (
    <>
      <PageHeader
        title={task.title}
        description={
          task.parent
            ? `${task.assigneeName || "Someone"}'s part of “${task.parentTitle}”`
            : task.projectName
              ? `Task in ${task.projectName}`
              : "Agency overhead task"
        }
        action={(task.canEdit || task.canDelete) && <TaskActions task={task} />}
      />
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <Section title="Description">
          <RichText
            html={task.description}
            fallback="No description yet."
            className="text-muted-foreground"
          />
        </Section>
        <Section title="Details">
          <dl className="divide-y text-sm">
            <Detail label="Status">
              {task.canEdit && !task.subtasks.length ? (
                <Select value={task.status} onValueChange={(v) => void changeStatus(v)}>
                  <SelectTrigger className="h-8 w-36" aria-label="Change status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Status>{task.status}</Status>
              )}
            </Detail>
            <Detail label="Priority">
              <Status>{task.priority}</Status>
            </Detail>
            <Detail label="Due date">
              <DueDate task={task} />
            </Detail>
            {task.parent ? (
              <Detail label="Part of">
                <Link
                  to="/tasks/$taskSlug"
                  params={{ taskSlug: task.parent }}
                  className="hover:text-primary"
                >
                  {task.parentTitle}
                </Link>
              </Detail>
            ) : null}
            <Detail label="Assigned to">
              <Assignees task={task} />
            </Detail>
            <Detail label="Tags">
              {task.tags.length ? <TagList tags={task.tags} className="justify-end" /> : "None"}
            </Detail>
            <Detail label="Project">
              <ProjectLink task={task} />
            </Detail>
            {task.completedAt && (
              <Detail label="Completed">
                {formatDisplayDate(toIso(new Date(task.completedAt)))}
              </Detail>
            )}
            <Detail label="Created">{formatDisplayDate(toIso(new Date(task.createdAt)))}</Detail>
          </dl>
        </Section>
      </div>
      {!task.parent && <Subtasks task={task} />}
    </>
  );
}

/** A task's sub-tasks, each with its own assignee, status and deadline. */
function Subtasks({ task }: { task: TaskItem }) {
  const { rescheduleTask } = useMiniOps();
  const done = task.subtasks.filter((s) => s.status === "Done").length;

  async function reschedule(slug: string, date: string) {
    try {
      await rescheduleTask(slug, date);
      toast.success("Deadline updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change the deadline.");
    }
  }

  return (
    <Section
      title="Sub-tasks"
      subtitle={
        task.subtasks.length
          ? `${done} of ${task.subtasks.length} done`
          : "Break this task down, or give each person their own part."
      }
      action={
        task.canEdit && (
          <TaskFormDialog parent={task.slug} project={task.project ?? ""}>
            <Button variant="outline" size="sm">
              <Plus /> Add sub-task
            </Button>
          </TaskFormDialog>
        )
      }
      className="mt-8"
    >
      {task.subtasks.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sub-task</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {task.subtasks.map((s) => (
              <TableRow key={s.slug} className={s.isOverdue ? "bg-danger-soft/30" : undefined}>
                <TableCell>
                  <Link
                    to="/tasks/$taskSlug"
                    params={{ taskSlug: s.slug }}
                    className="font-medium hover:text-primary"
                  >
                    {s.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {s.assigneeName || <span className="text-muted-foreground">Unassigned</span>}
                </TableCell>
                <TableCell>
                  <Status>{s.status}</Status>
                </TableCell>
                <TableCell className="w-52">
                  {task.canEdit ? (
                    <DateInput
                      aria-label={`Due date for ${s.title}`}
                      value={s.dueDate ?? ""}
                      onChange={(v) => v !== (s.dueDate ?? "") && void reschedule(s.slug, v)}
                    />
                  ) : s.dueDate ? (
                    formatDisplayDate(s.dueDate)
                  ) : (
                    "No due date"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function TaskActions({ task }: { task: TaskItem }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      {task.canEdit && (
        <TaskFormDialog task={task}>
          <Button variant="outline">
            <Pencil /> Edit
          </Button>
        </TaskFormDialog>
      )}
      {task.canDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirming(true)}
            >
              <Trash2 /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DeleteTaskDialog
        task={task}
        open={confirming}
        onOpenChange={setConfirming}
        onDeleted={() => navigate({ to: "/tasks" })}
      />
    </>
  );
}

/** Three-dot menu on a task table row: edit or delete without opening the task. */
function TaskRowActions({ task }: { task: TaskItem }) {
  const [editing, setEditing] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const canAddSub = task.canEdit && !task.parent;
  const [confirming, setConfirming] = useState(false);
  if (!task.canEdit && !task.canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${task.title}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {task.canEdit && (
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil /> Edit task
            </DropdownMenuItem>
          )}
          {canAddSub && (
            <DropdownMenuItem onSelect={() => setAddingSub(true)}>
              <ListPlus /> Add sub-task
            </DropdownMenuItem>
          )}
          {task.canDelete && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirming(true)}
            >
              <Trash2 /> Delete task
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {task.canEdit && <TaskFormDialog task={task} open={editing} onOpenChange={setEditing} />}
      {canAddSub && (
        <TaskFormDialog
          parent={task.slug}
          project={task.project ?? ""}
          open={addingSub}
          onOpenChange={setAddingSub}
        />
      )}
      <DeleteTaskDialog task={task} open={confirming} onOpenChange={setConfirming} />
    </>
  );
}

function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onDeleted,
}: {
  task: TaskItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const { deleteTask } = useMiniOps();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await deleteTask(task.slug);
      toast.success("Task deleted");
      onOpenChange(false);
      onDeleted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete the task.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{task.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {task.subtasks.length
              ? `This permanently removes the task and its ${task.subtasks.length} sub-task${task.subtasks.length === 1 ? "" : "s"}. This can't be undone.`
              : "This permanently removes the task. This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault();
              void remove();
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const toInput = (t?: TaskItem, defaults?: Partial<TaskInput>): TaskInput => ({
  title: t?.title ?? "",
  description: t?.description ?? "",
  project: t ? (t.project ?? "") : (defaults?.project ?? ""),
  assignees: t?.assignee ? [String(t.assignee)] : [],
  dueDates: {},
  parent: t ? (t.parent ?? "") : (defaults?.parent ?? ""),
  tags: t?.tags ?? [],
  priority: t?.priority ?? "Medium",
  status: t?.status ?? "To Do",
  dueDate: t?.dueDate ?? "",
});

/**
 * Create (no `task`) or edit a task. `children` is the trigger; `project` and `parent` preset the
 * project and parent task slugs. Pass `open`/`onOpenChange` instead of `children` to open it from
 * elsewhere (e.g. a menu item).
 */
export function TaskFormDialog({
  task,
  project,
  parent,
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  task?: TaskItem;
  project?: string;
  parent?: string;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { saveTask, uploadTaskImage, projects, members, taskList, activeWorkspace, user } =
    useMiniOps();
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : innerOpen;
  const [form, setForm] = useState<TaskInput>(() =>
    toInput(task, { project: project ?? "", parent: parent ?? "" }),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  // Same rule as the API: employers, or a project manager on a project they manage.
  const canAssignMany =
    activeWorkspace.role === ROLE_LABELS.employer ||
    (activeWorkspace.role === ROLE_LABELS.project_manager &&
      !!user &&
      !!projects.find((p) => p.id === form.project)?.managers?.includes(user.id));
  const people = members.map((m) => ({ value: String(m.id), label: m.name, hint: m.role }));
  // Several people only when creating: each gets their own sub-task.
  const multiple = !task && form.assignees.length > 1;
  const hasSubtasks = !!task?.subtasks.length;
  // Sub-tasks go one level deep, under a task that isn't itself a sub-task.
  const parentOptions = taskList
    .filter((t) => !t.parent && t.slug !== task?.slug)
    .map((t) => ({ value: t.slug, label: t.title, ...(t.projectName && { hint: t.projectName }) }));
  const parentTitle = taskList.find((t) => t.slug === form.parent)?.title;
  function chooseParent(slug: string) {
    const p = taskList.find((t) => t.slug === slug);
    // A sub-task usually belongs to its parent's project.
    setForm((f) => ({ ...f, parent: slug, project: f.project || p?.project || "" }));
  }
  const nameOf = (id: string) => people.find((p) => p.value === id)?.label ?? "Someone";
  const setDueFor = (id: string, date: string) =>
    setForm((f) => ({ ...f, dueDates: { ...f.dueDates, [id]: date } }));

  function reset() {
    setForm(toInput(task, { project: project ?? "", parent: parent ?? "" }));
    setError("");
  }

  function onOpenChange(next: boolean) {
    if (next) reset();
    if (controlled) onOpenChangeProp?.(next);
    else setInnerOpen(next);
  }

  // A controlled dialog is opened by its parent, so onOpenChange(true) never fires.
  useEffect(() => {
    if (controlled && openProp) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, openProp]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Enter a task title.");
      return;
    }
    setSaving(true);
    try {
      await saveTask(
        { ...form, title: form.title.trim(), description: form.description.trim() },
        task?.slug,
      );
      toast.success(
        form.assignees.length > 1
          ? `${task ? "Task updated" : "Task created"} for ${form.assignees.length} people`
          : task
            ? "Task updated"
            : "Task created",
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the task.");
    } finally {
      setSaving(false);
    }
  }

  const field = (id: string, label: string, control: ReactNode, wide = false) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{control}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>
              {task ? "Edit task" : form.parent ? "Add sub-task" : "Add task"}
            </DialogTitle>
            <DialogDescription>
              {form.parent && parentTitle
                ? `A sub-task of “${parentTitle}”.`
                : "Saved to your workspace."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-x-4 gap-y-5 py-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="task-title">
                Task title<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="task-title"
                className="mt-1.5"
                value={form.title}
                onChange={(e) => {
                  set("title", e.target.value);
                  setError("");
                }}
                autoFocus
              />
              {error && (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
            {field(
              "task-project",
              "Project",
              <SearchableSelect
                id="task-project"
                clearable
                placeholder="No project"
                searchPlaceholder="Search projects…"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                value={form.project}
                onChange={(v) => set("project", v)}
              />,
            )}
            <div>
              <Label htmlFor="task-parent">Parent task</Label>
              <div className="mt-1.5">
                <SearchableSelect
                  id="task-parent"
                  clearable
                  placeholder={hasSubtasks ? "Has its own sub-tasks" : "None (a main task)"}
                  searchPlaceholder="Search tasks…"
                  options={parentOptions}
                  value={form.parent ?? ""}
                  onChange={chooseParent}
                  className={hasSubtasks ? "pointer-events-none opacity-60" : ""}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="task-assignee">Assigned to</Label>
              <div className="mt-1.5">
                {canAssignMany && !task ? (
                  <SearchableMultiSelect
                    id="task-assignee"
                    placeholder="Unassigned"
                    searchPlaceholder="Search people…"
                    options={people}
                    value={form.assignees}
                    onChange={(v) => set("assignees", v)}
                  />
                ) : (
                  <SearchableSelect
                    id="task-assignee"
                    clearable
                    placeholder="Unassigned"
                    searchPlaceholder="Search people…"
                    options={people}
                    value={form.assignees[0] ?? ""}
                    onChange={(v) => set("assignees", v ? [v] : [])}
                  />
                )}
              </div>
              {multiple && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.parent
                    ? "Each person gets their own sub-task."
                    : "This becomes a main task, and each person gets their own sub-task."}
                </p>
              )}
            </div>
            {field(
              "task-priority",
              "Priority",
              <SearchableSelect
                id="task-priority"
                options={[...TASK_PRIORITIES]}
                value={form.priority}
                onChange={(v) => set("priority", (v || "Medium") as TaskInput["priority"])}
              />,
            )}
            {hasSubtasks
              ? field(
                  "task-status",
                  "Status",
                  <p id="task-status" className="pt-2 text-sm text-muted-foreground">
                    {form.status} · follows its sub-tasks
                  </p>,
                )
              : field(
                  "task-status",
                  "Status",
                  <SearchableSelect
                    id="task-status"
                    options={[...TASK_STATUSES]}
                    value={form.status}
                    onChange={(v) => set("status", (v || "To Do") as TaskInput["status"])}
                  />,
                )}
            {field(
              "task-due",
              multiple ? "Default due date" : "Due date",
              <DateInput id="task-due" value={form.dueDate} onChange={(v) => set("dueDate", v)} />,
            )}
            {multiple && (
              <div className="sm:col-span-2">
                <Label>Deadline per person</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Leave a date empty to use the default due date.
                </p>
                <div className="mt-2 divide-y rounded-xl border">
                  {form.assignees.map((id) => (
                    <div key={id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0 truncate text-sm font-medium">{nameOf(id)}</span>
                      <DateInput
                        aria-label={`Due date for ${nameOf(id)}`}
                        className="w-48 shrink-0"
                        placeholder={form.dueDate ? formatDisplayDate(form.dueDate) : "No due date"}
                        value={form.dueDates?.[id] ?? ""}
                        onChange={(v) => setDueFor(id, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {field(
              "task-description",
              "Description",
              <RichTextEditor
                id="task-description"
                value={form.description}
                onChange={(html) => set("description", html)}
                placeholder="Details, links or acceptance criteria"
                onUploadImage={uploadTaskImage}
              />,
              true,
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : task
                  ? "Save changes"
                  : multiple
                    ? `Create for ${form.assignees.length} people`
                    : form.parent
                      ? "Add sub-task"
                      : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
