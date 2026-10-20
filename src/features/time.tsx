import { Fragment, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Clock3, List, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Metric, PageHeader } from "@/components/miniops/core";
import { Section } from "@/components/miniops/forms";
import { SearchableSelect } from "@/components/miniops/select-search";
import {
  DateInput,
  DateRangePicker,
  TimeInput,
  formatDisplayDate,
  formatTime,
  toIso,
  type IsoRange,
} from "@/components/miniops/date-time";
import { money } from "@/data/mock";
import { fmtHours, parseHours } from "@/lib/hours";
import { cn } from "@/lib/utils";
import { ErrorState, NoAccess, SignInPrompt } from "./projects";
import { useMiniOps, type TimeItem } from "./store";

const OVERHEAD = "__overhead__";

const sumHours = (items: TimeItem[]) => items.reduce((s, e) => s + e.hours, 0);
const sumCost = (items: TimeItem[]) => items.reduce((s, e) => s + (e.cost ?? 0), 0);

/** Monday–Sunday of the current week, as ISO dates. */
function thisWeek(): IsoRange {
  const now = new Date();
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - ((now.getDay() + 6) % 7),
  );
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { from: toIso(monday), to: toIso(sunday) };
}

export function TimePage() {
  const { timeList, timeState, members, projects, can, authStatus } = useMiniOps();
  const canLog = can("time", "edit");
  const showMoney = can("financials");
  const [view, setView] = useState<"entries" | "people">("entries");
  const [q, setQ] = useState("");
  const [member, setMember] = useState("");
  const [project, setProject] = useState("");
  const [billable, setBillable] = useState("all");
  const [range, setRange] = useState<IsoRange>({ from: "", to: "" });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return timeList.filter(
      (e) =>
        (!term ||
          `${e.description} ${e.projectName} ${e.taskTitle} ${e.memberName}`
            .toLowerCase()
            .includes(term)) &&
        (!member || String(e.member) === member) &&
        (!project || (project === OVERHEAD ? !e.project : e.project === project)) &&
        (billable === "all" || e.billable === (billable === "yes")) &&
        (!range.from || (e.date >= range.from && e.date <= (range.to || range.from))),
    );
  }, [timeList, q, member, project, billable, range]);
  const filtered = Boolean(q || member || project || billable !== "all" || range.from);
  const clear = () => {
    setQ("");
    setMember("");
    setProject("");
    setBillable("all");
    setRange({ from: "", to: "" });
  };

  // This week's figures, independent of the filters.
  const week = thisWeek();
  const weekEntries = timeList.filter((e) => e.date >= week.from && e.date <= week.to);
  const weekBillable = sumHours(weekEntries.filter((e) => e.billable));
  const capacity = members.reduce((s, m) => s + m.weeklyCapacity, 0);

  const body = () => {
    if (authStatus === "signedOut") return <SignInPrompt what="time" />;
    if (timeState.loading)
      return (
        <div aria-busy="true" aria-label="Loading time" className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      );
    if (!can("time")) return <NoAccess what="time" />;
    if (timeState.error)
      return <ErrorState what="time" message={timeState.error} onRetry={timeState.retry} />;
    if (timeList.length === 0)
      return (
        <div className="rounded-2xl bg-card p-12 text-center shadow-card">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Clock3 className="size-6" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold">No time logged yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Log hours against projects and tasks to see where effort — and cost — goes.
          </p>
          {canLog && (
            <TimeEntryDialog>
              <Button className="mt-5">
                <Plus /> Log Time
              </Button>
            </TimeEntryDialog>
          )}
        </div>
      );
    return (
      <>
        <div className="mb-6 metric-grid">
          <Metric label="Hours this week" value={fmtHours(sumHours(weekEntries))} />
          <Metric label="Billable this week" value={fmtHours(weekBillable)} tone="profit" />
          <Metric
            label="Non-billable"
            value={fmtHours(sumHours(weekEntries.filter((e) => !e.billable)))}
          />
          <Metric
            label="Utilization"
            value={capacity ? `${Math.round((weekBillable / capacity) * 1000) / 10}%` : "—"}
            {...(capacity ? { hint: `Billable hours of ${capacity}h weekly capacity` } : {})}
          />
          {showMoney && (
            <Metric label="Cost this week" value={money(sumCost(weekEntries))} tone="cost" />
          )}
        </div>
        <div className="toolbar justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={view === "entries" ? "secondary" : "ghost"}
              onClick={() => setView("entries")}
              aria-pressed={view === "entries"}
            >
              <List /> Entries
            </Button>
            <Button
              variant={view === "people" ? "secondary" : "ghost"}
              onClick={() => setView("people")}
              aria-pressed={view === "people"}
            >
              <Users /> By person
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="w-52 pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search time…"
                aria-label="Search time"
              />
            </div>
            <SearchableSelect
              variant="filter"
              clearable
              aria-label="Person"
              placeholder="Everyone"
              searchPlaceholder="Search people…"
              options={members.map((m) => ({ value: String(m.id), label: m.name }))}
              value={member}
              onChange={setMember}
            />
            <SearchableSelect
              variant="filter"
              clearable
              aria-label="Project"
              placeholder="All projects"
              searchPlaceholder="Search projects…"
              options={[
                { value: OVERHEAD, label: "Agency overhead" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={project}
              onChange={setProject}
            />
            <Select value={billable} onValueChange={setBillable}>
              <SelectTrigger className="w-36" aria-label="Billable">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Billable & not</SelectItem>
                <SelectItem value="yes">Billable</SelectItem>
                <SelectItem value="no">Non-billable</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker value={range} onChange={setRange} />
            <Button variant="outline" onClick={() => setRange(week)}>
              This week
            </Button>
            {filtered && (
              <Button variant="ghost" onClick={clear}>
                Clear
              </Button>
            )}
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center shadow-card">
            <p className="font-medium">No time entries match these filters.</p>
            <Button variant="link" onClick={clear}>
              Clear filters
            </Button>
          </div>
        ) : view === "entries" ? (
          <EntriesTable rows={rows} showMoney={showMoney} />
        ) : (
          <PeopleSummary rows={rows} showMoney={showMoney} />
        )}
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Time"
        description="Understand billable effort and its true delivery cost."
        action={
          canLog && (
            <TimeEntryDialog>
              <Button>
                <Plus /> Log Time
              </Button>
            </TimeEntryDialog>
          )
        }
      />
      {body()}
    </>
  );
}

/** Entries grouped by day (newest first), with a subtotal per day. */
export function EntriesTable({
  rows,
  showMoney,
  showProject = true,
}: {
  rows: TimeItem[];
  showMoney: boolean;
  showProject?: boolean;
}) {
  const days = useMemo(() => {
    const map = new Map<string, TimeItem[]>();
    for (const e of rows) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);
  const cols = 4 + (showProject ? 1 : 0) + (showMoney ? 1 : 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Person</TableHead>
          {showProject && <TableHead>Project / task</TableHead>}
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead>Billable</TableHead>
          {showMoney && <TableHead className="text-right">Cost</TableHead>}
          <TableHead className="w-20">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {days.map(([date, entries]) => (
          <Fragment key={date}>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableCell colSpan={cols - 1} className="py-2 text-xs font-semibold">
                {formatDisplayDate(date)}
              </TableCell>
              <TableCell className="num py-2 text-xs font-semibold">
                {fmtHours(sumHours(entries))}
              </TableCell>
              <TableCell colSpan={1 + (showMoney ? 1 : 0)} />
            </TableRow>
            {entries.map((e) => (
              <TableRow key={e.slug}>
                <TableCell className="whitespace-nowrap">
                  {e.memberSlug ? (
                    <Link
                      to="/team/$memberSlug"
                      params={{ memberSlug: e.memberSlug }}
                      className="hover:text-primary"
                    >
                      {e.memberName}
                    </Link>
                  ) : (
                    e.memberName
                  )}
                </TableCell>
                {showProject && (
                  <TableCell>
                    {e.project ? (
                      <Link
                        to="/projects/$projectSlug"
                        params={{ projectSlug: e.project }}
                        className="hover:text-primary"
                      >
                        {e.projectName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Agency overhead</span>
                    )}
                    {e.taskTitle && (
                      <small className="block text-xs text-muted-foreground">{e.taskTitle}</small>
                    )}
                  </TableCell>
                )}
                <TableCell className="max-w-xs">
                  <span className="line-clamp-2">{e.description || "—"}</span>
                  {e.startTime && (
                    <small className="block text-xs text-muted-foreground">
                      from {formatTime(e.startTime.slice(0, 5))}
                    </small>
                  )}
                </TableCell>
                <TableCell className="num">{fmtHours(e.hours)}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      e.billable
                        ? "bg-positive-soft text-positive"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {e.billable ? "Billable" : "Non-billable"}
                  </span>
                </TableCell>
                {showMoney && (
                  <TableCell className="num">{e.cost != null ? money(e.cost) : "—"}</TableCell>
                )}
                <TableCell>{e.canEdit && <EntryActions entry={e} />}</TableCell>
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

function PeopleSummary({ rows, showMoney }: { rows: TimeItem[]; showMoney: boolean }) {
  const people = useMemo(() => {
    const map = new Map<number, { name: string; slug: string; entries: TimeItem[] }>();
    for (const e of rows) {
      const p = map.get(e.member) ?? { name: e.memberName, slug: e.memberSlug, entries: [] };
      p.entries.push(e);
      map.set(e.member, p);
    }
    return [...map.values()].sort((a, b) => sumHours(b.entries) - sumHours(a.entries));
  }, [rows]);

  return (
    <Section title="Hours by person" subtitle="For the entries matching the filters above.">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Billable</TableHead>
            <TableHead className="text-right">Non-billable</TableHead>
            <TableHead>Billable share</TableHead>
            {showMoney && <TableHead className="text-right">Cost</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((p) => {
            const total = sumHours(p.entries);
            const bill = sumHours(p.entries.filter((e) => e.billable));
            const share = total ? Math.round((bill / total) * 100) : 0;
            return (
              <TableRow key={p.slug || p.name}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="num">{fmtHours(total)}</TableCell>
                <TableCell className="num">{fmtHours(bill)}</TableCell>
                <TableCell className="num">{fmtHours(total - bill)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                    </div>
                    <small>{share}%</small>
                  </div>
                </TableCell>
                {showMoney && <TableCell className="num">{money(sumCost(p.entries))}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Section>
  );
}

function EntryActions({ entry }: { entry: TimeItem }) {
  const { deleteTime } = useMiniOps();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex justify-end gap-1">
      <TimeEntryDialog entry={entry}>
        <Button variant="ghost" size="icon" aria-label="Edit entry">
          <Pencil />
        </Button>
      </TimeEntryDialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete entry"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this time entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {fmtHours(entry.hours)} on {formatDisplayDate(entry.date)} by {entry.memberName}. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                setBusy(true);
                deleteTime(entry.slug)
                  .then(() => toast.success("Time entry deleted"))
                  .catch((err) =>
                    toast.error(err instanceof Error ? err.message : "Couldn't delete the entry."),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Form = {
  member: string;
  date: string;
  project: string;
  task: string;
  hours: string;
  startTime: string;
  description: string;
  billable: boolean;
};

/** Log (no `entry`) or edit time. `project` presets the project slug. */
export function TimeEntryDialog({
  entry,
  project,
  children,
}: {
  entry?: TimeItem;
  project?: string;
  children: ReactNode;
}) {
  const { saveTime, projects, taskList, members, canManageTime, user } = useMiniOps();
  const me = members.find((m) => m.isMe);
  const initial = (): Form => ({
    member: entry ? String(entry.member) : me ? String(me.id) : "",
    date: entry?.date ?? toIso(new Date()),
    project: entry ? (entry.project ?? "") : (project ?? ""),
    task: entry?.task ?? "",
    hours: entry ? String(entry.hours) : "",
    startTime: entry?.startTime?.slice(0, 5) ?? "",
    description: entry?.description ?? "",
    billable: entry?.billable ?? true,
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string | undefined>>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const tasks = taskList.filter((t) => (form.project ? t.project === form.project : true));
  const parsed = parseHours(form.hours);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (parsed === null || parsed <= 0) found.hours = "Enter hours like 1.5, 1:30 or 90m.";
    else if (parsed > 24) found.hours = "That's more than a day.";
    if (!form.date) found.date = "Pick the day you worked.";
    else if (form.date > toIso(new Date())) found.date = "You can't log time in the future.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await saveTime(
        {
          ...(canManageTime && form.member ? { member: Number(form.member) } : {}),
          date: form.date,
          project: form.project || null,
          task: form.task || null,
          hours: (Math.round(parsed! * 100) / 100).toFixed(2),
          start_time: form.startTime || null,
          description: form.description.trim(),
          billable: form.billable,
        },
        entry?.slug,
      );
      toast.success(entry ? "Time entry updated" : `Logged ${fmtHours(parsed!)}`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the time entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setForm(initial());
          setErrors({});
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{entry ? "Edit time" : "Log time"}</DialogTitle>
            <DialogDescription>
              {canManageTime
                ? "Log hours for yourself or anyone on the team."
                : `Logging as ${user?.name || user?.email || "you"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-x-4 gap-y-5 py-5 sm:grid-cols-2">
            {canManageTime && (
              <Field label="Person" id="time-member" wide>
                <SearchableSelect
                  id="time-member"
                  options={members.map((m) => ({
                    value: String(m.id),
                    label: m.name,
                    hint: m.role,
                  }))}
                  value={form.member}
                  onChange={(v) => v && set("member", v)}
                />
              </Field>
            )}
            <Field label="Date" id="time-date" required error={errors.date}>
              <DateInput id="time-date" value={form.date} onChange={(v) => set("date", v)} />
            </Field>
            <Field
              label="Hours"
              id="time-hours"
              required
              error={errors.hours}
              hint={
                parsed && parsed > 0 && !errors.hours
                  ? `= ${fmtHours(parsed)}`
                  : "e.g. 1.5, 1:30 or 90m"
              }
            >
              <Input
                id="time-hours"
                inputMode="decimal"
                value={form.hours}
                onChange={(e) => set("hours", e.target.value)}
                placeholder="1:30"
                autoFocus
              />
            </Field>
            <Field label="Project" id="time-project">
              <SearchableSelect
                id="time-project"
                clearable
                placeholder="Agency overhead"
                searchPlaceholder="Search projects…"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                value={form.project}
                onChange={(v) => {
                  setForm((f) => ({
                    ...f,
                    project: v,
                    // Keep the task only if it belongs to the new project.
                    task: taskList.find((t) => t.slug === f.task)?.project === v ? f.task : "",
                    // Internal work usually isn't billable.
                    billable: v ? f.billable : false,
                  }));
                }}
              />
            </Field>
            <Field label="Task" id="time-task">
              <SearchableSelect
                id="time-task"
                clearable
                placeholder="No task"
                searchPlaceholder="Search tasks…"
                options={tasks.map((t) => ({
                  value: t.slug,
                  label: t.title,
                  hint: form.project ? t.status : t.projectName || "No project",
                }))}
                value={form.task}
                onChange={(v) => {
                  const task = taskList.find((t) => t.slug === v);
                  setForm((f) => ({
                    ...f,
                    task: v,
                    project: task?.project ?? f.project,
                  }));
                }}
              />
            </Field>
            <Field label="Start time" id="time-start">
              <TimeInput
                id="time-start"
                value={form.startTime}
                onChange={(v) => set("startTime", v)}
                placeholder="Optional"
              />
            </Field>
            <div className="flex items-end">
              <label className="flex h-10 items-center gap-3 text-sm">
                <Switch checked={form.billable} onCheckedChange={(v) => set("billable", v)} />
                Billable to the client
              </label>
            </div>
            <Field label="What did you work on?" id="time-description" wide>
              <Textarea
                id="time-description"
                rows={2}
                maxLength={300}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Homepage visual design"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : entry ? "Save changes" : "Log time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  required,
  error,
  hint,
  wide,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
