import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity as ActivityIcon,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  Clock3,
  Command,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Repeat,
  Search,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMiniOps, useNeeds, type TaskInput } from "@/features/store";
import { TagList } from "@/components/miniops/tag-input";
import { LoginDialog } from "@/features/login-dialog";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/lib/api";
import { fmtHours, parseHours } from "@/lib/hours";
import { cn } from "@/lib/utils";
import { RichText, RichTextEditor } from "@/components/miniops/rich-text";
import { DateInput } from "./date-time";
import { todayIso, useEmployee, type Notification } from "./store";

const ALL_LINKS = [
  { to: "/employee" as const, label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/employee/projects" as const, label: "My Projects", icon: FolderKanban, need: "projects" },
  { to: "/employee/tasks" as const, label: "My Tasks", icon: ListTodo, need: "tasks" },
  { to: "/employee/team" as const, label: "Team", icon: Users },
  { to: "/employee/chat" as const, label: "Chat", icon: MessageSquare },
  { to: "/employee/time" as const, label: "My Time", icon: Clock3, need: "time" },
  { to: "/employee/activity" as const, label: "Activity", icon: ActivityIcon },
] as const;
const settingsLink = { to: "/employee/settings" as const, label: "Settings", icon: Settings };

export function MiniOpsMark({
  compact = false,
  labelClass,
}: {
  compact?: boolean;
  labelClass?: string;
}) {
  return (
    <div className="flex items-center">
      {compact ? (
        <img src="/apple-touch-icon.png" alt="MiniOps" className="size-8 shrink-0 rounded-[10px]" />
      ) : (
        <img src="/miniops-logo.png" alt="MiniOps" className={cn("h-8 w-auto", labelClass)} />
      )}
    </div>
  );
}

function NavItem({
  item,
  wide,
  onNavigate,
}: {
  item: { to: string; label: string; icon: typeof ActivityIcon; exact?: boolean };
  wide: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  const Icon = item.icon;
  const { chatUnread } = useMiniOps();
  const badge = item.to === "/employee/chat" && chatUnread > 0 ? chatUnread : 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.to}
          activeOptions={item.exact ? { exact: true } : {}}
          onClick={onNavigate}
          className={cn(
            "flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-foreground",
            !wide && "justify-center px-0",
          )}
          activeProps={{ className: "!bg-primary-light !text-primary-dark" }}
        >
          <span className="relative">
            <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
            {badge > 0 && !wide && (
              <span className="absolute -right-1.5 -top-1.5 size-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
            )}
          </span>
          {wide && <span className="truncate">{item.label}</span>}
          {wide && badge > 0 && (
            <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      {!wide && <TooltipContent side="right">{item.label}</TooltipContent>}
    </Tooltip>
  );
}

function Navigation({ wide, onNavigate }: { wide: boolean; onNavigate?: () => void }) {
  const { can, status } = useEmployee();
  // Areas the member has no access to are hidden (signed out: show everything).
  const links = ALL_LINKS.filter(
    (l) => status === "signedOut" || !("need" in l) || can[l.need as keyof typeof can],
  );
  return (
    <nav className="flex flex-1 flex-col">
      <div className="space-y-1">
        {links.map((item) => (
          <NavItem key={item.to} item={item} wide={wide} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mt-auto border-t border-border/70 pt-3">
        <NavItem item={settingsLink} wide={wide} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

function useWideScreen() {
  const [w, setW] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const f = () => setW(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return w;
}

/** Workspace badge; switches workspace when you belong to more than one. */
function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, switchWorkspace, live } = useMiniOps();
  const initials = activeWorkspace.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const badge = (
    <span className="gradient-soft flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-card text-[11px] font-semibold text-primary-dark">
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{activeWorkspace.name}</span>
        {/* This is the employee view, so label the role by view rather than workspace membership. */}
        <span className="block text-xs text-muted-foreground">Employee</span>
      </span>
      {live && workspaces.length > 1 && <ChevronDown className="size-4 text-muted-foreground" />}
    </span>
  );
  if (!live || workspaces.length < 2) return <div className="mb-4">{badge}</div>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="mb-4 w-full rounded-xl" aria-label="Switch workspace">
          {badge}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 rounded-xl">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} onSelect={() => switchWorkspace(w.id)}>
            <Check className={cn("text-primary", w.id !== activeWorkspace.id && "opacity-0")} />
            {w.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EmployeeShell({ children }: { children: ReactNode }) {
  const { status, error, retry } = useEmployee();
  const { activeWorkspace } = useMiniOps();
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const large = useWideScreen();
  const wide = large && !collapsed;
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const offset = wide ? "md:pl-60" : "md:pl-[72px]";
  const signedIn = status !== "signedOut";
  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen overflow-x-hidden bg-app">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden flex-col bg-sidebar px-3 pb-4 shadow-[1px_0_0_var(--color-border)] transition-[width] duration-200 md:flex",
            wide ? "w-60" : "w-[72px]",
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center",
              wide ? "justify-between px-2" : "justify-center",
            )}
          >
            <MiniOpsMark compact={!wide} />
            {wide && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft />
              </Button>
            )}
          </div>
          {!wide && large && (
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto mb-2 size-8 text-muted-foreground"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <ChevronsRight />
            </Button>
          )}
          {wide && signedIn && <WorkspaceSwitcher />}
          <Navigation wide={wide} />
        </aside>
        <header
          className={cn(
            "fixed inset-x-0 top-0 z-20 flex h-16 items-center gap-2 bg-app/90 px-4 backdrop-blur transition-[padding] duration-200 lg:px-6",
            offset,
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <div className="md:hidden">
            <MiniOpsMark compact />
          </div>
          {signedIn && (
            <>
              <button
                onClick={() => setSearchOpen(true)}
                className="ml-auto hidden h-10 w-full max-w-sm items-center gap-2 rounded-xl bg-card px-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-foreground sm:flex"
              >
                <Search className="size-4" />
                Search projects, tasks, time…
                <kbd className="ml-auto rounded-md bg-secondary px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
              </button>
              <div className="ml-auto flex items-center gap-1 sm:ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl sm:hidden"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search"
                >
                  <Search />
                </Button>
                <NotificationMenu />
                <ProfileMenu />
              </div>
            </>
          )}
        </header>
        <main className={cn("min-h-screen pt-16 transition-[padding] duration-200", offset)}>
          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {status === "signedOut" ? (
              <Section title="My work">
                <EmptyState
                  icon={UserRound}
                  title="Sign in to see your work"
                  description="Your tasks, time and projects come from your MiniOps workspace."
                  action={<LoginDialog />}
                />
              </Section>
            ) : status === "loading" ? (
              <div aria-busy="true" aria-label="Loading your work" className="space-y-4">
                <div className="h-10 w-72 animate-pulse rounded-xl bg-secondary" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />
                  ))}
                </div>
                <Section title="Loading…">
                  <LoadingRows />
                </Section>
              </div>
            ) : status === "error" ? (
              <Section title="My work">
                <ErrorState retry={retry} message={error ?? undefined} />
              </Section>
            ) : (
              children
            )}
          </div>
        </main>
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="flex w-72 flex-col p-0">
            <SheetHeader className="p-5 text-left">
              <SheetTitle>
                <MiniOpsMark />
              </SheetTitle>
              <SheetDescription>{signedIn ? activeWorkspace.name : "MiniOps"}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col px-3 pb-4">
              <Navigation wide onNavigate={() => setNavOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        {status === "ready" && (
          <>
            <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
            <TaskDrawer />
            <TaskForm />
            <TimeForm />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

const notifIcon = (k: Notification["kind"]) =>
  k === "task"
    ? CheckCircle2
    : k === "time"
      ? Clock3
      : k === "deadline"
        ? CalendarClock
        : k === "expense"
          ? Receipt
          : k === "project"
            ? BriefcaseBusiness
            : Users;

function NotificationMenu() {
  const { notifications, markNotification, markAllNotifications, openTask } = useEmployee();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const unread = notifications.filter((n) => !n.read).length;
  const list = tab === "all" ? notifications : notifications.filter((n) => !n.read);
  function openItem(n: Notification) {
    markNotification(n.id);
    setOpen(false);
    if (n.taskSlug) openTask(n.taskSlug);
    else if (n.projectSlug)
      navigate({ to: "/employee/projects/$id", params: { id: n.projectSlug } });
    else if (n.kind === "time") navigate({ to: "/employee/time" });
    else if (n.kind === "team") navigate({ to: "/employee/team" });
    else navigate({ to: "/employee/notifications" });
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl"
          aria-label={`Notifications, ${unread} unread`}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-4 text-primary-foreground ring-2 ring-app">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(380px,calc(100vw-1.5rem))] rounded-2xl border-0 p-0 shadow-xl"
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unread > 0 && (
            <button
              onClick={markAllNotifications}
              className="text-xs font-medium text-primary hover:text-primary-dark"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="flex gap-1 px-4 pb-2 pt-3">
          {(["all", "unread"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium",
                tab === t
                  ? "bg-primary-light text-primary-dark"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {t === "all" ? "All" : `Unread${unread ? ` (${unread})` : ""}`}
            </button>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {list.length ? (
            list.map((n) => {
              const Icon = notifIcon(n.kind);
              return (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className="flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-primary-soft"
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      n.read
                        ? "bg-secondary text-muted-foreground"
                        : n.kind === "deadline"
                          ? "bg-danger-muted text-danger"
                          : "bg-primary-light text-primary",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                      {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">
                      {n.message}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {timeAgo(n.at)}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <EmptyState
              icon={Bell}
              title="You’re all caught up"
              description={tab === "unread" ? "No unread notifications." : "Nothing new yet."}
            />
          )}
        </div>
        <button
          onClick={() => {
            setOpen(false);
            navigate({ to: "/employee/notifications" });
          }}
          className="block w-full border-t px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-primary-soft"
        >
          View all notifications
        </button>
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu() {
  const { me } = useEmployee();
  const { signOut, employeeOnly } = useMiniOps();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ml-1 rounded-full" aria-label="Open profile menu">
          <Avatar initials={me.initials} photo={me.photo} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-2xl border-0 p-2 shadow-xl"
      >
        <div className="flex items-center gap-3 p-2">
          <Avatar initials={me.initials} photo={me.photo} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{me.name}</p>
            <p className="truncate text-xs text-muted-foreground">{me.title || me.roleLabel}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-lg"
          onSelect={() => navigate({ to: "/employee/profile" })}
        >
          <UserRound />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-lg"
          onSelect={() => navigate({ to: "/employee/settings" })}
        >
          <Settings />
          Settings
        </DropdownMenuItem>
        {!employeeOnly && (
          <DropdownMenuItem className="rounded-lg" onSelect={() => navigate({ to: "/app" })}>
            <Repeat />
            Switch to Employer View
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-lg"
          onSelect={() => {
            void signOut()
              .then(() => toast.success("Signed out"))
              .catch(() => toast.info("Signed out on this device."))
              .finally(() => navigate({ to: "/" }));
          }}
        >
          <LogOut />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Avatar({
  initials,
  photo,
  size = "sm",
}: {
  initials: string;
  photo?: string | null | undefined;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const s =
    size === "lg"
      ? "size-20 text-xl"
      : size === "md"
        ? "size-10 text-sm"
        : size === "xs"
          ? "size-6 text-[10px]"
          : "size-8 text-xs";
  return photo ? (
    <img
      src={photo}
      alt=""
      referrerPolicy="no-referrer"
      className={cn("shrink-0 rounded-full object-cover", s)}
    />
  ) : (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-avatar font-semibold text-avatar-foreground",
        s,
      )}
    >
      {initials}
    </span>
  );
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  caption,
  action,
  children,
  className,
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface overflow-hidden rounded-[18px]", className)}>
      <div className="flex min-h-14 items-center justify-between px-5 pb-2 pt-4">
        <div>
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {caption && <p className="mt-0.5 text-[13px] text-muted-foreground">{caption}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SummaryCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  onClick,
}: {
  label: string;
  value: string | number;
  icon: typeof ActivityIcon;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger";
  onClick?: () => void;
}) {
  const toneCls =
    tone === "success"
      ? "bg-success-muted text-success"
      : tone === "warning"
        ? "bg-warning-muted text-warning"
        : tone === "danger"
          ? "bg-danger-muted text-danger"
          : "bg-primary-light text-primary";
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className="surface group block w-full p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-xl", toneCls)}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </Comp>
  );
}

/** Task, project and other statuses, colour-coded. */
export function StatusBadge({ status }: { status: string }) {
  const style = ["Done", "Completed", "Active"].includes(status)
    ? "bg-success-muted text-success"
    : ["In Progress"].includes(status)
      ? "bg-primary-light text-primary-dark"
      : ["In Review", "On Hold", "Pending"].includes(status)
        ? "bg-warning-muted text-warning"
        : ["Cancelled", "Overdue"].includes(status)
          ? "bg-danger-muted text-danger"
          : "bg-secondary text-secondary-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium",
        style,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const style =
    priority === "Urgent" || priority === "High"
      ? "text-danger bg-danger-muted"
      : priority === "Medium"
        ? "text-warning bg-warning-muted"
        : "text-muted-foreground bg-secondary";
  return (
    <span className={cn("inline-flex rounded-lg px-2 py-1 text-xs font-medium", style)}>
      {priority}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-light">
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon = CheckCircle2,
  title,
  description,
  action,
}: {
  icon?: typeof CheckCircle2;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 grid size-11 place-items-center rounded-2xl bg-primary-light text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  retry,
  message,
}: {
  retry?: () => void;
  message?: string | undefined;
}) {
  return (
    <EmptyState
      icon={CircleAlert}
      title="Something went wrong"
      description={message ?? "We couldn’t load this information."}
      action={
        retry && (
          <Button variant="outline" onClick={retry}>
            Try Again
          </Button>
        )
      }
    />
  );
}

/** For areas the member's permissions don't include. */
export function NoAccess({ what }: { what: string }) {
  return (
    <Section title={what}>
      <EmptyState
        icon={CircleAlert}
        title={`You don’t have access to ${what.toLowerCase()}`}
        description="Ask a workspace owner or admin to change your permissions."
      />
    </Section>
  );
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-4 w-4 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-2/5 animate-pulse rounded bg-secondary" />
          <div className="ml-auto h-4 w-20 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}

function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useNeeds(...(open ? (["projects", "tasks", "time"] as const) : []));
  const { projects, tasks, timeEntries, openTask } = useEmployee();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return [
      ...projects
        .filter((p) => `${p.name} ${p.client}`.toLowerCase().includes(q))
        .map((p) => ({
          id: p.id,
          title: p.name,
          meta: `Project · ${p.client}`,
          type: "project" as const,
        })),
      ...tasks
        .filter((t) => `${t.title} ${t.projectName}`.toLowerCase().includes(q))
        .map((t) => ({
          id: t.slug,
          title: t.title,
          meta: `Task · ${t.projectName || "No project"}`,
          type: "task" as const,
        })),
      ...timeEntries
        .filter((t) => `${t.description} ${t.projectName}`.toLowerCase().includes(q))
        .map((t) => ({
          id: t.slug,
          title: t.description || t.taskTitle || "General work",
          meta: `Time · ${fmtHours(t.hours)} on ${formatDate(t.date)}`,
          type: "time" as const,
        })),
    ].slice(0, 8);
  }, [query, projects, tasks, timeEntries]);
  function openResult(result: (typeof results)[number]) {
    onOpenChange(false);
    setQuery("");
    if (result.type === "project")
      navigate({ to: "/employee/projects/$id", params: { id: result.id } });
    else if (result.type === "task") openTask(result.id);
    else navigate({ to: "/employee/time" });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] translate-y-0 gap-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search MiniOps</DialogTitle>
          <DialogDescription>Search your projects, tasks, and time entries.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center border-b px-4">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, and time…"
            className="h-12 border-0 shadow-none focus-visible:ring-0"
          />
          <Command className="size-4 text-muted-foreground" />
        </div>
        <div className="max-h-96 overflow-auto p-2">
          {query && !results.length ? (
            <EmptyState
              icon={Search}
              title="No results"
              description="Try a project, task, or time entry."
            />
          ) : (
            results.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => openResult(r)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-accent"
              >
                <span className="grid size-8 place-items-center rounded bg-secondary">
                  {r.type === "project" ? (
                    <BriefcaseBusiness className="size-4" />
                  ) : r.type === "task" ? (
                    <ListTodo className="size-4" />
                  ) : (
                    <Clock3 className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="text-xs text-muted-foreground">{r.meta}</span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))
          )}
          {!query && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Start typing to search your work.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskDrawer() {
  const {
    selectedTask: task,
    openTask,
    setTaskStatus,
    deleteTask,
    editTask,
    myActivity,
    teamActivity,
  } = useEmployee();
  const [confirm, setConfirm] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  if (!task) return null;
  const history = [...myActivity, ...teamActivity]
    .filter((a) => a.taskSlug === task.slug)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
  const overdue = task.status !== "Done" && !!task.dueDate && task.dueDate < todayIso();
  return (
    <>
      {task.parent && (
        <ParentTaskDialog slug={task.parent} open={parentOpen} onOpenChange={setParentOpen} />
      )}
      <Sheet open={!!task} onOpenChange={(open) => !open && openTask(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="pr-8 text-left">
            <div className="mb-3 flex gap-2">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {overdue && <StatusBadge status="Overdue" />}
            </div>
            <SheetTitle className="text-xl">{task.title}</SheetTitle>
            <SheetDescription>
              {task.project ? (
                <Link
                  to="/employee/projects/$id"
                  params={{ id: task.project }}
                  onClick={() => openTask(null)}
                  className="hover:text-primary"
                >
                  {task.projectName}
                </Link>
              ) : (
                "No project"
              )}
            </SheetDescription>
            {task.parent && (
              <p className="mt-2 text-xs text-muted-foreground">
                Sub-task of{" "}
                <button
                  type="button"
                  onClick={() => setParentOpen(true)}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {task.parentTitle}
                </button>
              </p>
            )}
            <TagList tags={task.tags} className="mt-3" />
          </SheetHeader>
          <div className="mt-7 space-y-6">
            <div>
              <p className="field-label">Description</p>
              <RichText
                html={task.description}
                fallback="No description added."
                className="mt-2 text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-5 border-y border-border py-5">
              <Info label="Assigned to" value={task.assigneeName || "Unassigned"} />
              <Info
                label="Due date"
                value={task.dueDate ? formatDue(task.dueDate) : "No due date"}
              />
              <Info
                label="Created by"
                value={task.createdByMe ? "You" : task.createdByName || "—"}
              />
              <div>
                <p className="field-label">Status</p>
                <Select
                  value={task.status}
                  disabled={!task.canEdit}
                  onValueChange={(v) =>
                    void setTaskStatus(task.slug, v as TaskStatus).catch(() => {})
                  }
                >
                  <SelectTrigger className="mt-1.5" aria-label="Status">
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
              </div>
            </div>
            <div>
              <p className="field-label">Activity</p>
              {history.length ? (
                <div className="mt-3 space-y-3">
                  {history.map((a) => (
                    <div key={a.id} className="flex gap-3">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm">{a.text}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(a.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No activity recorded yet.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-3">
              {task.canEdit && task.status !== "Done" && (
                <Button onClick={() => void setTaskStatus(task.slug, "Done").catch(() => {})}>
                  <Check />
                  Mark complete
                </Button>
              )}
              {task.canEdit && (
                <Button variant="outline" onClick={() => editTask(task)}>
                  Edit
                </Button>
              )}
              {task.canDelete && (
                <Button
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  onClick={() => setConfirm(true)}
                >
                  Delete
                </Button>
              )}
              {!task.canEdit && (
                <p className="text-xs text-muted-foreground">
                  Only the assignee, the creator or a manager can change this task.
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this task?"
        description="This permanently removes the task for everyone in the workspace."
        confirmLabel="Delete task"
        onConfirm={() => {
          void deleteTask(task.slug).catch(() => {});
          setConfirm(false);
        }}
      />
    </>
  );
}

const keepOnFieldEscape = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  if (t?.getAttribute?.("aria-invalid") === "true") e.preventDefault();
};
const formDialog = "max-h-[92dvh] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:p-6";
const formFooter =
  "sticky -bottom-4 sm:-bottom-6 -mx-4 sm:-mx-6 border-t bg-card px-4 py-3 sm:px-6 gap-2 [&>button]:h-11 sm:[&>button]:h-10";
const NO_PROJECT = "__none__";

/** The main task of a sub-task, read-only: its details and who works on its sub-tasks. */
function ParentTaskDialog({
  slug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { taskList } = useMiniOps();
  const parent = taskList.find((t) => t.slug === slug);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {parent ? (
          <>
            <DialogHeader className="text-left">
              <div className="mb-2 flex gap-2">
                <PriorityBadge priority={parent.priority} />
                <StatusBadge status={parent.status} />
              </div>
              <DialogTitle className="text-xl">{parent.title}</DialogTitle>
              <DialogDescription>{parent.projectName || "No project"}</DialogDescription>
              <TagList tags={parent.tags} className="mt-2" />
            </DialogHeader>
            <div className="space-y-5">
              <RichText
                html={parent.description}
                fallback="No description added."
                className="text-foreground"
              />
              <div className="grid grid-cols-2 gap-5 border-y border-border py-4">
                <Info
                  label="Due date"
                  value={parent.dueDate ? formatDue(parent.dueDate) : "No due date"}
                />
                <Info
                  label="Created by"
                  value={parent.createdByMe ? "You" : parent.createdByName || "—"}
                />
              </div>
              {parent.subtasks.length > 0 && (
                <div>
                  <p className="field-label">Sub-tasks</p>
                  <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                    {parent.subtasks.map((s) => (
                      <div
                        key={s.slug}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{s.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {s.assigneeName || "Unassigned"}
                            {s.dueDate && ` · ${formatDue(s.dueDate)}`}
                          </span>
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>Task not available</DialogTitle>
            <DialogDescription>This task couldn’t be loaded.</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskForm() {
  const {
    taskFormOpen,
    setTaskFormOpen,
    editingTask,
    saveTask,
    projects: myProjects,
    me,
  } = useEmployee();
  useNeeds(...(taskFormOpen ? (["projects", "tasks", "time"] as const) : []));
  const { projects: allProjects, uploadTaskImage } = useMiniOps();
  const editing = !!editingTask;
  // New tasks can go in any project you can see; your own projects come first.
  const projectOptions = useMemo(() => {
    const mine = new Set(myProjects.map((p) => p.id));
    return [...allProjects].sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)));
  }, [allProjects, myProjects]);
  const [draft, setDraft] = useState<TaskInput>({
    title: "",
    description: "",
    project: "",
    assignee: "",
    tags: [],
    priority: "Medium",
    status: "To Do",
    dueDate: "",
  });
  const [errs, setErrs] = useState<{ title?: string }>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setErrs({});
    if (!taskFormOpen) return;
    setDraft(
      editingTask
        ? {
            title: editingTask.title,
            description: editingTask.description,
            project: editingTask.project ?? "",
            assignee: editingTask.assignee ? String(editingTask.assignee) : "",
            tags: editingTask.tags,
            priority: editingTask.priority,
            status: editingTask.status,
            dueDate: editingTask.dueDate ?? "",
          }
        : {
            title: "",
            description: "",
            project: myProjects[0]?.id ?? "",
            assignee: String(me.userId),
            tags: [],
            priority: "Medium",
            status: "To Do",
            dueDate: "",
          },
    );
  }, [taskFormOpen, editingTask, myProjects, me.userId]);
  const submit = async () => {
    if (!draft.title.trim()) {
      setErrs({ title: "Add a task title." });
      return;
    }
    setSaving(true);
    try {
      await saveTask(
        { ...draft, title: draft.title.trim(), description: draft.description.trim() },
        editingTask?.slug,
      );
      setTaskFormOpen(false);
    } catch {
      /* toast already shown */
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={taskFormOpen} onOpenChange={setTaskFormOpen}>
      <DialogContent className={formDialog} onEscapeKeyDown={keepOnFieldEscape}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {editingTask?.parent
              ? `A sub-task of “${editingTask.parentTitle}”.`
              : editing
                ? "Update the task’s details."
                : "Add a task for yourself."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Task title">
            <Input
              className="h-11 sm:h-10"
              enterKeyHint="next"
              aria-invalid={!!errs.title}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              autoFocus
            />
            {errs.title && (
              <span role="alert" className="text-xs font-normal text-danger">
                {errs.title}
              </span>
            )}
          </Field>
          <Field label="Description">
            <RichTextEditor
              value={draft.description}
              onChange={(html) => setDraft((d) => ({ ...d, description: html }))}
              placeholder="Details, links or acceptance criteria"
              onUploadImage={uploadTaskImage}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project">
              <Select
                value={draft.project || NO_PROJECT}
                onValueChange={(v) => setDraft({ ...draft, project: v === NO_PROJECT ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>No project</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={draft.priority}
                onValueChange={(v) => setDraft({ ...draft, priority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due date">
              <DateInput
                label="Due date"
                value={draft.dueDate}
                onChange={(v) => setDraft({ ...draft, dueDate: v })}
              />
            </Field>
            <Field label="Status">
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as TaskStatus })}
              >
                <SelectTrigger>
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
            </Field>
          </div>
        </div>
        <DialogFooter className={formFooter}>
          <Button variant="outline" onClick={() => setTaskFormOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TimeForm() {
  const {
    timeFormOpen,
    setTimeFormOpen,
    editingTime,
    setEditingTime,
    saveTime,
    timeFormProject,
    tasks,
  } = useEmployee();
  useNeeds(...(timeFormOpen ? (["projects", "tasks"] as const) : []));
  const { projects } = useMiniOps();
  const [draft, setDraft] = useState({
    date: "",
    project: "",
    task: "",
    hours: "",
    description: "",
    billable: true,
  });
  const [errs, setErrs] = useState<{ date?: string; hours?: string }>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setErrs({});
    if (!timeFormOpen) return;
    setDraft(
      editingTime
        ? {
            date: editingTime.date,
            project: editingTime.project ?? "",
            task: editingTime.task ?? "",
            hours: String(editingTime.hours),
            description: editingTime.description,
            billable: editingTime.billable,
          }
        : {
            date: todayIso(),
            project: timeFormProject,
            task: "",
            hours: "",
            description: "",
            billable: !!timeFormProject,
          },
    );
  }, [timeFormOpen, editingTime, timeFormProject]);
  const projectTasks = tasks.filter((t) =>
    draft.project ? t.project === draft.project : !t.project,
  );
  const parsed = parseHours(draft.hours);
  const submit = async () => {
    const e: typeof errs = {};
    if (!draft.date) e.date = "Choose a date.";
    else if (draft.date > todayIso()) e.date = "You can’t log time in the future.";
    if (parsed === null || parsed <= 0) e.hours = "Enter hours like 1.5, 1:30 or 90m.";
    else if (parsed > 24) e.hours = "That’s more than a day.";
    setErrs(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await saveTime(
        {
          date: draft.date,
          project: draft.project || null,
          task: draft.task || null,
          hours: (Math.round(parsed! * 100) / 100).toFixed(2),
          start_time: editingTime?.startTime ?? null,
          description: draft.description.trim(),
          billable: draft.billable,
        },
        editingTime?.slug,
      );
      setTimeFormOpen(false);
      setEditingTime(null);
    } catch {
      /* toast already shown */
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open={timeFormOpen}
      onOpenChange={(open) => {
        setTimeFormOpen(open);
        if (!open) setEditingTime(null);
      }}
    >
      <DialogContent className={formDialog} onEscapeKeyDown={keepOnFieldEscape}>
        <DialogHeader>
          <DialogTitle>{editingTime ? "Edit time entry" : "Log time"}</DialogTitle>
          <DialogDescription>Track the time you spent on your work.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <DateInput
              label="Date"
              error={errs.date ?? ""}
              value={draft.date}
              onChange={(v) => setDraft({ ...draft, date: v })}
            />
          </Field>
          <Field label="Hours">
            <Input
              className="h-11 sm:h-10"
              inputMode="decimal"
              placeholder="1:30"
              aria-invalid={!!errs.hours}
              value={draft.hours}
              onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
              autoFocus
            />
            {errs.hours ? (
              <span role="alert" className="text-xs font-normal text-danger">
                {errs.hours}
              </span>
            ) : (
              <span className="text-xs font-normal text-muted-foreground">
                {parsed && parsed > 0 ? `= ${fmtHours(parsed)}` : "e.g. 1.5, 1:30 or 90m"}
              </span>
            )}
          </Field>
          <Field label="Project">
            <Select
              value={draft.project || NO_PROJECT}
              onValueChange={(v) => {
                const project = v === NO_PROJECT ? "" : v;
                setDraft({
                  ...draft,
                  project,
                  task: "",
                  billable: project ? draft.billable : false,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>Agency overhead</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Task">
            <Select
              value={draft.task || NO_PROJECT}
              onValueChange={(v) => setDraft({ ...draft, task: v === NO_PROJECT ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>General work</SelectItem>
                {projectTasks.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea
              value={draft.description}
              maxLength={300}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
          <Field label="Time type" className="sm:col-span-2">
            <Select
              value={draft.billable ? "Billable" : "Non-billable"}
              onValueChange={(v) => setDraft({ ...draft, billable: v === "Billable" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Billable">Billable</SelectItem>
                <SelectItem value="Non-billable">Non-billable</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter className={formFooter}>
          <Button variant="outline" onClick={() => setTimeFormOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : editingTime ? "Save changes" : "Log time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-sm font-medium", className)}>
      {label}
      {children}
    </label>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="mt-1.5 text-sm font-medium">{value}</p>
    </div>
  );
}

const DAY_MS = 864e5;
const dayDiff = (iso: string) =>
  Math.round(
    (new Date(`${iso}T12:00:00`).getTime() - new Date(`${todayIso()}T12:00:00`).getTime()) / DAY_MS,
  );

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );

/** "Today", "Tomorrow", "Yesterday", a weekday within the next week, else "Oct 12". */
export function formatDue(date: string) {
  const d = dayDiff(date);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d > 1 && d < 7)
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
      new Date(`${date}T12:00:00`),
    );
  return formatDate(date);
}

/** "just now", "5 min ago", "3 hr ago", "Yesterday", "Mon", "Sep 23". */
export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 6 * 3600) return `${Math.floor(diff / 3600)} hr ago`;
  const day = new Date(iso);
  const d = dayDiff(
    `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
  );
  if (d === 0)
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(day);
  if (d === -1) return "Yesterday";
  if (d > -7) return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day);
  return formatDate(iso.slice(0, 10));
}
