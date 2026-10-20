import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Metric, PageHeader, Status } from "@/components/miniops/core";
import { Section } from "@/components/miniops/forms";
import { SearchableSelect } from "@/components/miniops/select-search";
import { formatDisplayDate, toIso } from "@/components/miniops/date-time";
import { money } from "@/data/mock";
import { CLIENT_STATUSES } from "@/lib/api";
import { ErrorState, NoAccess, ProjectFormDialog, SignInPrompt } from "./projects";
import { useMiniOps, type ClientInput, type ClientItem } from "./store";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Education",
  "Hospitality",
  "Legal",
  "Construction",
  "Creative",
  "Consulting",
  "Wellness",
  "Other",
];

const SORTS = {
  name: { label: "Name", fn: (a: ClientItem, b: ClientItem) => a.name.localeCompare(b.name) },
  revenue: { label: "Revenue", fn: (a: ClientItem, b: ClientItem) => b.revenue - a.revenue },
  profit: { label: "Profit", fn: (a: ClientItem, b: ClientItem) => b.profit - a.profit },
  margin: { label: "Margin", fn: (a: ClientItem, b: ClientItem) => b.margin - a.margin },
  projects: {
    label: "Projects",
    fn: (a: ClientItem, b: ClientItem) => b.projectCount - a.projectCount,
  },
  newest: {
    label: "Newest",
    fn: (a: ClientItem, b: ClientItem) => b.createdAt.localeCompare(a.createdAt),
  },
} as const;
type SortKey = keyof typeof SORTS;
const MONEY_SORTS = new Set(["revenue", "profit", "margin"]);

const sinceDate = (iso: string) => formatDisplayDate(toIso(new Date(iso)));

export function Clients() {
  const { clientList, clientsState, can, authStatus } = useMiniOps();
  const canEdit = can("clients", "edit");
  const showMoney = can("financials");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [industry, setIndustry] = useState("");
  const [sort, setSort] = useState<SortKey>(() => (showMoney ? "revenue" : "name"));

  const industries = useMemo(
    () => [...new Set(clientList.map((c) => c.industry).filter(Boolean))].sort(),
    [clientList],
  );
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clientList
      .filter((c) => !term || `${c.name} ${c.contactName} ${c.email}`.toLowerCase().includes(term))
      .filter((c) => status === "all" || c.status === status)
      .filter((c) => !industry || c.industry === industry)
      .sort(SORTS[sort].fn);
  }, [clientList, q, status, industry, sort]);
  const filtered = Boolean(q || status !== "all" || industry);
  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setIndustry("");
  };

  const totals = useMemo(() => {
    const revenue = clientList.reduce((s, c) => s + c.revenue, 0);
    const profit = clientList.reduce((s, c) => s + c.profit, 0);
    return {
      active: clientList.filter((c) => c.status === "Active").length,
      revenue,
      profit,
      margin: revenue ? Math.round((profit / revenue) * 1000) / 10 : 0,
    };
  }, [clientList]);

  const body = () => {
    if (authStatus === "signedOut") return <SignInPrompt what="clients" />;
    if (clientsState.error)
      return (
        <ErrorState what="clients" message={clientsState.error} onRetry={clientsState.retry} />
      );
    if (clientsState.loading)
      return (
        <div aria-busy="true" aria-label="Loading clients">
          <div className="mb-6 metric-grid">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        </div>
      );
    if (!can("clients")) return <NoAccess what="clients" />;
    if (clientList.length === 0) return <EmptyClients canEdit={canEdit} />;
    return (
      <>
        <div className="mb-6 metric-grid">
          <Metric label="Active clients" value={`${totals.active} of ${clientList.length}`} />
          {showMoney ? (
            <>
              <Metric label="Contract revenue" value={money(totals.revenue)} />
              <Metric label="Profit" value={money(totals.profit)} tone="profit" />
              <Metric label="Average margin" value={`${totals.margin}%`} />
            </>
          ) : (
            <>
              <Metric
                label="Projects"
                value={String(clientList.reduce((s, c) => s + c.projectCount, 0))}
              />
              <Metric
                label="Active projects"
                value={String(clientList.reduce((s, c) => s + c.activeProjects, 0))}
              />
              <Metric label="Industries" value={String(industries.length)} />
            </>
          )}
        </div>
        <div className="toolbar">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search clients or contacts…"
              aria-label="Search clients"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CLIENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchableSelect
            variant="filter"
            clearable
            aria-label="Industry"
            placeholder="All industries"
            searchPlaceholder="Search industries…"
            options={industries}
            value={industry}
            onChange={setIndustry}
          />
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-40" aria-label="Sort">
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
            <p className="font-medium">No clients match these filters.</p>
            <Button variant="link" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <ClientsTable rows={rows} showMoney={showMoney} />
        )}
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Clients"
        description="Understand which relationships create the strongest returns."
        action={
          canEdit && (
            <ClientFormDialog>
              <Button>
                <Plus /> Add Client
              </Button>
            </ClientFormDialog>
          )
        }
      />
      {body()}
    </>
  );
}

function ClientsTable({ rows, showMoney }: { rows: ClientItem[]; showMoney: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Industry</TableHead>
          <TableHead className="text-right">Active projects</TableHead>
          {showMoney && (
            <>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead>Health</TableHead>
            </>
          )}
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.slug}>
            <TableCell>
              <Link
                to="/clients/$clientSlug"
                params={{ clientSlug: c.slug }}
                className="font-medium hover:text-primary"
              >
                {c.name}
              </Link>
              {c.contactName && (
                <small className="block text-xs text-muted-foreground">{c.contactName}</small>
              )}
            </TableCell>
            <TableCell>{c.industry || <span className="text-muted-foreground">—</span>}</TableCell>
            <TableCell className="num">
              {c.activeProjects}
              <span className="text-muted-foreground"> / {c.projectCount}</span>
            </TableCell>
            {showMoney && (
              <>
                <TableCell className="num">{money(c.revenue)}</TableCell>
                <TableCell className="num">{money(c.cost)}</TableCell>
                <TableCell className="num">{money(c.profit)}</TableCell>
                <TableCell className="num">{c.revenue ? `${c.margin}%` : "—"}</TableCell>
                <TableCell>
                  <Status>{c.health}</Status>
                </TableCell>
              </>
            )}
            <TableCell>
              <Status>{c.status}</Status>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EmptyClients({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-12 text-center shadow-card">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Building2 className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold">No clients yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Add a client, or create a project with a new client name and it will appear here.
      </p>
      {canEdit && (
        <ClientFormDialog>
          <Button className="mt-5">
            <Plus /> Add Client
          </Button>
        </ClientFormDialog>
      )}
    </div>
  );
}

export function ClientDetail({ slug }: { slug: string }) {
  const { clientList, clientsState, projects, can, authStatus } = useMiniOps();
  const canEdit = can("clients", "edit");
  const canAddProject = can("projects", "edit");
  const showMoney = can("financials");
  const c = clientList.find((x) => x.slug === slug);

  if (authStatus === "signedOut") return <SignInPrompt what="clients" />;
  if (clientsState.error)
    return <ErrorState what="clients" message={clientsState.error} onRetry={clientsState.retry} />;
  if (!clientsState.loading && !can("clients")) return <NoAccess what="clients" />;
  if (clientsState.loading)
    return (
      <div aria-busy="true" aria-label="Loading client" className="space-y-6">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <div className="metric-grid">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  if (!c)
    return (
      <div className="rounded-2xl bg-card p-12 text-center shadow-card">
        <h1 className="font-display text-xl font-semibold">Client not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or it belongs to another workspace.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/clients">Back to clients</Link>
        </Button>
      </div>
    );

  const clientProjects = projects.filter((p) => p.clientSlug === c.slug);
  const insight =
    c.health === "No data"
      ? "No project revenue yet. Add a project with a contract value to see profitability."
      : c.health === "Loss"
        ? `Costs are higher than revenue across ${c.name}'s projects — this relationship is losing money.`
        : c.health === "At Risk"
          ? `A ${c.margin}% margin leaves little room. Review pricing or scope with ${c.name}.`
          : c.health === "Attention"
            ? `A ${c.margin}% margin is below the 30% target. Keep an eye on costs.`
            : `${c.name} is a healthy relationship with a ${c.margin}% margin across ${c.projectCount} project${c.projectCount === 1 ? "" : "s"}.`;

  return (
    <>
      <PageHeader
        title={c.name}
        description={`${c.industry || "No industry"} · Client since ${sinceDate(c.createdAt)}`}
        action={canEdit && <ClientActions client={c} />}
      />
      <div className="mb-8 metric-grid">
        {showMoney && (
          <>
            <Metric label="Total revenue" value={money(c.revenue)} />
            <Metric label="Total cost" value={money(c.cost)} />
            <Metric label="Total profit" value={money(c.profit)} tone="profit" />
            <Metric label="Average margin" value={c.revenue ? `${c.margin}%` : "—"} />
          </>
        )}
        <Metric label="Projects" value={`${c.activeProjects} active of ${c.projectCount}`} />
      </div>
      <div className="mb-8 grid gap-8 lg:grid-cols-3">
        <Section title="Contact">
          <dl className="space-y-3 text-sm">
            <ContactLine icon={<UserRound />} label="Contact">
              {c.contactName || "Not set"}
            </ContactLine>
            <ContactLine icon={<Mail />} label="Email">
              {c.email ? (
                <a href={`mailto:${c.email}`} className="hover:text-primary">
                  {c.email}
                </a>
              ) : (
                "Not set"
              )}
            </ContactLine>
            <ContactLine icon={<Phone />} label="Phone">
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="hover:text-primary">
                  {c.phone}
                </a>
              ) : (
                "Not set"
              )}
            </ContactLine>
          </dl>
          <div className="mt-4 flex gap-2">
            <Status>{c.status}</Status>
            {showMoney && <Status>{c.health}</Status>}
          </div>
        </Section>
        {showMoney && (
          <Section title="Profitability insight">
            <div className="insight">{insight}</div>
          </Section>
        )}
        <Section title="Notes">
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {c.notes || "No notes yet."}
          </p>
        </Section>
      </div>
      <Section
        title="Project performance"
        action={
          canAddProject && (
            <ProjectFormDialog client={c.slug}>
              <Button size="sm">
                <Plus /> New Project
              </Button>
            </ProjectFormDialog>
          )
        }
      >
        {clientProjects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No projects for this client yet.
          </p>
        ) : (
          <div className="divide-y border-y">
            {clientProjects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectSlug"
                params={{ projectSlug: p.id }}
                className="flex items-center justify-between gap-4 py-4 hover:text-primary"
              >
                <span>
                  <b className="text-sm">{p.name}</b>
                  <small className="block text-muted-foreground">
                    {p.status} · {p.progress}% complete
                  </small>
                </span>
                {showMoney && (
                  <span className="flex items-center gap-4 text-right">
                    <Status>{p.health}</Status>
                    <span>
                      <b className="font-mono">{money(p.profit)}</b>
                      <small className="block text-muted-foreground">{p.margin}% margin</small>
                    </span>
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function ContactLine({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate font-medium">{children}</dd>
      </span>
    </div>
  );
}

function ClientActions({ client }: { client: ClientItem }) {
  const { deleteClient } = useMiniOps();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await deleteClient(client.slug);
      toast.success(`Deleted ${client.name}`);
      navigate({ to: "/clients" });
    } catch (e) {
      // e.g. the API refuses while the client still has projects.
      toast.error(e instanceof Error ? e.message : "Couldn't delete the client.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <ClientFormDialog client={client}>
        <Button variant="outline">
          <Pencil /> Edit client
        </Button>
      </ClientFormDialog>
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
            <Trash2 /> Delete client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {client.projectCount
                ? `${client.name} still has ${client.projectCount} project${client.projectCount === 1 ? "" : "s"}. Delete or move them to another client first.`
                : "This permanently removes the client. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            {client.projectCount === 0 && (
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
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const toInput = (c?: ClientItem): ClientInput => ({
  name: c?.name ?? "",
  industry: c?.industry ?? "",
  status: c?.status ?? "Active",
  contactName: c?.contactName ?? "",
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  notes: c?.notes ?? "",
});

/** Create (no `client`) or edit a client. `children` is the trigger button. */
export function ClientFormDialog({
  client,
  children,
}: {
  client?: ClientItem;
  children: ReactNode;
}) {
  const { saveClient } = useMiniOps();
  const navigate = useNavigate();
  const industryList = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClientInput>(() => toInput(client));
  const [errors, setErrors] = useState<Partial<Record<keyof ClientInput, string>>>({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function onOpenChange(next: boolean) {
    if (next) {
      setForm(toInput(client));
      setErrors({});
    }
    setOpen(next);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!form.name.trim()) found.name = "Enter the client's name.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
      found.email = "Enter a valid email address.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const trimmed = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]),
      ) as ClientInput;
      const saved = await saveClient(trimmed, client?.slug);
      toast.success(client ? "Client updated" : `Added ${saved.name}`);
      setOpen(false);
      if (!client) navigate({ to: "/clients/$clientSlug", params: { clientSlug: saved.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the client.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof ClientInput, label: string, control: ReactNode, wide = false) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <Label htmlFor={`client-${key}`}>
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
  const text = (key: "name" | "contactName" | "email" | "phone", type = "text") => (
    <Input
      id={`client-${key}`}
      type={type}
      value={form[key]}
      onChange={(e) => set(key, e.target.value)}
      autoFocus={key === "name"}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{client ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>Saved to your workspace.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-x-4 gap-y-5 py-5 sm:grid-cols-2">
            {field("name", "Client name", text("name"))}
            {field(
              "industry",
              "Industry",
              <>
                <Input
                  id="client-industry"
                  list={industryList}
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  placeholder="Pick or type an industry"
                  autoComplete="off"
                />
                <datalist id={industryList}>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </>,
            )}
            {field("contactName", "Contact name", text("contactName"))}
            {field(
              "status",
              "Status",
              <SearchableSelect
                id="client-status"
                options={[...CLIENT_STATUSES]}
                value={form.status}
                onChange={(v) => set("status", (v || "Active") as ClientInput["status"])}
              />,
            )}
            {field("email", "Email", text("email", "email"))}
            {field("phone", "Phone", text("phone", "tel"))}
            {field(
              "notes",
              "Notes",
              <Textarea
                id="client-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Billing details, preferences, anything worth remembering"
              />,
              true,
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : client ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
