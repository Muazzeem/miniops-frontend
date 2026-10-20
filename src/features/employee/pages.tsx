import { useMemo, useState, type DragEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  Clock3,
  Grid2X2,
  LayoutList,
  ListFilter,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaskItem, TimeItem } from "@/features/store";
import { PROJECT_STATUSES, TASK_PRIORITIES, TASK_STATUSES, type TaskStatus } from "@/lib/api";
import { fmtHours } from "@/lib/hours";
import { cn } from "@/lib/utils";
import { todayIso, useEmployee, type Activity, type MyProject } from "./store";
import {
  Avatar,
  ConfirmDialog,
  EmptyState,
  Info,
  NoAccess,
  PageHeader,
  PriorityBadge,
  ProgressBar,
  Section,
  StatusBadge,
  SummaryCard,
  formatDate,
  formatDue,
  initialsOf,
  timeAgo,
} from "./ui";

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Monday–Sunday around today, as ISO dates. */
function currentWeek() {
  const now = new Date();
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - ((now.getDay() + 6) % 7),
  );
  return Array.from({ length: 7 }, (_, i) =>
    toIso(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
  );
}
const sumHours = (entries: TimeItem[]) => entries.reduce((s, e) => s + e.hours, 0);
const isOverdue = (t: TaskItem) => t.status !== "Done" && !!t.dueDate && t.dueDate < todayIso();
/** Open first, then by due date (undated last). */
const byDue = (a: TaskItem, b: TaskItem) =>
  Number(a.status === "Done") - Number(b.status === "Done") ||
  (a.dueDate || "9999").localeCompare(b.dueDate || "9999");

export function HomePage() {
  const {
    me,
    tasks,
    projects,
    timeEntries,
    myActivity,
    teamActivity,
    people,
    openTask,
    setTaskStatus,
    can,
  } = useEmployee();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = todayIso();
  const week = currentWeek();
  const open = tasks.filter((t) => t.status !== "Done");
  const attention = open
    .filter((t) => t.dueDate && t.dueDate <= week[6]!)
    .sort(byDue)
    .slice(0, 6);
  const dueToday = open.filter((t) => t.dueDate === today).length;
  const inProgress = open.filter((t) => t.status === "In Progress").length;
  const overdue = open.filter(isOverdue).length;
  const weekEntries = timeEntries.filter((e) => e.date >= week[0]! && e.date <= week[6]!);
  const hours = sumHours(weekEntries);
  const billable = sumHours(weekEntries.filter((e) => e.billable));
  const capacity = people.find((p) => p.isMe)?.weeklyCapacity ?? 40;
  const upcoming = open
    .filter((t) => t.dueDate && t.dueDate > today)
    .sort(byDue)
    .slice(0, 4);
  return (
    <>
      <PageHeader
        title={`${greet}, ${me.displayName}`}
        description={`Here’s what you have on your plate in ${me.workspace}.`}
        actions={
          can.tasks && (
            <Button variant="outline" asChild className="rounded-xl">
              <Link to="/employee/tasks">
                Open My Tasks <ChevronRight />
              </Link>
            </Button>
          )
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tasks Due Today"
          value={dueToday}
          icon={ListTodo}
          hint={dueToday ? "Due before end of day" : "Nothing due today"}
          onClick={() => navigate({ to: "/employee/tasks" })}
        />
        <SummaryCard
          label="In Progress"
          value={inProgress}
          icon={Clock3}
          tone="warning"
          hint="Currently being worked on"
          onClick={() => navigate({ to: "/employee/tasks" })}
        />
        <SummaryCard
          label="Overdue"
          value={overdue}
          icon={CircleAlert}
          tone="danger"
          hint={overdue ? "Needs attention" : "Nothing overdue"}
          onClick={() => navigate({ to: "/employee/tasks" })}
        />
        <SummaryCard
          label="Hours This Week"
          value={fmtHours(hours)}
          icon={CheckCircle2}
          tone="success"
          hint={`${fmtHours(billable)} billable`}
          onClick={() => navigate({ to: "/employee/time" })}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.9fr)]">
        <div className="min-w-0 space-y-5">
          <Section
            title="My Tasks"
            caption={
              attention.length
                ? `${attention.length} due this week or overdue`
                : "Nothing due this week"
            }
            action={
              <Link to="/employee/tasks" className="text-xs font-medium text-primary">
                View all
              </Link>
            }
          >
            <div className="px-2 pb-2">
              {attention.length ? (
                attention.map((task) => (
                  <div
                    key={task.slug}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-primary-soft"
                  >
                    <button
                      onClick={() => void setTaskStatus(task.slug, "Done").catch(() => {})}
                      disabled={!task.canEdit}
                      className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-input text-transparent transition-colors hover:border-success hover:text-success disabled:opacity-40"
                      aria-label={`Complete ${task.title}`}
                    >
                      <Check className="size-3" />
                    </button>
                    <button
                      onClick={() => openTask(task.slug)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {task.projectName || "No project"} ·{" "}
                        <span className={cn(isOverdue(task) && "font-medium text-danger")}>
                          {formatDue(task.dueDate!)}
                          {isOverdue(task) && " · Overdue"}
                        </span>
                      </span>
                    </button>
                    <span className="hidden sm:inline-flex">
                      <PriorityBadge priority={task.priority} />
                    </span>
                    <StatusBadge status={task.status} />
                  </div>
                ))
              ) : (
                <EmptyState
                  title="You’re all caught up"
                  description="No tasks are due this week."
                />
              )}
            </div>
          </Section>
          {can.projects && (
            <Section
              title="My Projects"
              caption="Projects you’re working on"
              action={
                <Link to="/employee/projects" className="text-xs font-medium text-primary">
                  View all
                </Link>
              }
            >
              {projects.length ? (
                <div className="grid gap-3 p-4 pt-2 md:grid-cols-3">
                  {projects.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      to="/employee/projects/$id"
                      params={{ id: p.id }}
                      className="rounded-2xl bg-secondary/60 p-4 transition-colors hover:bg-primary-soft"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="grid size-9 place-items-center rounded-xl bg-card text-xs font-semibold text-primary-dark">
                          {initialsOf(p.client)}
                        </span>
                        <StatusBadge status={p.status} />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold">{p.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{p.client}</p>
                      <div className="mt-4 flex justify-between text-xs">
                        <span className="text-muted-foreground">{p.openTasks} open tasks</span>
                        <span className="font-semibold">{p.progress}%</span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={p.progress} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BriefcaseBusiness}
                  title="No projects yet"
                  description="Projects appear here once you have tasks or log time on them."
                />
              )}
            </Section>
          )}
          <div className="grid gap-5 lg:grid-cols-2">
            <Section
              title="Recent Activity"
              caption="What you’ve done"
              action={
                <Link to="/employee/activity" className="text-xs font-medium text-primary">
                  See all
                </Link>
              }
            >
              {myActivity.length ? (
                <ActivityList activities={myActivity.slice(0, 4)} />
              ) : (
                <EmptyState
                  title="Nothing yet"
                  description="Your completed tasks and logged time show up here."
                />
              )}
            </Section>
            <Section title="Team Activity" caption="From your coworkers">
              {teamActivity.length ? (
                <div className="pb-2">
                  {teamActivity.slice(0, 5).map((a) => {
                    const person = people.find((p) => p.slug === a.actorSlug);
                    return (
                      <div key={a.id} className="flex gap-3 px-5 py-3">
                        <Avatar initials={initialsOf(a.actorName)} photo={person?.avatarUrl} />
                        <div className="min-w-0">
                          <p className="text-sm">{a.text}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {[a.detail, timeAgo(a.at)].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="Quiet so far"
                  description="Your teammates’ updates appear here."
                />
              )}
            </Section>
          </div>
        </div>
        <div className="min-w-0 space-y-5">
          <Section title="Upcoming Deadlines">
            <div className="px-2 pb-2">
              {upcoming.length ? (
                upcoming.map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => openTask(t.slug)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-primary-soft"
                  >
                    <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-primary-light py-1.5 text-center">
                      <span className="text-[10px] font-medium uppercase text-primary">
                        {new Date(`${t.dueDate}T12:00:00`).toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                      <span className="text-sm font-semibold text-primary-dark">
                        {Number(t.dueDate!.slice(8))}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {t.projectName || "No project"} · {formatDue(t.dueDate!)}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 pb-4 text-sm text-muted-foreground">No upcoming deadlines.</p>
              )}
            </div>
          </Section>
          {can.time && (
            <Section
              title="My Time"
              caption="This week"
              action={
                <Link to="/employee/time" className="text-xs font-medium text-primary">
                  Open
                </Link>
              }
            >
              <div className="px-5 pb-5">
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-semibold">{fmtHours(hours)}</p>
                  <p className="text-xs text-muted-foreground">of {capacity}h capacity</p>
                </div>
                <WeeklyBars entries={weekEntries} />
                <div className="mt-4 flex gap-5 text-xs">
                  <span>
                    <span className="mr-1.5 inline-block size-2 rounded-sm bg-primary" />
                    Billable <strong>{fmtHours(billable)}</strong>
                  </span>
                  <span>
                    <span className="mr-1.5 inline-block size-2 rounded-sm bg-chart-2" />
                    Non-billable <strong>{fmtHours(hours - billable)}</strong>
                  </span>
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

export function ProjectsPage() {
  const { projects, can } = useEmployee();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("activity");
  const [view, setView] = useState<"grid" | "list">("grid");
  const filtered = useMemo(
    () =>
      projects
        .filter(
          (p) =>
            `${p.name} ${p.client}`.toLowerCase().includes(query.toLowerCase()) &&
            (status === "all" || p.status === status),
        )
        .sort((a, b) =>
          sort === "progress"
            ? b.progress - a.progress
            : sort === "name"
              ? a.name.localeCompare(b.name)
              : (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""),
        ),
    [projects, query, status, sort],
  );
  if (!can.projects) return <NoAccess what="Projects" />;
  return (
    <>
      <PageHeader title="My Projects" description="Projects you have tasks in or log time on." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full lg:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full lg:w-44" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activity">Recent activity</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md border border-border p-0.5">
          <Button
            size="icon"
            variant={view === "grid" ? "secondary" : "ghost"}
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <Grid2X2 />
          </Button>
          <Button
            size="icon"
            variant={view === "list" ? "secondary" : "ghost"}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <LayoutList />
          </Button>
        </div>
      </div>
      {!filtered.length ? (
        <Section title="Projects">
          <EmptyState
            icon={BriefcaseBusiness}
            title={projects.length ? "No projects match" : "No projects yet"}
            description={
              projects.length
                ? "Try a different search or status."
                : "Projects appear here once you’re assigned tasks or log time on them."
            }
          />
        </Section>
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <Section title="My projects">
          <div className="desktop-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>My open tasks</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Next deadline</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to="/employee/projects/$id"
                        params={{ id: p.id }}
                        className="font-medium hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{p.client}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell>{p.openTasks}</TableCell>
                    <TableCell className="min-w-36">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={p.progress} />
                        <span>{p.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{p.nextDeadline ? formatDue(p.nextDeadline) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.lastActivity ? timeAgo(p.lastActivity) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mobile-list divide-y divide-border">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to="/employee/projects/$id"
                params={{ id: p.id }}
                className="block p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{p.name}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.client} · {p.openTasks} open tasks
                </p>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function ProjectCard({ project }: { project: MyProject }) {
  return (
    <Link
      to="/employee/projects/$id"
      params={{ id: project.id }}
      className="surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="grid size-10 place-items-center rounded-md bg-secondary text-sm font-semibold">
          {initialsOf(project.client)}
        </span>
        <StatusBadge status={project.status} />
      </div>
      <h2 className="mt-5 text-base font-semibold">{project.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{project.client}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-secondary/60 p-3 text-xs">
        <div>
          <dt className="text-muted-foreground">My tasks</dt>
          <dd className="mt-1 font-semibold">{project.openTasks} open</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Next deadline</dt>
          <dd className="mt-1 font-semibold">
            {project.nextDeadline ? formatDue(project.nextDeadline) : "None"}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-semibold">{project.progress}%</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={project.progress} />
      </div>
      {project.lastActivity && (
        <p className="mt-4 text-xs text-muted-foreground">
          Last activity {timeAgo(project.lastActivity)}
        </p>
      )}
    </Link>
  );
}

const tabCls =
  "rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none";

export function ProjectDetailPage({ id }: { id: string }) {
  const {
    projects,
    tasks,
    timeEntries,
    myActivity,
    teamActivity,
    can,
    openTask,
    setTaskStatus,
    logTimeFor,
    setEditingTime,
    setTimeFormOpen,
  } = useEmployee();
  if (!can.projects) return <NoAccess what="Projects" />;
  const project = projects.find((p) => p.id === id);
  if (!project)
    return (
      <Section title="Project">
        <EmptyState
          title="Project not found"
          description="It may have been removed, or you don’t have tasks or time on it."
          action={
            <Button asChild variant="outline">
              <Link to="/employee/projects">Back to My Projects</Link>
            </Button>
          }
        />
      </Section>
    );
  const projectTasks = tasks.filter((t) => t.project === id).sort(byDue);
  const projectTime = timeEntries.filter((e) => e.project === id);
  const activity = [...myActivity, ...teamActivity]
    .filter((a) => a.project === id)
    .sort((a, b) => b.at.localeCompare(a.at));
  const timeline =
    project.startDate || project.endDate
      ? `${project.startDate ? formatDate(project.startDate) : "?"} – ${project.endDate ? formatDate(project.endDate) : "?"}`
      : "Not set";
  return (
    <>
      <div className="mb-6">
        <Link
          to="/employee/projects"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← My Projects
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 flex gap-2">
              <StatusBadge status={project.status} />
              <span className="rounded bg-secondary px-2 py-1 text-xs font-medium">
                {project.type}
              </span>
            </div>
            <h1 className="text-2xl font-semibold sm:text-[28px]">{project.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{project.client}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 surface px-5 py-4 text-sm">
            <Info label="My open tasks" value={String(project.openTasks)} />
            <Info label="Timeline" value={timeline} />
          </div>
        </div>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="mb-5 h-auto w-full justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="overview" className={tabCls}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className={tabCls}>
            My Tasks ({projectTasks.length})
          </TabsTrigger>
          {can.time && (
            <TabsTrigger value="time" className={tabCls}>
              My Time ({fmtHours(sumHours(projectTime))})
            </TabsTrigger>
          )}
          <TabsTrigger value="team" className={tabCls}>
            Team
          </TabsTrigger>
          <TabsTrigger value="activity" className={tabCls}>
            Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
            <Section title="Project overview">
              <div className="p-5">
                <p className="field-label">Description</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6">
                  {project.description || "No description yet."}
                </p>
              </div>
            </Section>
            <div className="space-y-5">
              <Section title="Progress">
                <div className="p-5">
                  <p className="text-3xl font-semibold">{project.progress}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">Delivery progress</p>
                  <div className="mt-5">
                    <ProgressBar value={project.progress} />
                  </div>
                  <div className="mt-5 border-t border-border pt-4">
                    <Info
                      label="My next deadline"
                      value={project.nextDeadline ? formatDue(project.nextDeadline) : "None"}
                    />
                  </div>
                </div>
              </Section>
              <Section title="Upcoming deadlines">
                {projectTasks.filter((t) => t.status !== "Done" && t.dueDate).length ? (
                  <div className="divide-y divide-border">
                    {projectTasks
                      .filter((t) => t.status !== "Done" && t.dueDate)
                      .slice(0, 3)
                      .map((t) => (
                        <button
                          key={t.slug}
                          onClick={() => openTask(t.slug)}
                          className="w-full p-4 text-left hover:bg-accent"
                        >
                          <p className="text-sm font-medium">{t.title}</p>
                          <p
                            className={cn(
                              "mt-1 text-xs text-muted-foreground",
                              isOverdue(t) && "text-danger",
                            )}
                          >
                            {formatDue(t.dueDate!)}
                            {isOverdue(t) && " · Overdue"}
                          </p>
                        </button>
                      ))}
                  </div>
                ) : (
                  <p className="px-5 pb-5 text-sm text-muted-foreground">Nothing coming up.</p>
                )}
              </Section>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="tasks">
          {projectTasks.length ? (
            <TaskTable tasks={projectTasks} onOpen={openTask} onStatus={setTaskStatus} />
          ) : (
            <Section title="My tasks">
              <EmptyState
                title="No tasks for you here"
                description="Tasks assigned to you in this project appear here."
              />
            </Section>
          )}
        </TabsContent>
        <TabsContent value="time">
          <Section
            title="My time on this project"
            caption={`${fmtHours(sumHours(projectTime))} logged`}
            action={
              can.logTime ? (
                <Button size="sm" onClick={() => logTimeFor(project.id)}>
                  <Plus />
                  Log Time
                </Button>
              ) : undefined
            }
          >
            {projectTime.length ? (
              <div className="px-2 pb-2">
                {projectTime.map((e) => (
                  <button
                    key={e.slug}
                    onClick={() => {
                      if (!e.canEdit) return;
                      setEditingTime(e);
                      setTimeFormOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-primary-soft"
                  >
                    <span className="w-14 text-xs text-muted-foreground">{formatDate(e.date)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {e.description || e.taskTitle || "General work"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {e.billable ? "Billable" : "Non-billable"}
                      </span>
                    </span>
                    <strong className="text-sm">{fmtHours(e.hours)}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock3}
                title="No time logged yet"
                description="Time you log on this project appears here."
              />
            )}
          </Section>
        </TabsContent>
        <TabsContent value="team">
          <Section title="Project team" caption="People with tasks or time on this project">
            {project.team.length ? (
              <div className="divide-y divide-border">
                {project.team.map((m) => (
                  <div key={m.slug} className="flex items-center gap-3 p-4 sm:px-5">
                    <Avatar initials={initialsOf(m.name)} photo={m.avatarUrl} />
                    <div>
                      <p className="text-sm font-medium">
                        {m.name}
                        {m.isMe && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.title || m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No team yet"
                description="People appear here as they pick up work."
              />
            )}
          </Section>
        </TabsContent>
        <TabsContent value="activity">
          <Section title="Project activity">
            {activity.length ? (
              <ActivityList activities={activity} />
            ) : (
              <EmptyState
                title="No activity yet"
                description="Updates on this project appear here."
              />
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </>
  );
}

const RANGES = ["today", "week", "month", "all", "overdue"] as const;

export function TasksPage() {
  const { tasks, projects, can, openTask, editTask, setTaskStatus } = useEmployee();
  const [view, setView] = useState<"list" | "board" | "calendar">("list");
  const [range, setRange] = useState<(typeof RANGES)[number]>("all");
  const [project, setProject] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [query, setQuery] = useState("");
  if (!can.tasks) return <NoAccess what="Tasks" />;
  const today = todayIso();
  const week = currentWeek();
  const month = today.slice(0, 7);
  const filtered = tasks
    .filter((t) => {
      const due = t.dueDate ?? "";
      const inRange =
        range === "all" ||
        (range === "today" && due === today) ||
        (range === "week" && due >= week[0]! && due <= week[6]!) ||
        (range === "month" && due.startsWith(month)) ||
        (range === "overdue" && isOverdue(t));
      return (
        inRange &&
        (project === "all" || (project === "none" ? !t.project : t.project === project)) &&
        (status === "all" || t.status === status) &&
        (priority === "all" || t.priority === priority) &&
        t.title.toLowerCase().includes(query.toLowerCase())
      );
    })
    .sort(byDue);
  return (
    <>
      <PageHeader
        title="My Tasks"
        description="Tasks assigned to you, and ones you created for yourself."
        actions={
          can.createTasks ? (
            <Button onClick={() => editTask(null)}>
              <Plus />
              New Task
            </Button>
          ) : undefined
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <div className="flex overflow-x-auto rounded-md border border-border p-0.5">
          {RANGES.map((v) => (
            <Button
              key={v}
              variant={range === v ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRange(v)}
            >
              {v === "week"
                ? "This Week"
                : v === "month"
                  ? "This Month"
                  : v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex rounded-md border border-border p-0.5">
          <Button
            size="sm"
            variant={view === "list" ? "secondary" : "ghost"}
            onClick={() => setView("list")}
          >
            <LayoutList />
            List
          </Button>
          <Button
            size="sm"
            variant={view === "board" ? "secondary" : "ghost"}
            onClick={() => setView("board")}
          >
            <Grid2X2 />
            Board
          </Button>
          <Button
            size="sm"
            variant={view === "calendar" ? "secondary" : "ghost"}
            onClick={() => setView("calendar")}
          >
            <CalendarDays />
            Calendar
          </Button>
        </div>
      </div>
      <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_180px_150px_150px]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <FilterSelect
          value={project}
          setValue={setProject}
          placeholder="All projects"
          options={[
            ...projects.map((p) => ({ value: p.id, label: p.name })),
            { value: "none", label: "No project" },
          ]}
        />
        <FilterSelect
          value={status}
          setValue={setStatus}
          placeholder="All statuses"
          options={TASK_STATUSES.map((v) => ({ value: v, label: v }))}
        />
        <FilterSelect
          value={priority}
          setValue={setPriority}
          placeholder="All priorities"
          options={TASK_PRIORITIES.map((v) => ({ value: v, label: v }))}
        />
      </div>
      {!filtered.length ? (
        <Section title="Tasks">
          <EmptyState
            title={tasks.length ? "No tasks match" : "You’re all caught up"}
            description={
              tasks.length
                ? "Try a different range or filter."
                : "No tasks are assigned to you yet."
            }
          />
        </Section>
      ) : view === "list" ? (
        <TaskTable tasks={filtered} onOpen={openTask} onStatus={setTaskStatus} />
      ) : view === "board" ? (
        <TaskBoard tasks={filtered} onOpen={openTask} onStatus={setTaskStatus} />
      ) : (
        <TaskCalendar tasks={filtered} onOpen={openTask} />
      )}
    </>
  );
}

function FilterSelect({
  value,
  setValue,
  placeholder,
  options,
}: {
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label={placeholder}>
        <ListFilter className="mr-2 size-4 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type StatusFn = (slug: string, s: TaskStatus) => Promise<void>;

function TaskTable({
  tasks,
  onOpen,
  onStatus,
}: {
  tasks: TaskItem[];
  onOpen: (slug: string) => void;
  onStatus: StatusFn;
}) {
  const change = (slug: string, s: TaskStatus) => void onStatus(slug, s).catch(() => {});
  return (
    <Section title={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}>
      <div className="desktop-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TableRow key={t.slug}>
                <TableCell>
                  <button
                    onClick={() => change(t.slug, t.status === "Done" ? "To Do" : "Done")}
                    disabled={!t.canEdit}
                    className={cn(
                      "grid size-5 place-items-center rounded-full border disabled:opacity-40",
                      t.status === "Done"
                        ? "border-success bg-success text-success-foreground"
                        : "border-border",
                    )}
                    aria-label={t.status === "Done" ? `Reopen ${t.title}` : `Complete ${t.title}`}
                  >
                    {t.status === "Done" && <Check className="size-3" />}
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onOpen(t.slug)}
                    className={cn(
                      "text-left font-medium hover:text-primary",
                      t.status === "Done" && "text-muted-foreground line-through",
                    )}
                  >
                    {t.title}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {t.projectName || "No project"}
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={t.priority} />
                </TableCell>
                <TableCell className={cn(isOverdue(t) && "font-medium text-danger")}>
                  {t.dueDate ? formatDue(t.dueDate) : "—"}
                  {isOverdue(t) && " · Overdue"}
                </TableCell>
                <TableCell>
                  <Select
                    value={t.status}
                    disabled={!t.canEdit}
                    onValueChange={(v) => change(t.slug, v as TaskStatus)}
                  >
                    <SelectTrigger className="h-8 w-32" aria-label={`Status of ${t.title}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mobile-list divide-y divide-border">
        {tasks.map((t) => (
          <button key={t.slug} onClick={() => onOpen(t.slug)} className="w-full p-4 text-left">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{t.title}</p>
              <PriorityBadge priority={t.priority} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t.projectName || "No project"}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className={cn("text-xs text-muted-foreground", isOverdue(t) && "text-danger")}>
                {t.dueDate ? formatDue(t.dueDate) : "No due date"}
              </span>
              <StatusBadge status={t.status} />
            </div>
          </button>
        ))}
      </div>
    </Section>
  );
}

function TaskBoard({
  tasks,
  onOpen,
  onStatus,
}: {
  tasks: TaskItem[];
  onOpen: (slug: string) => void;
  onStatus: StatusFn;
}) {
  const [over, setOver] = useState<TaskStatus | null>(null);
  const drop = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const slug = e.dataTransfer.getData("task-slug");
    const task = tasks.find((t) => t.slug === slug);
    if (task && task.status !== status) void onStatus(slug, status).catch(() => {});
    setOver(null);
  };
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {TASK_STATUSES.map((status) => (
        <section
          key={status}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(status);
          }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => drop(e, status)}
          className={cn(
            "min-h-96 rounded-[18px] bg-secondary/70 p-3 transition-colors",
            over === status && "bg-primary-light ring-2 ring-primary/30",
          )}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">{status}</h2>
            <span className="text-xs text-muted-foreground">
              {tasks.filter((t) => t.status === status).length}
            </span>
          </div>
          <div className="space-y-2">
            {tasks
              .filter((t) => t.status === status)
              .map((t) => (
                <button
                  key={t.slug}
                  draggable={t.canEdit}
                  onDragStart={(e) => e.dataTransfer.setData("task-slug", t.slug)}
                  onClick={() => onOpen(t.slug)}
                  className={cn(
                    "w-full rounded-xl bg-card p-4 text-left shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5",
                    t.canEdit && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <PriorityBadge priority={t.priority} />
                    <span
                      className={cn("text-xs text-muted-foreground", isOverdue(t) && "text-danger")}
                    >
                      {t.dueDate ? formatDue(t.dueDate) : ""}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium">{t.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.projectName || "No project"}
                  </p>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TaskCalendar({ tasks, onOpen }: { tasks: TaskItem[]; onOpen: (slug: string) => void }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const today = todayIso();
  const lead = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const days = Array.from({ length: cells }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), i - lead + 1);
    return { iso: toIso(d), day: d.getDate(), inMonth: d.getMonth() === month.getMonth() };
  });
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  return (
    <Section
      title={month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      action={
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const d = new Date();
              setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            Today
          </Button>
          <Button size="icon" variant="ghost" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight />
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-semibold text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map(({ iso, day, inMonth }) => {
          const due = tasks.filter((t) => t.dueDate === iso);
          return (
            <div
              key={iso}
              className={cn(
                "min-h-24 border-b border-r border-border p-1.5",
                iso === today && "bg-info-muted",
                !inMonth && "bg-secondary/40 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-6 place-items-center text-xs",
                  iso === today && "rounded-full bg-primary text-primary-foreground",
                )}
              >
                {day}
              </span>
              <div className="mt-1 space-y-1">
                {due.map((t) => (
                  <button
                    key={t.slug}
                    onClick={() => onOpen(t.slug)}
                    title={t.title}
                    className={cn(
                      "w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium",
                      t.status === "Done"
                        ? "bg-success-muted text-success line-through"
                        : isOverdue(t) || t.priority === "Urgent" || t.priority === "High"
                          ? "bg-danger-muted text-danger"
                          : "bg-secondary",
                    )}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function TimePage() {
  const { timeEntries, people, can, logTimeFor, setEditingTime, setTimeFormOpen, deleteTime } =
    useEmployee();
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [scope, setScope] = useState<"week" | "all">("week");
  if (!can.time) return <NoAccess what="Time" />;
  const week = currentWeek();
  const weekEntries = timeEntries.filter((e) => e.date >= week[0]! && e.date <= week[6]!);
  const shown = (scope === "week" ? weekEntries : timeEntries)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const total = sumHours(weekEntries);
  const billable = sumHours(weekEntries.filter((e) => e.billable));
  const capacity = people.find((p) => p.isMe)?.weeklyCapacity ?? 40;
  const edit = (e: TimeItem) => {
    setEditingTime(e);
    setTimeFormOpen(true);
  };
  return (
    <>
      <PageHeader
        title="My Time"
        description="Track the time you spend on your work."
        actions={
          can.logTime ? (
            <Button onClick={() => logTimeFor()}>
              <Plus />
              Log Time
            </Button>
          ) : undefined
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Hours This Week"
          value={fmtHours(total)}
          icon={Clock3}
          hint={`of ${capacity}h capacity`}
        />
        <SummaryCard
          label="Billable Hours"
          value={fmtHours(billable)}
          icon={BriefcaseBusiness}
          tone="success"
        />
        <SummaryCard
          label="Non-Billable"
          value={fmtHours(total - billable)}
          icon={Circle}
          tone="warning"
        />
        <SummaryCard
          label="Utilization"
          value={`${capacity ? Math.round((billable / capacity) * 100) : 0}%`}
          icon={CheckCircle2}
          hint="Billable hours of your capacity"
        />
      </div>
      <div className="mb-5">
        <Section title="This week" caption="Billable and non-billable hours per day">
          <div className="p-5">
            <WeeklyBars entries={weekEntries} large />
          </div>
        </Section>
      </div>
      <Section
        title="Time log"
        caption={scope === "week" ? "Your entries this week" : "All your entries"}
        action={
          <div className="flex rounded-md border border-border p-0.5">
            <Button
              size="sm"
              variant={scope === "week" ? "secondary" : "ghost"}
              onClick={() => setScope("week")}
            >
              This week
            </Button>
            <Button
              size="sm"
              variant={scope === "all" ? "secondary" : "ghost"}
              onClick={() => setScope("all")}
            >
              All
            </Button>
          </div>
        }
      >
        {!shown.length ? (
          <EmptyState
            icon={Clock3}
            title="No time logged yet"
            description="Start tracking your work to keep your week up to date."
          />
        ) : (
          <>
            <div className="desktop-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((e) => (
                    <TableRow key={e.slug}>
                      <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                      <TableCell className="font-medium">
                        {e.projectName || "Agency overhead"}
                      </TableCell>
                      <TableCell>{e.taskTitle || "General work"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.description || "—"}
                      </TableCell>
                      <TableCell className="font-medium">{fmtHours(e.hours)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded px-2 py-1 text-xs",
                            e.billable
                              ? "bg-info-muted text-primary"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {e.billable ? "Billable" : "Non-billable"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {e.canEdit && (
                          <EntryMenu
                            entry={e}
                            edit={() => edit(e)}
                            remove={() => setDeleteSlug(e.slug)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mobile-list divide-y divide-border">
              {shown.map((e) => (
                <div key={e.slug} className="p-4">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">{e.projectName || "Agency overhead"}</p>
                    {e.canEdit && (
                      <EntryMenu
                        entry={e}
                        edit={() => edit(e)}
                        remove={() => setDeleteSlug(e.slug)}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-sm">{e.description || e.taskTitle || "General work"}</p>
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDate(e.date)} · {e.billable ? "Billable" : "Non-billable"}
                    </span>
                    <strong className="text-foreground">{fmtHours(e.hours)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>
      <ConfirmDialog
        open={!!deleteSlug}
        onOpenChange={(open) => !open && setDeleteSlug(null)}
        title="Delete this time entry?"
        description="This permanently removes the entry. It can't be undone."
        confirmLabel="Delete entry"
        onConfirm={() => {
          if (deleteSlug) void deleteTime(deleteSlug).catch(() => {});
          setDeleteSlug(null);
        }}
      />
    </>
  );
}

function EntryMenu({
  entry,
  edit,
  remove,
}: {
  entry: TimeItem;
  edit: () => void;
  remove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Actions for ${entry.description || "time entry"}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={edit}>
          <Pencil />
          Edit entry
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={remove} className="text-danger">
          <Trash2 />
          Delete entry
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Mon–Fri bars for the current week (weekend days appear only if logged). */
export function WeeklyBars({ entries, large = false }: { entries: TimeItem[]; large?: boolean }) {
  const week = currentWeek();
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = week
    .map((date, i) => ({ date, day: labels[i]! }))
    .filter((d, i) => i < 5 || entries.some((e) => e.date === d.date));
  const today = todayIso();
  return (
    <div className={cn("flex items-end justify-between gap-3", large ? "h-44" : "mt-6 h-24")}>
      {days.map(({ date, day }) => {
        const daily = entries.filter((entry) => entry.date === date);
        const billable = sumHours(daily.filter((entry) => entry.billable));
        const nonBillable = sumHours(daily.filter((entry) => !entry.billable));
        const total = billable + nonBillable;
        const height = large
          ? Math.max(8, (Math.min(total, 10) / 8) * 110)
          : Math.max(6, (Math.min(total, 10) / 8) * 60);
        return (
          <div key={date} className="flex h-full flex-1 flex-col justify-end">
            <p className="mb-2 text-center text-[10px] font-medium text-muted-foreground">
              {total ? fmtHours(total) : "—"}
            </p>
            <div
              className="mx-auto flex w-full max-w-10 flex-col justify-end overflow-hidden rounded-t bg-secondary"
              style={{ height }}
            >
              {nonBillable > 0 && (
                <div className="bg-chart-2" style={{ height: `${(nonBillable / total) * 100}%` }} />
              )}
              {billable > 0 && (
                <div className="bg-primary" style={{ height: `${(billable / total) * 100}%` }} />
              )}
            </div>
            <p
              className={cn(
                "mt-2 text-center text-[10px] text-muted-foreground",
                date === today && "font-semibold text-foreground",
              )}
            >
              {day}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const ACTIVITY_ICON = {
  task: CheckCircle2,
  time: Clock3,
  project: BriefcaseBusiness,
  expense: Receipt,
  team: UserRound,
} as const;

export function ActivityList({ activities }: { activities: Activity[] }) {
  const { openTask } = useEmployee();
  return (
    <div className="divide-y divide-border">
      {activities.map((a) => {
        const Icon = ACTIVITY_ICON[a.kind];
        return (
          <button
            key={a.id}
            onClick={() => a.taskSlug && openTask(a.taskSlug)}
            className={cn(
              "flex w-full gap-3 p-4 text-left sm:px-5",
              a.taskSlug && "hover:bg-primary-soft",
            )}
          >
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.text}</p>
              {a.detail && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{a.detail}</p>
              )}
            </div>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{timeAgo(a.at)}</span>
          </button>
        );
      })}
    </div>
  );
}
