import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  CheckSquare,
  Clock,
  FolderKanban,
  Mail,
  MailOpen,
  Receipt,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/miniops/core";
import { useMiniOps } from "@/features/store";
import { notificationPrefsApi, type ApiNotification, type NotificationCategory } from "@/lib/api";
import {
  NOTIFICATION_KIND_LABELS,
  notificationKind,
  type NotificationDisplayKind,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<NotificationDisplayKind, [typeof Bell, string]> = {
  task: [CheckSquare, "bg-primary-soft text-primary"],
  deadline: [CalendarClock, "bg-warning-soft text-warning"],
  time: [Clock, "bg-info-soft text-info"],
  expense: [Receipt, "bg-info-soft text-info"],
  project: [FolderKanban, "bg-info-soft text-info"],
  team: [Users, "bg-positive-soft text-positive"],
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Your notification settings (stored on the server, shared by every workspace). */
export function useNotificationPrefs() {
  const { live, user } = useMiniOps();
  const queryClient = useQueryClient();
  const key = ["notification-prefs", user?.id];
  const query = useQuery({ queryKey: key, queryFn: notificationPrefsApi.get, enabled: live });
  const mutation = useMutation({
    mutationFn: (change: Record<string, boolean>) => notificationPrefsApi.update(change),
    onMutate: (change) => {
      const previous = queryClient.getQueryData<NotificationCategory[]>(key);
      queryClient.setQueryData<NotificationCategory[]>(key, (list) =>
        list?.map((c) => (c.key in change ? { ...c, enabled: change[c.key]! } : c)),
      );
      return previous;
    },
    onError: (e, _change, previous) => {
      queryClient.setQueryData(key, previous);
      toast.error(errorText(e));
    },
    onSuccess: (list) => {
      queryClient.setQueryData(key, list);
      toast.success("Notification settings saved");
    },
  });
  return {
    categories: query.data ?? [],
    loading: query.isPending && live,
    error: query.error ? errorText(query.error) : null,
    toggle: (key: string, enabled: boolean) => mutation.mutate({ [key]: enabled }),
  };
}

/** Switches for each notification category. */
export function NotificationPrefsList({ className }: { className?: string }) {
  const { categories, loading, error, toggle } = useNotificationPrefs();
  if (loading) return <p className="py-6 text-sm text-muted-foreground">Loading settings…</p>;
  if (error) return <p className="py-6 text-sm text-danger">{error}</p>;
  return (
    <div className={cn("divide-y", className)}>
      {categories.map((c) => (
        <label
          key={c.key}
          className="flex cursor-pointer items-center justify-between gap-4 py-3.5"
        >
          <span>
            <span className="block text-sm font-medium">{c.label}</span>
            <span className="block text-xs text-muted-foreground">{c.description}</span>
          </span>
          <Switch
            checked={c.enabled}
            onCheckedChange={(v) => toggle(c.key, v)}
            aria-label={c.label}
          />
        </label>
      ))}
    </div>
  );
}

type Filter = "all" | "unread" | NotificationDisplayKind;

/** The full notification list with filters and per-item actions. */
export function NotificationFeed({
  onOpen,
  settings,
}: {
  onOpen: (n: ApiNotification) => void;
  /** Link or button to the notification settings. */
  settings?: ReactNode;
}) {
  const {
    apiNotifications,
    notifications: unread,
    notificationsState,
    readNotification,
    unreadNotification,
    deleteNotification,
    markRead,
  } = useMiniOps();
  const [filter, setFilter] = useState<Filter>("all");
  const kinds = useMemo(
    () =>
      (Object.keys(NOTIFICATION_KIND_LABELS) as NotificationDisplayKind[]).filter((k) =>
        apiNotifications.some((n) => notificationKind(n) === k),
      ),
    [apiNotifications],
  );
  const shown = apiNotifications.filter((n) =>
    filter === "all" ? true : filter === "unread" ? n.unread : notificationKind(n) === filter,
  );

  const chip = (value: Filter, label: string) => (
    <button
      key={value}
      onClick={() => setFilter(value)}
      className={cn(
        "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        filter === value
          ? "bg-primary-soft text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <section className="rounded-2xl bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {chip("all", "All")}
          {chip("unread", unread ? `Unread (${unread})` : "Unread")}
          {kinds.length > 1 && kinds.map((k) => chip(k, NOTIFICATION_KIND_LABELS[k]))}
        </div>
        <div className="flex items-center gap-2">
          {settings}
          <Button variant="outline" size="sm" disabled={!unread} onClick={markRead}>
            <CheckCheck />
            Mark all as read
          </Button>
        </div>
      </div>
      {notificationsState.loading ? (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          Loading notifications…
        </p>
      ) : notificationsState.error ? (
        <div className="px-6 py-12 text-center text-sm">
          <p className="text-danger">{notificationsState.error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={notificationsState.retry}>
            Try again
          </Button>
        </div>
      ) : shown.length ? (
        <ul className="divide-y">
          {shown.map((n) => {
            const kind = notificationKind(n);
            const [Icon, tone] = KIND_STYLE[kind];
            const id = String(n.id);
            return (
              <li
                key={n.id}
                className={cn(
                  "group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent/60",
                  n.unread && "bg-primary-soft/40",
                )}
              >
                <button
                  className="flex min-w-0 flex-1 gap-3 text-left"
                  onClick={() => {
                    readNotification(id);
                    onOpen(n);
                  }}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      n.unread ? tone : "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <b className="truncate text-sm">{n.data.title ?? "Notification"}</b>
                      {n.unread && (
                        <span
                          className="size-2 shrink-0 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {n.description}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {[when(n.timestamp), n.data.project_name].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={n.unread ? "Mark as read" : "Mark as unread"}
                    title={n.unread ? "Mark as read" : "Mark as unread"}
                    onClick={() => (n.unread ? readNotification(id) : unreadNotification(id))}
                  >
                    {n.unread ? <MailOpen /> : <Mail />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-danger"
                    aria-label="Delete notification"
                    title="Delete"
                    onClick={() =>
                      deleteNotification(id).catch((e: unknown) => toast.error(errorText(e)))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Bell className="size-5" />
          </span>
          <p className="mt-3 text-sm font-medium">
            {filter === "all" ? "No notifications yet" : "Nothing here"}
          </p>
          <p className="text-xs text-muted-foreground">
            {filter === "unread"
              ? "You're all caught up."
              : "Assignments, reviews and reminders will appear here."}
          </p>
        </div>
      )}
    </section>
  );
}

/** Employer view: /notifications. */
export function NotificationsPage() {
  const { live } = useMiniOps();
  const navigate = useNavigate();
  const open = (n: ApiNotification) => {
    const kind = notificationKind(n);
    const slug = n.data.slug;
    if (kind === "time") void navigate({ to: "/time" });
    else if (kind === "expense") void navigate({ to: "/expenses" });
    else if (kind === "team") void navigate({ to: "/team" });
    else if (kind === "project")
      void navigate({ to: slug ? (`/projects/${slug}` as never) : "/projects" });
    else if (slug && n.verb !== "task.deleted") void navigate({ to: `/tasks/${slug}` as never });
    else void navigate({ to: "/tasks" });
  };
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Assignments, reviews, reminders and changes to your work."
      />
      {live ? (
        <div className="max-w-4xl">
          <NotificationFeed
            onOpen={open}
            settings={
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void navigate({ to: "/settings", search: { section: "Notifications" } })
                }
              >
                Settings
              </Button>
            }
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to see your notifications.</p>
      )}
    </>
  );
}
