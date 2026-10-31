import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Download, Network, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Metric, MobileCard, MobileField } from "@/components/miniops/core";
import { SearchableMultiSelect } from "@/components/miniops/select-search";
import { DateRangePicker, type IsoRange } from "@/components/miniops/date-time";
import {
  TASK_STATUSES,
  tasksApi,
  type ApiTaskReport,
  type TaskFilters,
  type TaskReportGroup,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ErrorState, ProgressBar } from "./projects";
import { useMiniOps, useNeeds } from "./store";

const GROUP_LABELS: Record<TaskReportGroup, string> = {
  project: "By project",
  assignee: "By team member",
  project_assignee: "By project & member",
};
const GROUP_ICONS: Record<TaskReportGroup, ReactNode> = {
  project: <BriefcaseBusiness />,
  assignee: <Users />,
  project_assignee: <Network />,
};
type Dimension = "project" | "assignee";
const DIMENSIONS: Record<TaskReportGroup, Dimension[]> = {
  project: ["project"],
  assignee: ["assignee"],
  project_assignee: ["project", "assignee"],
};
const DIMENSION_LABELS: Record<Dimension, string> = {
  project: "Project",
  assignee: "Team member",
};

// Option values the API reads as "tasks without a project / assignee".
const NONE = "none";

const fmtHours = (hours?: string) => `${Number(hours ?? 0).toFixed(1)}h`;

function useWorkspaceId() {
  const { live, activeWorkspace } = useMiniOps();
  const wid = Number(activeWorkspace.id);
  return live && Number.isFinite(wid) ? wid : null;
}

/** Run a download, reporting failures as a toast. */
async function saving(run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Download failed.");
  }
}

/** Chosen projects (slugs) and team members (user IDs); empty = all. */
type Selection = { projects: string[]; members: string[] };
const EVERYONE: Selection = { projects: [], members: [] };

/** `filters` narrowed to the selection. */
function selected(filters: TaskFilters, { projects, members }: Selection): TaskFilters {
  return {
    ...filters,
    ...(projects.length && { project: projects.join(",") }),
    ...(members.length && { assignee: members.join(",") }),
  };
}

/** How to group a report: what the person picked, else what fits the selection
 * (both projects and members chosen → one row per member per project). */
function useGrouping(selection: Selection, allowed: TaskReportGroup[]) {
  const [picked, setPicked] = useState<TaskReportGroup | null>(null);
  const suggested: TaskReportGroup =
    selection.projects.length && selection.members.length
      ? "project_assignee"
      : selection.members.length
        ? "assignee"
        : "project";
  const groupBy = picked ?? (allowed.includes(suggested) ? suggested : allowed[0]!);
  return [groupBy, setPicked] as const;
}

function SelectionPickers({
  value,
  onChange,
  pickProjects = true,
  idPrefix,
  labelled = false,
}: {
  value: Selection;
  onChange: (value: Selection) => void;
  pickProjects?: boolean;
  idPrefix: string;
  /** Show a label above each picker (in forms). */
  labelled?: boolean;
}) {
  const { projects, members } = useMiniOps();
  useNeeds("projects", "members");
  const pickers = [
    pickProjects && {
      key: "projects" as const,
      label: "Projects",
      placeholder: "All projects",
      search: "Search projects…",
      options: [
        ...projects.map((p) => ({ value: p.id, label: p.name })),
        { value: NONE, label: "No project" },
      ],
    },
    {
      key: "members" as const,
      label: "Team members",
      placeholder: "All team members",
      search: "Search people…",
      options: [
        ...members.map((m) => ({ value: String(m.id), label: m.name })),
        { value: NONE, label: "Unassigned" },
      ],
    },
  ].filter((p) => p !== false);
  return (
    <>
      {pickers.map((p) => {
        const control = (
          <SearchableMultiSelect
            id={`${idPrefix}-${p.key}`}
            className={labelled ? "" : "w-56"}
            placeholder={p.placeholder}
            searchPlaceholder={p.search}
            options={p.options}
            value={value[p.key]}
            onChange={(next) => onChange({ ...value, [p.key]: next })}
          />
        );
        return labelled ? (
          <div key={p.key}>
            <Label htmlFor={`${idPrefix}-${p.key}`}>{p.label}</Label>
            <div className="mt-1.5">{control}</div>
          </div>
        ) : (
          <div key={p.key} title={p.label}>
            {control}
          </div>
        );
      })}
    </>
  );
}

function GroupToggle({
  value,
  onChange,
  options,
}: {
  value: TaskReportGroup;
  onChange: (value: TaskReportGroup) => void;
  options: TaskReportGroup[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((key) => (
        <Button
          key={key}
          type="button"
          variant={value === key ? "secondary" : "ghost"}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
        >
          {GROUP_ICONS[key]} {GROUP_LABELS[key]}
        </Button>
      ))}
    </div>
  );
}

const ALL_GROUPS: TaskReportGroup[] = ["project", "assignee", "project_assignee"];

/** Task counts per project, team member or both, for the tasks matching `filters`. */
export function TaskReport({ filters }: { filters: TaskFilters }) {
  const wid = useWorkspaceId();
  const [selection, setSelection] = useState<Selection>(EVERYONE);
  const [groupBy, setGroupBy] = useGrouping(selection, ALL_GROUPS);
  const reportFilters = selected(filters, selection);
  const report = useQuery({
    queryKey: ["tasks", wid, "report", groupBy, reportFilters],
    queryFn: () => tasksApi.report(wid!, groupBy, reportFilters),
    enabled: wid !== null,
  });

  return (
    <div className="space-y-6">
      <div className="toolbar justify-between">
        <GroupToggle value={groupBy} onChange={setGroupBy} options={ALL_GROUPS} />
        <div className="flex flex-wrap gap-2">
          <SelectionPickers idPrefix="report" value={selection} onChange={setSelection} />
          <Button
            variant="outline"
            disabled={wid === null}
            onClick={() => saving(() => tasksApi.downloadReport(wid!, groupBy, reportFilters))}
          >
            <Download /> Download Excel
          </Button>
        </div>
      </div>
      {report.error ? (
        <ErrorState
          what="the task report"
          message={report.error.message}
          onRetry={() => void report.refetch()}
        />
      ) : !report.data ? (
        <div aria-busy="true" aria-label="Loading report" className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : (
        <ReportBody report={report.data} />
      )}
    </div>
  );
}

type ReportGroup = ApiTaskReport["groups"][number];

function GroupName({ group, dimension }: { group: ReportGroup; dimension: Dimension }) {
  const name = group[`${dimension}_name`];
  if (dimension === "project" && group.project)
    return (
      <Link
        to="/projects/$projectSlug"
        params={{ projectSlug: group.project }}
        className="hover:text-primary"
      >
        {name}
      </Link>
    );
  return (
    <span className={group[dimension] == null ? "text-muted-foreground" : undefined}>{name}</span>
  );
}

function ReportBody({ report }: { report: ApiTaskReport }) {
  const { totals, groups } = report;
  const showHours = totals.hours !== undefined;
  const dimensions = DIMENSIONS[report.group_by];
  const rowKey = (g: ReportGroup) => dimensions.map((d) => String(g[d])).join(":");
  if (totals.total === 0)
    return (
      <div className="rounded-2xl bg-card p-10 text-center shadow-card">
        <p className="font-medium">No tasks match these filters.</p>
      </div>
    );

  return (
    <>
      <div className="metric-grid">
        <Metric label="Tasks" value={String(totals.total)} />
        <Metric label="Done" value={String(totals.done)} tone="profit" />
        <Metric label="Overdue" value={String(totals.overdue)} tone="cost" />
        {showHours ? (
          <Metric label="Hours logged" value={fmtHours(totals.hours)} tone="primary" />
        ) : (
          <Metric label="Completion" value={`${totals.completion_rate}%`} tone="primary" />
        )}
      </div>
      <div className="desktop-table">
        <Table>
          <TableHeader>
            <TableRow>
              {dimensions.map((d) => (
                <TableHead key={d}>{DIMENSION_LABELS[d]}</TableHead>
              ))}
              <TableHead className="text-right">Tasks</TableHead>
              {TASK_STATUSES.map((s) => (
                <TableHead key={s} className="text-right">
                  {s}
                </TableHead>
              ))}
              <TableHead className="text-right">Overdue</TableHead>
              <TableHead>Completion</TableHead>
              {showHours && <TableHead className="text-right">Hours</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={rowKey(g)}>
                {dimensions.map((d) => (
                  <TableCell key={d} className="font-medium">
                    <GroupName group={g} dimension={d} />
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums">{g.total}</TableCell>
                {TASK_STATUSES.map((s) => (
                  <TableCell key={s} className="text-right tabular-nums">
                    {g.by_status[s]}
                  </TableCell>
                ))}
                <TableCell
                  className={
                    g.overdue
                      ? "text-right tabular-nums text-destructive"
                      : "text-right tabular-nums"
                  }
                >
                  {g.overdue}
                </TableCell>
                <TableCell>
                  <ProgressBar value={g.completion_rate} />
                </TableCell>
                {showHours && (
                  <TableCell className="text-right tabular-nums">{fmtHours(g.hours)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={dimensions.length}>Total</TableCell>
              <TableCell className="text-right tabular-nums">{totals.total}</TableCell>
              {TASK_STATUSES.map((s) => (
                <TableCell key={s} className="text-right tabular-nums">
                  {totals.by_status[s]}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums">{totals.overdue}</TableCell>
              <TableCell>
                <ProgressBar value={totals.completion_rate} />
              </TableCell>
              {showHours && (
                <TableCell className="text-right tabular-nums">{fmtHours(totals.hours)}</TableCell>
              )}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <div className="mobile-list space-y-3">
        {groups.map((g) => (
          <MobileCard key={rowKey(g)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5 font-medium">
                {dimensions.map((d) => (
                  <div key={d} className="truncate">
                    <GroupName group={g} dimension={d} />
                  </div>
                ))}
              </div>
              <ProgressBar value={g.completion_rate} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <MobileField label="Tasks">{g.total}</MobileField>
              <MobileField label="Done">{g.done}</MobileField>
              <MobileField label="Open">{g.total - g.done}</MobileField>
              <MobileField label="Overdue">{g.overdue}</MobileField>
              {showHours && <MobileField label="Hours">{fmtHours(g.hours)}</MobileField>}
            </dl>
          </MobileCard>
        ))}
      </div>
    </>
  );
}

type ExportFile = "summary" | "tasks";

/**
 * Pick projects and/or team members (one or several each), then download their
 * report or their task list as an Excel sheet. `filters` always apply; with
 * `pickProjects` false (on a project's page) only members are picked.
 */
export function TaskExportDialog({
  filters = {},
  pickProjects = true,
  size,
}: {
  filters?: TaskFilters;
  pickProjects?: boolean;
  size?: "sm";
}) {
  const wid = useWorkspaceId();
  const groups: TaskReportGroup[] = pickProjects ? ALL_GROUPS : ["assignee"];
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(EVERYONE);
  const [groupBy, setGroupBy] = useGrouping(selection, groups);
  const [range, setRange] = useState<IsoRange>({ from: "", to: "" });
  const [file, setFile] = useState<ExportFile>("summary");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (wid === null) return;
    const exportFilters = selected(
      {
        ...filters,
        due_after: range.from || undefined,
        due_before: range.from ? range.to || range.from : undefined,
      },
      selection,
    );
    setBusy(true);
    await saving(async () => {
      await (file === "summary"
        ? tasksApi.downloadReport(wid, groupBy, exportFilters)
        : tasksApi.export(wid, exportFilters));
      setOpen(false);
    });
    setBusy(false);
  }

  const per = DIMENSIONS[groupBy]
    .map((d) => (d === "project" ? "project" : "person"))
    .join(" and ");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size} disabled={wid === null}>
          <Download /> Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Export tasks</DialogTitle>
            <DialogDescription>
              Choose {pickProjects ? "projects and team members" : "team members"} — one or several.
              Leave a list empty to include everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-5">
            <SelectionPickers
              idPrefix="export"
              labelled
              pickProjects={pickProjects}
              value={selection}
              onChange={setSelection}
            />
            <div>
              <Label>Due between</Label>
              <div className="mt-1.5">
                <DateRangePicker value={range} onChange={setRange} />
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">File</legend>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["summary", "Summary", `Counts per ${per}: status, overdue, completion, hours`],
                    ["tasks", "Task list", "One row per task with its details"],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={cn(
                      "cursor-pointer rounded-xl p-3 text-sm shadow-[0_0_0_1px_var(--input)] transition-shadow",
                      file === value && "bg-primary-soft shadow-[0_0_0_1px_var(--primary)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="export-file"
                      value={value}
                      checked={file === value}
                      onChange={() => setFile(value)}
                      className="sr-only"
                    />
                    <span className="block font-medium">{label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {file === "summary" && groups.length > 1 && (
              <div>
                <Label>Group summary</Label>
                <div className="mt-1.5">
                  <GroupToggle value={groupBy} onChange={setGroupBy} options={groups} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Download /> {busy ? "Preparing…" : "Download Excel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
