import type { ApiNotification, NotificationKind } from "@/lib/api";

/** Display kind: deadline reminders get their own look; the rest follow the backend. */
export type NotificationDisplayKind = NotificationKind | "deadline";

export function notificationKind(n: ApiNotification): NotificationDisplayKind {
  if (n.verb === "task.due_today" || n.verb === "task.overdue") return "deadline";
  return n.data.kind ?? "team";
}

export const NOTIFICATION_KIND_LABELS: Record<NotificationDisplayKind, string> = {
  task: "Tasks",
  deadline: "Deadlines",
  time: "Time",
  expense: "Expenses",
  project: "Projects",
  team: "Team",
};
