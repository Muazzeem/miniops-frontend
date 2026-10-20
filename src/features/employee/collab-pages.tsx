import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Mail, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChangePasswordForm } from "@/features/auth";
import { NotificationPrefsList } from "@/features/notifications";
import { useMiniOps, type Member } from "@/features/store";
import { cn } from "@/lib/utils";
import { useEmployee } from "./store";
import { Avatar, EmptyState, PageHeader, Section, StatusBadge, formatDue, initialsOf } from "./ui";

type WorkingOn = { title: string; project: string; inProgress: boolean; open: number };

/** What a teammate is working on: their in-progress task, else their next open one. */
function useWorkingOn() {
  const { taskList } = useMiniOps();
  return useMemo(() => {
    const map = new Map<number, WorkingOn>();
    const ordered = [...taskList].sort((a, b) =>
      (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
    );
    for (const t of ordered) {
      if (!t.assignee || t.status === "Done") continue;
      const cur = map.get(t.assignee);
      const inProgress = t.status === "In Progress";
      const pick = !cur || (inProgress && !cur.inProgress);
      map.set(t.assignee, {
        ...(pick ? { title: t.title, project: t.projectName, inProgress } : cur),
        open: (cur?.open ?? 0) + 1,
      } as WorkingOn);
    }
    return map;
  }, [taskList]);
}

export function TeamPage() {
  const { people, me } = useEmployee();
  const workingOn = useWorkingOn();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Member | null>(null);
  const list = people.filter((p) =>
    `${p.name} ${p.title} ${p.role} ${p.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  const current = (p: Member) => {
    const w = workingOn.get(p.id);
    if (!w) return "No open tasks";
    return w.inProgress ? `Working on ${w.title}` : `Next: ${w.title}`;
  };
  return (
    <>
      <PageHeader title="Team" description={`The people you work with at ${me.workspace}.`} />
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="rounded-xl pl-9"
          placeholder="Search people..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {!list.length ? (
        <Section title="People">
          <EmptyState
            icon={Users}
            title="No people found"
            description="Try a different name or role."
          />
        </Section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <button
              key={p.slug}
              onClick={() => setOpen(p)}
              className="surface flex items-center gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <Avatar initials={initialsOf(p.name)} photo={p.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {p.name}
                  {p.isMe && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(You)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{p.title || p.role}</p>
                <p className="mt-2 truncate text-xs text-muted-foreground">{current(p)}</p>
              </div>
              <StatusBadge status={p.role} />
            </button>
          ))}
        </div>
      )}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {open && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="sr-only">{open.name}</SheetTitle>
                <SheetDescription className="sr-only">Team member profile</SheetDescription>
              </SheetHeader>
              <div className="mt-2 flex flex-col items-center text-center">
                <Avatar initials={initialsOf(open.name)} photo={open.avatarUrl} size="lg" />
                <h2 className="mt-4 text-xl font-semibold">{open.name}</h2>
                <p className="text-sm text-muted-foreground">{open.title || "No job title"}</p>
                <div className="mt-3">
                  <StatusBadge status={open.role} />
                </div>
              </div>
              <dl className="mt-8 grid gap-4 rounded-2xl bg-secondary/60 p-5 text-sm">
                <div>
                  <dt className="field-label">Current work</dt>
                  <dd className="mt-1 font-medium">
                    {current(open)}
                    {workingOn.get(open.id)?.project && (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {workingOn.get(open.id)!.project}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="field-label">Open tasks</dt>
                  <dd className="mt-1 font-medium">{workingOn.get(open.id)?.open ?? 0}</dd>
                </div>
                <div>
                  <dt className="field-label">Email</dt>
                  <dd className="mt-1 font-medium">{open.email}</dd>
                </div>
                <div>
                  <dt className="field-label">Joined</dt>
                  <dd className="mt-1 font-medium">{formatDue(open.joinedAt.slice(0, 10))}</dd>
                </div>
              </dl>
              {!open.isMe && (
                <Button asChild variant="outline" className="mt-6 w-full rounded-xl">
                  <a href={`mailto:${open.email}`}>
                    <Mail />
                    Email {open.name.split(" ")[0]}
                  </a>
                </Button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

const MODULE_LABELS: Record<string, string> = {
  projects: "Projects",
  tasks: "Tasks",
  clients: "Clients",
  time: "Time",
  expenses: "Expenses",
  reports: "Reports",
  financials: "Financials",
};

export function SettingsPage() {
  const { me } = useEmployee();
  const { activeWorkspace, signOut, user } = useMiniOps();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Settings" description="Your personal MiniOps preferences." />
      <Tabs defaultValue="profile" className="mx-auto max-w-3xl">
        <TabsList className="mb-5 rounded-xl bg-secondary p-1">
          <TabsTrigger value="profile" className="rounded-lg">
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="access" className="rounded-lg">
            Access
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-lg">
            Account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Section title="Profile" caption="Your name, photo, and contact details">
            <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-center">
              <Avatar initials={me.initials} photo={me.photo} size="lg" />
              <div className="flex-1">
                <p className="font-semibold">{me.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[me.title, me.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate({ to: "/employee/profile" })}
              >
                Edit profile
              </Button>
            </div>
          </Section>
        </TabsContent>
        <TabsContent value="notifications">
          <Section
            title="Notifications"
            caption="Choose what you're notified about. Applies to all your workspaces."
          >
            <NotificationPrefsList className="px-5 pb-2" />
          </Section>
        </TabsContent>
        <TabsContent value="access">
          <Section
            title={`Your access in ${activeWorkspace.name}`}
            caption="Set by a workspace owner or admin on the Team page"
          >
            <div className="px-5 pb-5">
              <div className="mb-4 flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-primary" />
                Role: <StatusBadge status={me.roleLabel} />
              </div>
              <dl className="divide-y rounded-xl border">
                {Object.entries(activeWorkspace.permissions ?? {}).map(([module, level]) => (
                  <div
                    key={module}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <dt>{MODULE_LABELS[module] ?? module}</dt>
                    <dd
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        level === "edit"
                          ? "bg-success-muted text-success"
                          : level === "view"
                            ? "bg-primary-light text-primary-dark"
                            : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {level === "edit" ? "Can edit" : level === "view" ? "Can view" : "No access"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Section>
        </TabsContent>
        <TabsContent value="account">
          <Section title="Account" caption="How you sign in to MiniOps">
            <div className="grid gap-4 px-5 pb-5">
              <div className="rounded-xl bg-secondary/60 p-4 text-sm">
                <p className="font-medium">{me.email}</p>
                <p className="mt-1 text-muted-foreground">
                  {user?.auth_provider === "google"
                    ? "You signed up with Google."
                    : "You signed up with your email and password."}
                </p>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold">
                  {user?.has_password ? "Change password" : "Set a password"}
                </p>
                <ChangePasswordForm />
              </div>
              <div>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() =>
                    void signOut()
                      .then(() => toast.success("Signed out"))
                      .catch(() => toast.info("Signed out on this device."))
                      .finally(() => navigate({ to: "/" }))
                  }
                >
                  <LogOut />
                  Sign out
                </Button>
              </div>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </>
  );
}
