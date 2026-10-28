import { Link, useNavigate } from "@tanstack/react-router";
import type { PermissionModule } from "@/lib/api";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  MessageSquare,
  FolderKanban,
  CalendarClock,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Command,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  TrendingUp,
  UsersRound,
  Users,
  Activity,
  Gauge,
  CircleDollarSign,
  BriefcaseBusiness,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMiniOps, useNeeds } from "@/features/store";
import { NotificationCenter, ProfileMenu } from "./header";
import { cn } from "@/lib/utils";
import { CURRENCIES, browserTimezone, timezoneOptions } from "@/lib/workspace-options";
import { SearchableSelect } from "./select-search";

const primaryNav = [
  ["/app", "Overview", LayoutDashboard],
  ["/projects", "Projects", FolderKanban],
  ["/tasks", "Tasks", CheckSquare],
  ["/clients", "Clients", UsersRound],
  ["/team", "Team", Users],
  ["/chat", "Chat", MessageSquare],
  ["/time", "Time", Clock3],
  ["/expenses", "Expenses", Receipt],
] as const;
const adminNav = [["/settings", "Settings", Settings]] as const;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/app"
      className={cn("flex h-full items-center gap-2.5 font-semibold", compact && "justify-center")}
    >
      {compact ? (
        <img src="/apple-touch-icon.png" alt="MiniOps" className="size-8 shrink-0 rounded-lg" />
      ) : (
        <img src="/miniops-logo.png" alt="MiniOps" className="h-8 w-auto" />
      )}
    </Link>
  );
}

function WorkspacePicker({ compact = false }: { compact?: boolean }) {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useMiniOps();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Web Development");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState(browserTimezone);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkspace({ name: name.trim(), industry, currency, timezone });
    setName("");
    setCreating(false);
    navigate({ to: "/app" });
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "mb-4 h-auto w-full justify-start gap-3 border-transparent bg-gradient-to-br from-primary-soft to-accent px-2.5 py-2.5 text-left shadow-none hover:bg-accent",
              compact && "mx-auto size-11 justify-center p-0",
            )}
            title="Switch workspace"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
              {activeWorkspace.name.charAt(0)}
            </span>
            {!compact && (
              <>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-xs">{activeWorkspace.name}</b>
                  <small className="block text-muted-foreground">{activeWorkspace.role}</small>
                </span>
                <ChevronDown className="size-3 text-primary" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Your Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => {
                switchWorkspace(workspace.id);
                navigate({ to: "/app" });
              }}
              className="grid grid-cols-[16px_minmax(0,1fr)]"
            >
              <Check
                className={cn(
                  "size-4 text-primary",
                  workspace.id !== activeWorkspace.id && "opacity-0",
                )}
              />
              <span className="truncate">{workspace.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus /> Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Create workspace</DialogTitle>
              <DialogDescription>
                Set up a separate space for another agency or business.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <Label htmlFor="workspace-name">Agency / Workspace Name</Label>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                  required
                />
              </label>
              <label>
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Web Development",
                      "UX/UI Design",
                      "Branding",
                      "Marketing",
                      "Software Development",
                      "IT Services",
                      "Consulting",
                      "Creative Agency",
                    ].map((item) => (
                      <SelectItem value={item} key={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label>
                <Label>Default Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem value={c.value} key={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="sm:col-span-2">
                <Label>Timezone</Label>
                <SearchableSelect
                  className="mt-1.5"
                  aria-label="Timezone"
                  options={timezoneOptions()}
                  value={timezone}
                  onChange={(v) => v && setTimezone(v)}
                  searchPlaceholder="Search city or offset…"
                />
              </div>
              <label className="sm:col-span-2">
                <Label htmlFor="workspace-logo">Logo (optional)</Label>
                <Input id="workspace-logo" type="file" accept="image/*" className="mt-1.5" />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Workspace</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Sidebar entries that depend on a permission; hidden when the member has no access.
const NAV_PERMISSION: Partial<Record<string, PermissionModule>> = {
  "/projects": "projects",
  "/tasks": "tasks",
  "/clients": "clients",
  "/time": "time",
  "/expenses": "expenses",
};
function Nav({ close, compact = false }: { close?: () => void; compact?: boolean }) {
  const { live, can, chatUnread } = useMiniOps();
  const visible = primaryNav.filter(([to]) => {
    const module = NAV_PERMISSION[to];
    return !live || !module || can(module);
  });
  const links = [...visible, ...adminNav];
  return (
    <TooltipProvider delayDuration={150}>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        {links.map(([to, label, Icon], index) => {
          const link = (
            <Link
              to={to}
              onClick={close}
              aria-label={label}
              activeProps={{
                className:
                  "bg-primary-soft text-sidebar-accent-foreground font-semibold [&>svg]:text-primary",
              }}
              inactiveProps={{
                className: "text-muted-foreground hover:bg-secondary hover:text-foreground",
              }}
              className={cn(
                "flex h-10 items-center gap-3 rounded-[10px] text-sm transition-colors duration-200",
                compact ? "mx-auto w-10 justify-center" : "px-3",
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={1.8} />
              {!compact && <span className="truncate">{label}</span>}
              {to === "/chat" &&
                chatUnread > 0 &&
                (compact ? (
                  <span className="absolute ml-5 -mt-5 size-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
                ) : (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                ))}
            </Link>
          );
          return (
            <div key={to}>
              {index === visible.length && <span className="my-3 block h-px bg-border/70" />}
              {compact ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </div>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState(false);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden overflow-hidden bg-sidebar py-3 shadow-[1px_0_0_var(--border)] transition-[width] duration-200 ease-out lg:flex lg:flex-col",
          collapsed ? "w-[72px] px-2" : "w-60 px-3",
        )}
      >
        <div className={cn("mb-3 h-11", !collapsed && "px-2")}>
          <Logo compact={collapsed} />
        </div>
        <WorkspacePicker compact={collapsed} />
        <Nav compact={collapsed} />
        <div className="pt-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-full"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              className={cn("transition-transform duration-200", collapsed && "rotate-180")}
            />
          </Button>
        </div>
      </aside>
      <div
        className={cn(
          "min-w-0 transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[72px]" : "lg:pl-60",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-card/85 shadow-[0_1px_0_var(--border)] px-4 backdrop-blur-xl md:px-6">
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-72 flex-col p-4">
                <SheetTitle className="mb-3 h-10">
                  <Logo />
                </SheetTitle>
                <WorkspacePicker />
                <Nav />
              </SheetContent>
            </Sheet>
          </div>
          <Button
            onClick={() => setSearch(true)}
            variant="outline"
            className="hidden h-10 w-72 justify-start gap-2 border-transparent bg-secondary text-muted-foreground shadow-none hover:border-primary/10 hover:bg-accent md:flex"
          >
            <Search className="size-4" />
            Search MiniOps <kbd className="ml-auto">⌘K</kbd>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={() => setSearch(true)}
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Search"
            >
              <Search className="size-4" />
            </Button>
            <NotificationCenter />
            <ProfileMenu />
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 md:p-6 lg:p-8">{children}</main>
      </div>
      <CommandSearch open={search} setOpen={setSearch} />
    </div>
  );
}

function CommandSearch({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  useNeeds(...(open ? (["projects", "clients", "members", "tasks", "expenses"] as const) : []));
  const [q, setQ] = useState("");
  const { projects, clients, team, tasks, expenses } = useMiniOps();
  const results = [
    ...projects.map((x) => ({ label: x.name, type: "Project", to: "/projects/" + x.id })),
    ...clients.map((x) => ({
      label: String(x[1] ?? ""),
      type: "Client",
      to: "/clients/" + String(x[0] ?? ""),
    })),
    ...team.map((x) => ({
      label: String(x[1] ?? ""),
      type: "Team",
      to: "/team/" + String(x[0] ?? ""),
    })),
    ...tasks.map((x) => ({ label: String(x[0] ?? ""), type: "Task", to: "/tasks" })),
    ...expenses.map((x) => ({ label: String(x[0] ?? ""), type: "Expense", to: "/expenses" })),
  ]
    .filter((x) => x.label.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] translate-y-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Search MiniOps</DialogTitle>
          <DialogDescription>Search the current workspace.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center border-b px-4">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, clients, team, tasks and expenses…"
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <Command className="size-4" />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {results.length ? (
            results.map((r, i) => (
              <a
                key={i}
                href={r.to}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                <span>{r.label}</span>
                <small className="text-muted-foreground">{r.type}</small>
              </a>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No results in this workspace.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold md:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
function Sparkline({ data, tone }: { data: number[]; tone: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data),
    max = Math.max(...data),
    r = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / r) * 24}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className={cn("h-7 w-16 shrink-0 xl:w-20", tone)}
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
type Tone = "primary" | "cost" | "profit" | "violet";
const toneOf = (label: string): Tone => {
  const l = label.toLowerCase();
  if (/cost|expense|overhead|recurring|renew|budget/.test(l)) return "cost";
  if (/profit|billable|margin|revenue|capacity|available/.test(l) && !/non-billable/.test(l))
    return "profit";
  if (/hour|time|member|team/.test(l)) return "primary";
  return "violet";
};
const iconOf = (label: string, tone: Tone) => {
  const l = label.toLowerCase();
  if (/member|team/.test(l)) return Users;
  if (/hour|time|billable/.test(l)) return Clock3;
  if (/utiliz|capacity|used/.test(l)) return Gauge;
  if (/renew|next/.test(l)) return CalendarClock;
  if (/project/.test(l)) return BriefcaseBusiness;
  if (tone === "cost") return Receipt;
  if (tone === "profit") return CircleDollarSign;
  return Activity;
};
/** Reusable MiniOps summary card — mirrors the Overview KPI style. */
export function SummaryCard({
  label,
  value,
  trend,
  tone,
  spark,
  hint,
  icon,
}: {
  label: string;
  value: string;
  trend?: string;
  tone?: Tone;
  spark?: number[];
  hint?: string;
  icon?: ReactNode;
}) {
  const t = tone ?? toneOf(label);
  const Icon = iconOf(label, t);
  const toneClass =
    t === "profit"
      ? "bg-positive-soft text-positive"
      : t === "cost"
        ? "bg-warning-soft text-warning"
        : t === "primary"
          ? "bg-info-soft text-info"
          : "bg-primary-soft text-primary";
  const line =
    t === "profit"
      ? "text-positive"
      : t === "cost"
        ? "text-warning"
        : t === "primary"
          ? "text-info"
          : "text-primary";
  const surface =
    t === "profit"
      ? "from-positive-soft/60"
      : t === "cost"
        ? "from-warning-soft/50"
        : t === "primary"
          ? "from-info-soft/60"
          : "from-primary-soft/80";
  return (
    <div
      className={cn(
        "summary-card group flex min-w-0 flex-col rounded-2xl bg-card bg-gradient-to-br to-card to-65% p-5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-card-hover md:p-6",
        surface,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", toneClass)}>
          {icon ?? <Icon className="size-[18px]" />}
        </span>
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-muted-foreground max-sm:line-clamp-2 sm:truncate">
          {label}
        </p>
        {spark && (
          <span className="hidden sm:block">
            <Sparkline data={spark} tone={line} />
          </span>
        )}
      </div>
      <strong className="mt-5 block truncate font-mono text-[1.625rem] font-semibold leading-none tracking-tight tabular-nums md:text-[1.875rem]">
        {value}
      </strong>
      {(trend || hint) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend && (
            <span className="inline-flex items-center rounded-full bg-positive-soft px-1.5 py-0.5 font-semibold text-positive">
              <TrendingUp className="mr-1 size-3" />
              {trend}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}
export const Metric = SummaryCard;
export function Status({ children }: { children: ReactNode }) {
  const t = String(children);
  const c = ["Healthy", "Active", "Done", "Approved", "Responded"].includes(t)
    ? "bg-positive-soft text-positive"
    : ["Attention", "In Progress", "In Review", "Pending", "Invited", "Waiting", "New"].includes(t)
      ? "bg-warning-soft text-warning"
      : ["At Risk", "Urgent", "Suspended", "Overdue"].includes(t)
        ? "bg-danger-soft text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
        c,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
