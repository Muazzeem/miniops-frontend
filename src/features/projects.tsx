import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  FolderKanban,
  Lock,
  LogIn,
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
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Metric, MobileCard, MobileField, PageHeader, Status } from "@/components/miniops/core";
import { Section } from "@/components/miniops/forms";
import { ProjectFiles } from "./project-files";
import { SearchableSelect } from "@/components/miniops/select-search";
import {
  DateInput,
  DateRangePicker,
  formatDisplayDate,
  toIso,
  type IsoRange,
} from "@/components/miniops/date-time";
import { cash, money, type Project } from "@/data/mock";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/api";
import { LoginDialog } from "./login-dialog";
import { TaskFormDialog, TaskTable } from "./tasks";
import { ExpenseFormDialog } from "./expenses";
import { EntriesTable, TimeEntryDialog } from "./time";
import { fmtHours } from "@/lib/hours";
import { useMiniOps, type ProjectInput } from "./store";

const SORTS = {
  recent: {
    label: "Recent activity",
    fn: (a: Project, b: Project) =>
      (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? ""),
  },
  newest: {
    label: "Newest",
    fn: (a: Project, b: Project) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  },
  name: { label: "Name", fn: (a: Project, b: Project) => a.name.localeCompare(b.name) },
  revenue: { label: "Revenue", fn: (a: Project, b: Project) => b.revenue - a.revenue },
  margin: { label: "Margin", fn: (a: Project, b: Project) => b.margin - a.margin },
  progress: { label: "Progress", fn: (a: Project, b: Project) => b.progress - a.progress },
  due: {
    label: "Due date",
    fn: (a: Project, b: Project) => (a.endDate || "9999").localeCompare(b.endDate || "9999"),
  },
} as const;
type SortKey = keyof typeof SORTS;
const MONEY_SORTS = new Set(["revenue", "margin"]);
const NEEDS_ATTENTION = "needs-attention";

/** Does the project's start–end span overlap the picked range? Undated projects always match. */
function overlaps(p: Project, range: IsoRange) {
  if (!range.from) return true;
  const to = range.to || range.from;
  const start = p.startDate || p.endDate;
  const end = p.endDate || p.startDate;
  if (!start || !end) return true;
  return start <= to && end >= range.from;
}

function dateSpan(p: Project) {
  if (p.startDate && p.endDate)
    return `${formatDisplayDate(p.startDate)} – ${formatDisplayDate(p.endDate)}`;
  if (p.startDate) return `Started ${formatDisplayDate(p.startDate)}`;
  if (p.endDate) return `Due ${formatDisplayDate(p.endDate)}`;
  return "No dates set";
}

export function Projects() {
  const { projects, projectsState, can, authStatus } = useMiniOps();
  const canEdit = can("projects", "edit");
  // Without the financials permission the API leaves money out; so does the UI.
  const showMoney = can("financials");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [client, setClient] = useState("");
  const [range, setRange] = useState<IsoRange>({ from: "", to: "" });
  const [sort, setSort] = useState<SortKey>("recent");

  const clientOptions = useMemo(
    () => [...new Set(projects.map((p) => p.client).filter(Boolean))].sort(),
    [projects],
  );
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return projects
      .filter((p) => !term || `${p.name} ${p.client}`.toLowerCase().includes(term))
      .filter((p) =>
        status === "all"
          ? true
          : status === NEEDS_ATTENTION
            ? showMoney && p.health !== "Healthy"
            : p.status === status,
      )
      .filter((p) => !client || p.client === client)
      .filter((p) => overlaps(p, range))
      .sort(SORTS[sort].fn);
  }, [projects, q, status, client, range, sort, showMoney]);
  const filtered = Boolean(q || status !== "all" || client || range.from);
  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setClient("");
    setRange({ from: "", to: "" });
  };

  const totals = useMemo(() => {
    const revenue = projects.reduce((s, p) => s + p.revenue, 0);
    const profit = projects.reduce((s, p) => s + p.profit, 0);
    return {
      revenue,
      profit,
      margin: revenue ? Math.round((profit / revenue) * 1000) / 10 : 0,
      attention: projects.filter((p) => p.health !== "Healthy").length,
      active: projects.filter((p) => p.status === "Active").length,
      progress: projects.length
        ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
        : 0,
      planning: projects.filter((p) => p.status === "Planning").length,
      completed: projects.filter((p) => p.status === "Completed").length,
    };
  }, [projects]);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Track delivery, budget burn, and profitability in one view."
        action={
          canEdit && (
            <ProjectFormDialog>
              <Button>
                <Plus /> New Project
              </Button>
            </ProjectFormDialog>
          )
        }
      />
      {authStatus === "signedOut" ? (
        <SignInPrompt />
      ) : projectsState.error ? (
        <ErrorState message={projectsState.error} onRetry={projectsState.retry} />
      ) : projectsState.loading ? (
        <ProjectsSkeleton />
      ) : !can("projects") ? (
        <NoAccess what="projects" />
      ) : projects.length === 0 ? (
        <EmptyState canEdit={canEdit} />
      ) : (
        <>
          {showMoney ? (
            <div className="mb-6 metric-grid">
              <Metric label="Contract revenue" value={money(totals.revenue)} />
              <Metric label="Profit" value={money(totals.profit)} tone="profit" />
              <Metric label="Average margin" value={`${totals.margin}%`} />
              <Metric
                label="Need attention"
                value={`${totals.attention} of ${projects.length}`}
                tone="cost"
              />
            </div>
          ) : (
            <div className="mb-6 metric-grid">
              <Metric label="Active projects" value={`${totals.active} of ${projects.length}`} />
              <Metric label="Average progress" value={`${totals.progress}%`} />
              <Metric label="In planning" value={String(totals.planning)} />
              <Metric label="Completed" value={String(totals.completed)} />
            </div>
          )}
          <div className="toolbar">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="w-full pl-9 sm:w-64"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects or clients…"
                aria-label="Search projects"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {showMoney && <SelectItem value={NEEDS_ATTENTION}>Needs attention</SelectItem>}
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SearchableSelect
              variant="filter"
              clearable
              options={clientOptions}
              value={client}
              onChange={setClient}
              placeholder="All clients"
              searchPlaceholder="Search clients…"
              aria-label="Client"
            />
            <DateRangePicker value={range} onChange={setRange} />
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-52" aria-label="Sort">
                <span className="text-muted-foreground">Sort:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORTS)
                  .filter(([key]) => showMoney || !MONEY_SORTS.has(key))
                  .map(([key, s]) => (
                    <SelectItem key={key} value={key}>
                      {s.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {filtered && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
          {rows.length === 0 ? (
            <div className="rounded-2xl bg-card p-10 text-center shadow-card">
              <p className="font-medium">No projects match these filters.</p>
              <Button variant="link" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <ProjectsTable rows={rows} showMoney={showMoney} />
          )}
        </>
      )}
    </>
  );
}

function ProjectsTable({ rows, showMoney }: { rows: Project[]; showMoney: boolean }) {
  // This table has many columns, so it switches to cards on tablets too (below 1280px).
  return (
    <>
      <div className="hidden xl:block">
        <ProjectsDesktopTable rows={rows} showMoney={showMoney} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:hidden">
        {rows.map((project) => (
          <MobileCard key={project.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to="/projects/$projectSlug"
                  params={{ projectSlug: project.id }}
                  className="block truncate font-medium hover:text-primary"
                >
                  {project.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {project.client || "No client"}
                </p>
              </div>
              <Status>{project.status}</Status>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {showMoney && (
                <>
                  <MobileField label="Revenue">{money(project.revenue)}</MobileField>
                  <MobileField label="Profit">{money(project.profit)}</MobileField>
                  <MobileField label="Budget">{money(project.budget)}</MobileField>
                  <MobileField label="Margin">{project.margin}%</MobileField>
                </>
              )}
              <MobileField label="Due">
                {project.endDate ? formatDisplayDate(project.endDate) : "Not set"}
              </MobileField>
              {showMoney && (
                <MobileField label="Health">
                  <Status>{project.health}</Status>
                </MobileField>
              )}
            </dl>
            <div className="mt-4">
              <ProgressBar value={project.progress} />
            </div>
          </MobileCard>
        ))}
      </div>
    </>
  );
}

function ProjectsDesktopTable({ rows, showMoney }: { rows: Project[]; showMoney: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          {showMoney && (
            <>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </>
          )}
          <TableHead>Progress</TableHead>
          {showMoney && <TableHead>Health</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <Link
                to="/projects/$projectSlug"
                params={{ projectSlug: p.id }}
                className="font-medium hover:text-primary"
              >
                {p.name}
              </Link>
              {p.endDate && (
                <small className="block text-xs text-muted-foreground">
                  Due {formatDisplayDate(p.endDate)}
                </small>
              )}
            </TableCell>
            <TableCell>
              {p.clientSlug ? (
                <Link
                  to="/clients/$clientSlug"
                  params={{ clientSlug: p.clientSlug }}
                  className="hover:text-primary"
                >
                  {p.client}
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <Status>{p.status}</Status>
            </TableCell>
            {showMoney && (
              <>
                {[p.revenue, p.budget, p.cost, p.profit].map((v, i) => (
                  <TableCell key={i} className="num">
                    {money(v)}
                  </TableCell>
                ))}
                <TableCell className="num">{p.margin}%</TableCell>
              </>
            )}
            <TableCell>
              <ProgressBar value={p.progress} />
            </TableCell>
            {showMoney && (
              <TableCell>
                <Status>{p.health}</Status>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-24">
      <div className="h-1.5 bg-muted">
        <div className="h-full bg-primary" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <small>{value}%</small>
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading projects">
      <div className="mb-6 metric-grid">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  what = "projects",
}: {
  message: string;
  onRetry: () => void;
  what?: string;
}) {
  return (
    <div role="alert" className="rounded-2xl bg-card p-10 text-center shadow-card">
      <AlertTriangle className="mx-auto size-8 text-destructive" />
      <p className="mt-3 font-medium">Couldn't load {what}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function EmptyState({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-12 text-center shadow-card">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <FolderKanban className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold">No projects yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Add your first project to start tracking budget burn, profit and margin.
      </p>
      {canEdit && (
        <ProjectFormDialog>
          <Button className="mt-5">
            <Plus /> New Project
          </Button>
        </ProjectFormDialog>
      )}
    </div>
  );
}

export function ProjectDetail({ slug }: { slug: string }) {
  const { projects, projectsState, can, authStatus, taskList, expenseList, timeList } =
    useMiniOps();
  const canEdit = can("projects", "edit");
  const canEditTasks = can("tasks", "edit");
  const canSeeExpenses = can("expenses");
  const canAddExpense = can("expenses", "edit");
  const projectExpenses = expenseList.filter((e) => e.project === slug);
  const canSeeTime = can("time");
  const canLogTime = can("time", "edit");
  const projectTime = timeList.filter((e) => e.project === slug);
  const projectHours = projectTime.reduce((s, e) => s + e.hours, 0);
  const showMoney = can("financials");
  const p = projects.find((x) => x.id === slug);
  const projectTasks = taskList.filter((t) => t.project === slug);

  if (authStatus === "signedOut") return <SignInPrompt />;
  if (projectsState.error)
    return <ErrorState message={projectsState.error} onRetry={projectsState.retry} />;
  if (!projectsState.loading && !can("projects")) return <NoAccess what="projects" />;
  if (projectsState.loading)
    return (
      <div aria-busy="true" aria-label="Loading project" className="space-y-6">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <div className="metric-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  if (!p)
    return (
      <div className="rounded-2xl bg-card p-12 text-center shadow-card">
        <h1 className="font-display text-xl font-semibold">Project not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or it belongs to another workspace.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/projects">Back to projects</Link>
        </Button>
      </div>
    );

  const insight =
    p.health === "Loss"
      ? "Costs have overtaken revenue — this project is currently losing money."
      : p.health === "At Risk"
        ? "Budget is burning well ahead of delivery progress. Review scope or costs now."
        : p.health === "Attention"
          ? "Margin is thin or budget use is running ahead of progress. Keep an eye on it."
          : "Margin is healthy and budget use is in line with progress.";

  return (
    <>
      <PageHeader
        title={p.name}
        description={`${p.client || "No client"} · ${dateSpan(p)}`}
        action={canEdit && <ProjectActions project={p} />}
      />
      <div className="mb-6 metric-grid">
        {showMoney ? (
          <>
            <Metric label="Revenue" value={money(p.revenue)} />
            <Metric label="Budget" value={money(p.budget)} />
            <Metric label="Cost" value={money(p.cost)} />
            <Metric label="Profit" value={money(p.profit)} />
            <Metric label="Margin" value={`${p.margin}%`} />
            <Metric label="Budget used" value={`${p.budgetUsed}%`} />
          </>
        ) : (
          <>
            <Metric label="Status" value={p.status} />
            <Metric label="Progress" value={`${p.progress}%`} />
            <Metric label="Tasks" value={String(projectTasks.length)} />
            <Metric label="Due date" value={p.endDate ? formatDisplayDate(p.endDate) : "Not set"} />
          </>
        )}
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex w-full overflow-x-auto [&>*]:flex-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({projectTasks.length})</TabsTrigger>
          {canSeeTime && <TabsTrigger value="time">Time ({fmtHours(projectHours)})</TabsTrigger>}
          {canSeeExpenses && (
            <TabsTrigger value="expenses">Expenses ({projectExpenses.length})</TabsTrigger>
          )}
          <TabsTrigger value="files">Files</TabsTrigger>
          {showMoney && <TabsTrigger value="financials">Financials</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-8 lg:grid-cols-3">
            <Section title="Project summary">
              <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {p.description || "No description yet."}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <span>
                  Status
                  <br />
                  <Status>{p.status}</Status>
                </span>
                {showMoney && (
                  <span>
                    Health
                    <br />
                    <Status>{p.health}</Status>
                  </span>
                )}
                <span>
                  Progress
                  <br />
                  <b>{p.progress}%</b>
                </span>
                <span>
                  Due date
                  <br />
                  <b>{p.endDate ? formatDisplayDate(p.endDate) : "Not set"}</b>
                </span>
              </div>
            </Section>
            {showMoney && (
              <Section title="Profitability insight">
                <div className="insight">{insight}</div>
              </Section>
            )}
            <Section title="Details">
              <dl className="divide-y text-sm">
                {[
                  ["Type", p.projectType || "—"],
                  ["Start date", p.startDate ? formatDisplayDate(p.startDate) : "Not set"],
                  ["End date", p.endDate ? formatDisplayDate(p.endDate) : "Not set"],
                  ["Created", p.createdAt ? formatDisplayDate(toIso(new Date(p.createdAt))) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </div>
        </TabsContent>
        <TabsContent value="tasks">
          <Section
            title="Project tasks"
            action={
              canEditTasks && (
                <TaskFormDialog project={p.id}>
                  <Button size="sm">
                    <Plus /> New Task
                  </Button>
                </TaskFormDialog>
              )
            }
          >
            {projectTasks.length ? (
              <TaskTable rows={projectTasks} showProject={false} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No tasks for this project yet.
              </p>
            )}
          </Section>
        </TabsContent>
        {canSeeTime && (
          <TabsContent value="time">
            <Section
              title="Time on this project"
              subtitle={`${fmtHours(projectHours)} logged · ${fmtHours(
                projectTime.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0),
              )} billable`}
              action={
                canLogTime && (
                  <TimeEntryDialog project={p.id}>
                    <Button size="sm">
                      <Plus /> Log Time
                    </Button>
                  </TimeEntryDialog>
                )
              }
            >
              {projectTime.length ? (
                <EntriesTable rows={projectTime} showMoney={showMoney} showProject={false} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No time logged on this project yet.
                </p>
              )}
            </Section>
          </TabsContent>
        )}
        {canSeeExpenses && (
          <TabsContent value="expenses">
            <Section
              title="Project expenses"
              subtitle={`${money(
                projectExpenses
                  .filter((e) => e.status === "Approved")
                  .reduce((s, e) => s + e.amount, 0),
              )} approved`}
              action={
                canAddExpense && (
                  <ExpenseFormDialog project={p.id}>
                    <Button size="sm">
                      <Plus /> Add Expense
                    </Button>
                  </ExpenseFormDialog>
                )
              }
            >
              {projectExpenses.length ? (
                <div className="divide-y border-y">
                  {projectExpenses.map((e) => (
                    <div key={e.slug} className="flex items-center justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <b className="block truncate text-sm">{e.title}</b>
                        <small className="text-xs text-muted-foreground">
                          {e.category} · {formatDisplayDate(e.date)}
                          {e.isRecurring && " · recurring"}
                        </small>
                      </span>
                      <span className="flex items-center gap-3">
                        <Status>{e.status}</Status>
                        <b className="font-mono text-sm">{cash(e.amount)}</b>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No expenses for this project yet.
                </p>
              )}
            </Section>
          </TabsContent>
        )}
        <TabsContent value="files">
          <ProjectFiles project={p.id} />
        </TabsContent>
        <TabsContent value="financials">
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <Section title="Revenue, budget and cost">
              <ProjectBars project={p} />
            </Section>
            <Section title="Financial position">
              <dl className="divide-y">
                {[
                  ["Gross profit", money(p.profit)],
                  ["Profit margin", `${p.margin}%`],
                  ["Budget remaining", money(Math.max(0, p.budget - p.cost))],
                  ["Burn status", p.budgetUsed > p.progress ? "Ahead of progress" : "On track"],
                ].map(([k, v]) => (
                  <div className="flex justify-between py-3 text-sm" key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-mono font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

/** This project's own figures side by side, scaled to the largest. */
function ProjectBars({ project: p }: { project: Project }) {
  const bars = [
    { label: "Revenue", value: p.revenue, className: "bg-primary" },
    { label: "Budget", value: p.budget, className: "bg-muted-foreground/40" },
    {
      label: "Cost to date",
      value: p.cost,
      className: p.budget && p.cost > p.budget ? "bg-destructive" : "bg-warning",
    },
    { label: "Profit", value: Math.max(p.profit, 0), className: "bg-positive" },
  ];
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="space-y-4">
      {bars.map((b) => (
        <div key={b.label}>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-muted-foreground">{b.label}</span>
            <span className="font-mono font-medium">{money(b.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${b.className}`}
              style={{ width: `${(b.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Shown when the member's permissions don't include this area. */
export function NoAccess({ what }: { what: string }) {
  return (
    <div className="rounded-2xl bg-card p-12 text-center shadow-card">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Lock className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold">You don't have access to {what}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Ask a workspace owner or admin to change your permissions on the Team page.
      </p>
    </div>
  );
}

export function SignInPrompt({ what = "projects" }: { what?: string }) {
  return (
    <div className="rounded-2xl bg-card p-12 text-center shadow-card">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <LogIn className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold">Sign in to see your {what}</h2>
      <p className="mx-auto mt-1 mb-5 max-w-sm text-sm text-muted-foreground">
        Your {what} are saved to your workspace, so you need to be signed in to view and manage
        them.
      </p>
      <LoginDialog />
    </div>
  );
}

function ProjectActions({ project }: { project: Project }) {
  const { deleteProject } = useMiniOps();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success(`Deleted ${project.name}`);
      navigate({ to: "/projects" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete the project.");
      setDeleting(false);
    }
  }

  return (
    <>
      <ProjectFormDialog project={project}>
        <Button variant="outline">
          <Pencil /> Edit
        </Button>
      </ProjectFormDialog>
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
            <Trash2 /> Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the project and its financial figures. This can't be undone.
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
    </>
  );
}

type FormState = Omit<ProjectInput, "revenue" | "budget" | "cost" | "progress"> & {
  revenue: string;
  budget: string;
  cost: string;
  progress: string;
};

const toForm = (p?: Project, defaultClient = ""): FormState => ({
  name: p?.name ?? "",
  clientSlug: p ? (p.clientSlug ?? "") : defaultClient,
  newClient: "",
  projectType: p?.projectType ?? "Website",
  status: p?.status ?? "Planning",
  description: p?.description ?? "",
  revenue: p ? String(p.revenue) : "",
  budget: p ? String(p.budget) : "",
  cost: p ? String(p.cost) : "",
  progress: p ? String(p.progress) : "0",
  startDate: p?.startDate ?? "",
  endDate: p?.endDate ?? "",
});

function validate(f: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!f.name.trim()) errors.name = "Enter a project name.";
  for (const key of ["revenue", "budget", "cost"] as const) {
    const n = Number(f[key] || 0);
    if (!Number.isFinite(n) || n < 0) errors[key] = "Enter an amount of 0 or more.";
  }
  const progress = Number(f.progress || 0);
  if (!Number.isInteger(progress) || progress < 0 || progress > 100)
    errors.progress = "Enter a whole number from 0 to 100.";
  if (f.startDate && f.endDate && f.endDate < f.startDate)
    errors.endDate = "End date can't be before the start date.";
  return errors;
}

/** Create (no `project`) or edit a project. `children` is the trigger button. */
export function ProjectFormDialog({
  project,
  client,
  children,
}: {
  project?: Project;
  /** Pre-selects a client by slug when creating (e.g. from a client page). */
  client?: string;
  children: ReactNode;
}) {
  const { saveProject, clientList, can } = useMiniOps();
  // Money fields are only shown (and only saved by the API) with the financials permission.
  const showMoney = can("financials");
  const navigate = useNavigate();
  // Pick an existing client, or switch to typing a new client's name.
  const [addingClient, setAddingClient] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(project, client));
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function onOpenChange(next: boolean) {
    if (next) {
      setForm(toForm(project, client));
      setErrors({});
      setAddingClient(false);
    }
    setOpen(next);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const saved = await saveProject(
        {
          ...form,
          name: form.name.trim(),
          clientSlug: addingClient ? "" : form.clientSlug,
          newClient: addingClient ? form.newClient.trim() : "",
          description: form.description.trim(),
          revenue: Number(form.revenue || 0),
          budget: Number(form.budget || 0),
          cost: Number(form.cost || 0),
          progress: Number(form.progress || 0),
        },
        project?.id,
      );
      toast.success(project ? "Project updated" : `Created ${saved.name}`);
      setOpen(false);
      if (!project) navigate({ to: "/projects/$projectSlug", params: { projectSlug: saved.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the project.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof FormState, label: string, control: ReactNode, wide = false) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Label htmlFor={`project-${key}`}>
        {label}
        {key === "name" && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className="mt-1.5">{control}</div>
      {errors[key] && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {errors[key]}
        </p>
      )}
    </div>
  );
  const moneyInput = (key: "revenue" | "budget" | "cost") => (
    <Input
      id={`project-${key}`}
      type="number"
      inputMode="decimal"
      min={0}
      step="0.01"
      placeholder="0"
      value={form[key]}
      onChange={(e) => set(key, e.target.value)}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{project ? "Edit project" : "Add project"}</DialogTitle>
            <DialogDescription>Saved to your workspace.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-x-4 gap-y-5 py-5 sm:grid-cols-2">
            {field(
              "name",
              "Project name",
              <Input
                id="project-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />,
            )}
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor={addingClient ? "project-newClient" : "project-clientSlug"}>
                  {addingClient ? "New client" : "Client"}
                </Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setAddingClient((v) => !v)}
                >
                  {addingClient ? "Choose existing" : "+ New client"}
                </button>
              </div>
              <div className="mt-1.5">
                {addingClient ? (
                  <Input
                    id="project-newClient"
                    value={form.newClient}
                    onChange={(e) => set("newClient", e.target.value)}
                    placeholder="New client's name"
                    autoComplete="off"
                    autoFocus
                  />
                ) : (
                  <SearchableSelect
                    id="project-clientSlug"
                    clearable
                    placeholder="No client"
                    searchPlaceholder="Search clients…"
                    options={clientList.map((c) => ({
                      value: c.slug,
                      label: c.name,
                      // Tells apart clients that share a name.
                      hint: c.industry || c.contactName || c.slug,
                    }))}
                    value={form.clientSlug}
                    onChange={(v) => set("clientSlug", v)}
                  />
                )}
              </div>
            </div>
            {field(
              "projectType",
              "Project type",
              <SearchableSelect
                id="project-projectType"
                options={[...PROJECT_TYPES]}
                value={form.projectType}
                onChange={(v) => set("projectType", v || "Other")}
              />,
            )}
            {field(
              "status",
              "Status",
              <SearchableSelect
                id="project-status"
                options={[...PROJECT_STATUSES]}
                value={form.status}
                onChange={(v) => set("status", v || "Planning")}
              />,
            )}
            {showMoney && (
              <>
                {field("revenue", "Revenue / contract value", moneyInput("revenue"))}
                {field("budget", "Budget", moneyInput("budget"))}
                {field("cost", "Cost to date", moneyInput("cost"))}
              </>
            )}
            {field(
              "progress",
              "Progress (%)",
              <Input
                id="project-progress"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={form.progress}
                onChange={(e) => set("progress", e.target.value)}
              />,
            )}
            {field(
              "startDate",
              "Start date",
              <DateInput
                id="project-startDate"
                value={form.startDate}
                onChange={(v) => set("startDate", v)}
              />,
            )}
            {field(
              "endDate",
              "End date",
              <DateInput
                id="project-endDate"
                value={form.endDate}
                onChange={(v) => set("endDate", v)}
                min={form.startDate || undefined}
              />,
            )}
            {field(
              "description",
              "Description",
              <Textarea
                id="project-description"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Scope, goals or anything the team should know"
              />,
              true,
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
