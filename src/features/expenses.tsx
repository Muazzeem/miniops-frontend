import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileText,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  Receipt,
  Repeat,
  Search,
  Trash2,
  X,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DateInput,
  DateRangePicker,
  formatDisplayDate,
  toIso,
  type IsoRange,
} from "@/components/miniops/date-time";
import { money } from "@/data/mock";
import {
  BILLING_CYCLES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  SUBSCRIPTION_STATUSES,
  type ExpenseCategory,
  type SubscriptionWrite,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ErrorState, NoAccess, SignInPrompt } from "./projects";
import { useMiniOps, type ExpenseItem, type SubscriptionItem } from "./store";

const OVERHEAD = "__overhead__";
const RECEIPT_TYPES = ".pdf,.jpg,.jpeg,.png,.webp";
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const CYCLE_SUFFIX = { Monthly: "mo", Quarterly: "qtr", Yearly: "yr" } as const;

/** Exact amounts (with cents) for individual expenses; totals use the rounded `money`. */
const cash = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const today = () => toIso(new Date());
const daysUntil = (iso: string) =>
  Math.round((new Date(`${iso}T00:00`).getTime() - new Date(`${today()}T00:00`).getTime()) / 864e5);
const sum = (items: { amount: number }[]) => items.reduce((s, x) => s + x.amount, 0);

export function ExpensesPage() {
  const { expensesState, can, authStatus } = useMiniOps();
  const canEdit = can("expenses", "edit");
  const [tab, setTab] = useState("expenses");
  useEffect(() => {
    setTab(
      new URLSearchParams(window.location.search).get("tab") === "subscriptions"
        ? "subscriptions"
        : "expenses",
    );
  }, []);

  const body = () => {
    if (authStatus === "signedOut") return <SignInPrompt what="expenses" />;
    if (expensesState.loading)
      return (
        <div aria-busy="true" aria-label="Loading expenses">
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
    if (!can("expenses")) return <NoAccess what="expenses" />;
    if (expensesState.error)
      return (
        <ErrorState what="expenses" message={expensesState.error} onRetry={expensesState.retry} />
      );
    return (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="expenses">All Expenses</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <ExpensesTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="subscriptions">
          <SubscriptionsTab canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Understand project spend, agency overhead, and recurring software costs."
        action={
          canEdit &&
          (tab === "subscriptions" ? (
            <SubscriptionFormDialog>
              <Button>
                <Plus /> Add Subscription
              </Button>
            </SubscriptionFormDialog>
          ) : (
            <ExpenseFormDialog>
              <Button>
                <Plus /> Add Expense
              </Button>
            </ExpenseFormDialog>
          ))
        }
      />
      {body()}
    </>
  );
}

/* ---------------------------------------------------------------- Expenses */

function ExpensesTab({ canEdit }: { canEdit: boolean }) {
  const { expenseList, subscriptionList, projects, canReviewExpenses } = useMiniOps();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState<IsoRange>({ from: "", to: "" });
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return expenseList.filter(
      (e) =>
        (!term || `${e.title} ${e.vendor} ${e.notes}`.toLowerCase().includes(term)) &&
        (!category || e.category === category) &&
        (!project || (project === OVERHEAD ? !e.project : e.project === project)) &&
        (status === "all" || e.status === status) &&
        (!range.from || (e.date >= range.from && e.date <= (range.to || range.from))),
    );
  }, [expenseList, q, category, project, status, range]);
  const filtered = Boolean(q || category || project || status !== "all" || range.from);
  const clear = () => {
    setQ("");
    setCategory("");
    setProject("");
    setStatus("all");
    setRange({ from: "", to: "" });
  };

  // Totals count approved spend only, within the current filters.
  const approved = rows.filter((e) => e.status === "Approved");
  const pending = expenseList.filter((e) => e.status === "Pending");
  const monthlyRecurring = subscriptionList
    .filter((s) => s.status === "Active")
    .reduce((s, x) => s + x.monthlyCost, 0);
  const current = expenseList.find((e) => e.slug === selected) ?? null;

  if (expenseList.length === 0)
    return (
      <Empty
        icon={<Receipt />}
        title="No expenses yet"
        text="Record what you spend — on a project or as agency overhead — to see where money goes."
        action={
          canEdit && (
            <ExpenseFormDialog>
              <Button>
                <Plus /> Add Expense
              </Button>
            </ExpenseFormDialog>
          )
        }
      />
    );

  return (
    <>
      <div className="mb-8 metric-grid">
        <Metric tone="violet" label="Approved spend" value={money(sum(approved))} />
        <Metric
          tone="primary"
          label="Project expenses"
          value={money(sum(approved.filter((e) => e.project)))}
        />
        <Metric label="Agency overhead" value={money(sum(approved.filter((e) => !e.project)))} />
        <Metric tone="profit" label="Recurring" value={`${money(monthlyRecurring)}/mo`} />
        {canReviewExpenses && pending.length > 0 && (
          <Metric
            tone="cost"
            label="Awaiting approval"
            value={`${pending.length} · ${money(sum(pending))}`}
          />
        )}
      </div>
      <Section title="All expenses">
        <div className="toolbar">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="w-56 pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search expenses…"
              aria-label="Search expenses"
            />
          </div>
          <SearchableSelect
            variant="filter"
            clearable
            aria-label="Category"
            placeholder="All categories"
            options={[...EXPENSE_CATEGORIES]}
            value={category}
            onChange={setCategory}
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {EXPENSE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker value={range} onChange={setRange} />
          {filtered && (
            <Button variant="ghost" onClick={clear}>
              Clear filters
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8">
                <span className="sr-only">Receipt</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No expenses match these filters.{" "}
                  <Button variant="link" className="h-auto p-0" onClick={clear}>
                    Clear filters
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {rows.map((e) => (
              <TableRow key={e.slug} className="cursor-pointer" onClick={() => setSelected(e.slug)}>
                <TableCell>
                  <button
                    type="button"
                    className="text-left font-medium hover:text-primary"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setSelected(e.slug);
                    }}
                  >
                    {e.title}
                  </button>
                  {e.vendor && (
                    <small className="block text-xs text-muted-foreground">{e.vendor}</small>
                  )}
                </TableCell>
                <TableCell>{e.category}</TableCell>
                <TableCell>
                  {e.projectName || <span className="text-muted-foreground">Agency overhead</span>}
                </TableCell>
                <TableCell className="num">{cash(e.amount)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatDisplayDate(e.date)}
                </TableCell>
                <TableCell>
                  {e.isRecurring ? (
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Repeat className="size-3.5 text-primary" /> {e.subscriptionName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>
                  <Status>{e.status}</Status>
                </TableCell>
                <TableCell>
                  {e.receiptUrl && (
                    <Paperclip className="size-4 text-muted-foreground" aria-label="Has receipt" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
      <ExpenseSheet expense={current} onClose={() => setSelected(null)} />
    </>
  );
}

function ExpenseSheet({ expense, onClose }: { expense: ExpenseItem | null; onClose: () => void }) {
  const { canReviewExpenses, reviewExpense, deleteExpense } = useMiniOps();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRejecting(false);
    setReason("");
  }, [expense?.slug]);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      toast.success(done);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={Boolean(expense)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {expense && (
          <>
            <SheetHeader>
              <SheetTitle>{expense.title}</SheetTitle>
              <SheetDescription>
                {cash(expense.amount)} · {formatDisplayDate(expense.date)}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Status>{expense.status}</Status>
              {expense.isRecurring && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                  <Repeat className="size-3" /> {expense.subscriptionName} renewal
                </span>
              )}
            </div>
            {expense.status === "Rejected" && (
              <div className="mt-4 flex gap-2 rounded-lg bg-danger-soft p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Rejected by {expense.reviewedByName || "a reviewer"}
                  {expense.rejectionReason ? `: “${expense.rejectionReason}”` : "."}
                  {expense.isMine && " Edit it to send it for approval again."}
                </span>
              </div>
            )}
            <dl className="mt-6 divide-y border-y text-sm">
              {(
                [
                  ["Category", expense.category],
                  [
                    "Project",
                    expense.project ? (
                      <Link
                        to="/projects/$projectSlug"
                        params={{ projectSlug: expense.project }}
                        className="text-primary hover:underline"
                      >
                        {expense.projectName}
                      </Link>
                    ) : (
                      "Agency overhead"
                    ),
                  ],
                  ["Vendor", expense.vendor || "—"],
                  ["Submitted by", expense.submittedByName || "Automatic (subscription)"],
                  ...(expense.status !== "Pending" && expense.reviewedByName
                    ? [
                        [
                          expense.status === "Approved" ? "Approved by" : "Rejected by",
                          expense.reviewedByName,
                        ],
                      ]
                    : []),
                  [
                    "Receipt",
                    expense.receiptUrl ? (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <FileText className="size-4" /> {expense.receiptName}
                      </a>
                    ) : (
                      "None"
                    ),
                  ],
                  ["Notes", expense.notes || "—"],
                ] as [string, ReactNode][]
              ).map(([label, value]) => (
                <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3" key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 whitespace-pre-line break-words">{value}</dd>
                </div>
              ))}
            </dl>

            {canReviewExpenses && expense.status !== "Approved" && !rejecting && (
              <div className="mt-6 flex gap-2">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void run(() => reviewExpense(expense.slug, true), "Expense approved")
                  }
                >
                  <Check /> Approve
                </Button>
                {expense.status === "Pending" && (
                  <Button variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
                    <X /> Reject
                  </Button>
                )}
              </div>
            )}
            {rejecting && (
              <form
                className="mt-6 grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () => reviewExpense(expense.slug, false, reason.trim()),
                    "Expense rejected",
                  ).then(() => setRejecting(false));
                }}
              >
                <Label htmlFor="reject-reason">Reason (shown to the submitter)</Label>
                <Textarea
                  id="reject-reason"
                  rows={2}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="destructive" disabled={busy}>
                    Reject expense
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {expense.canEdit && (
              <div className="mt-6 flex gap-2 border-t pt-6">
                <ExpenseFormDialog expense={expense}>
                  <Button variant="outline">
                    <Pencil /> Edit
                  </Button>
                </ExpenseFormDialog>
                <ConfirmDelete
                  title={`Delete “${expense.title}”?`}
                  text="This removes the expense and its receipt. This can't be undone."
                  onConfirm={() =>
                    run(async () => {
                      await deleteExpense(expense.slug);
                      onClose();
                    }, "Expense deleted")
                  }
                />
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

type ExpenseForm = {
  title: string;
  amount: string;
  date: string;
  category: ExpenseCategory;
  project: string;
  vendor: string;
  notes: string;
};

const toExpenseForm = (e?: ExpenseItem, project = ""): ExpenseForm => ({
  title: e?.title ?? "",
  amount: e ? String(e.amount) : "",
  date: e?.date ?? today(),
  category: e?.category ?? "Other",
  project: e ? (e.project ?? "") : project,
  vendor: e?.vendor ?? "",
  notes: e?.notes ?? "",
});

/** Add (no `expense`) or edit an expense; `project` presets the project slug. */
export function ExpenseFormDialog({
  expense,
  project,
  children,
}: {
  expense?: ExpenseItem;
  project?: string;
  children: ReactNode;
}) {
  const { saveExpense, projects, canReviewExpenses } = useMiniOps();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(() => toExpenseForm(expense, project));
  // undefined = keep the current receipt, null = remove it, File = replace it.
  const [receipt, setReceipt] = useState<File | null | undefined>(undefined);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ExpenseForm | "receipt", string | undefined>>
  >({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ExpenseForm>(key: K, value: ExpenseForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!form.title.trim()) found.title = "Enter what the expense was for.";
    const amount = Number(form.amount);
    if (form.amount === "" || !Number.isFinite(amount) || amount < 0)
      found.amount = "Enter an amount of 0 or more.";
    if (!form.date) found.date = "Pick the date of the expense.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await saveExpense(
        {
          title: form.title.trim(),
          amount: form.amount,
          date: form.date,
          category: form.category,
          project: form.project || null,
          vendor: form.vendor.trim(),
          notes: form.notes.trim(),
          ...(receipt !== undefined ? { receipt } : {}),
        },
        expense?.slug,
      );
      toast.success(
        expense
          ? "Expense updated"
          : canReviewExpenses
            ? "Expense added"
            : "Expense submitted for approval",
      );
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the expense.");
    } finally {
      setSaving(false);
    }
  }

  function pickReceipt(file?: File) {
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      setErrors((e) => ({ ...e, receipt: "Receipts must be 5 MB or smaller." }));
      return;
    }
    setErrors((e) => ({ ...e, receipt: undefined }));
    setReceipt(file);
  }

  const currentReceipt =
    receipt instanceof File ? receipt.name : receipt === null ? "" : (expense?.receiptName ?? "");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setForm(toExpenseForm(expense, project));
          setReceipt(undefined);
          setErrors({});
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{expense ? "Edit expense" : "Add expense"}</DialogTitle>
            <DialogDescription>
              {canReviewExpenses
                ? "Saved to your workspace as approved spend."
                : "It will be sent to an owner or manager for approval."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-x-4 gap-y-5 py-5 sm:grid-cols-2">
            <Field label="What was it for?" id="expense-title" required error={errors.title} wide>
              <Input
                id="expense-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Freelance copywriter"
                autoFocus
              />
            </Field>
            <Field label="Amount" id="expense-amount" required error={errors.amount}>
              <Input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </Field>
            <Field label="Date" id="expense-date" required error={errors.date}>
              <DateInput id="expense-date" value={form.date} onChange={(v) => set("date", v)} />
            </Field>
            <Field label="Category" id="expense-category">
              <SearchableSelect
                id="expense-category"
                options={[...EXPENSE_CATEGORIES]}
                value={form.category}
                onChange={(v) => set("category", (v || "Other") as ExpenseCategory)}
              />
            </Field>
            <Field label="Project" id="expense-project">
              <SearchableSelect
                id="expense-project"
                clearable
                placeholder="Agency overhead"
                searchPlaceholder="Search projects…"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                value={form.project}
                onChange={(v) => set("project", v)}
              />
            </Field>
            <Field label="Vendor" id="expense-vendor">
              <Input
                id="expense-vendor"
                value={form.vendor}
                onChange={(e) => set("vendor", e.target.value)}
                placeholder="Who was paid"
              />
            </Field>
            <Field label="Receipt" id="expense-receipt" error={errors.receipt}>
              <input
                ref={fileRef}
                id="expense-receipt"
                type="file"
                accept={RECEIPT_TYPES}
                className="hidden"
                onChange={(e) => {
                  pickReceipt(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {currentReceipt ? (
                <div className="flex h-10 items-center gap-2 rounded-[10px] border px-3 text-sm">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{currentReceipt}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove receipt"
                    onClick={() => setReceipt(null)}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => fileRef.current?.click()}
                >
                  <Paperclip /> Attach PDF or image
                </Button>
              )}
            </Field>
            <Field label="Notes" id="expense-notes" wide>
              <Textarea
                id="expense-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : expense
                  ? "Save changes"
                  : canReviewExpenses
                    ? "Add expense"
                    : "Submit for approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------- Subscriptions */

function SubscriptionsTab({ canEdit }: { canEdit: boolean }) {
  const { subscriptionList } = useMiniOps();
  const [selected, setSelected] = useState<string | null>(null);
  const active = subscriptionList.filter((s) => s.status === "Active");
  const monthly = active.reduce((s, x) => s + x.monthlyCost, 0);
  const soon = active.filter((s) => daysUntil(s.nextRenewal) <= 30);
  const next = [...active].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal))[0];
  const current = subscriptionList.find((s) => s.slug === selected) ?? null;

  if (subscriptionList.length === 0)
    return (
      <Empty
        icon={<Repeat />}
        title="No subscriptions yet"
        text="Track recurring tools and services. Each renewal is recorded as an expense automatically."
        action={
          canEdit && (
            <SubscriptionFormDialog>
              <Button>
                <Plus /> Add Subscription
              </Button>
            </SubscriptionFormDialog>
          )
        }
      />
    );

  return (
    <>
      <div className="mb-8 metric-grid">
        <Metric label="Monthly subscription cost" value={money(monthly)} />
        <Metric label="Annualized cost" value={money(monthly * 12)} />
        <Metric label="Renewing in 30 days" value={String(soon.length)} />
        <Metric
          label="Next renewal"
          value={next ? `${next.name} · ${formatDisplayDate(next.nextRenewal)}` : "—"}
        />
      </div>
      <Section title="Subscriptions" subtitle="Recurring agency software and services">
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {subscriptionList.map((s) => (
            <Button
              variant="ghost"
              className="h-auto min-w-0 justify-start rounded-none bg-card p-5 text-left hover:bg-accent"
              onClick={() => setSelected(s.slug)}
              key={s.slug}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <b className="truncate">{s.name}</b>
                  {s.status !== "Active" && <Status>{s.status}</Status>}
                </span>
                <small className="mt-1 block text-muted-foreground">
                  {s.status === "Active"
                    ? `Renews ${formatDisplayDate(s.nextRenewal)}`
                    : `${s.status} · ${s.vendor || s.category}`}
                </small>
                <span className="mt-5 flex items-center justify-between">
                  <strong className="font-mono text-lg">
                    {cash(s.amount)}
                    <small className="font-sans font-normal text-muted-foreground">
                      /{CYCLE_SUFFIX[s.billingCycle]}
                    </small>
                  </strong>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </span>
              </span>
            </Button>
          ))}
        </div>
      </Section>
      <SubscriptionSheet
        subscription={current}
        canEdit={canEdit}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function SubscriptionSheet({
  subscription: s,
  canEdit,
  onClose,
}: {
  subscription: SubscriptionItem | null;
  canEdit: boolean;
  onClose: () => void;
}) {
  const { expenseList, saveSubscription, deleteSubscription } = useMiniOps();
  const [busy, setBusy] = useState(false);
  const renewals = s ? expenseList.filter((e) => e.subscription === s.slug) : [];

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      toast.success(done);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={Boolean(s)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {s && (
          <>
            <SheetHeader>
              <SheetTitle>{s.name}</SheetTitle>
              <SheetDescription>
                {[s.vendor, s.category].filter(Boolean).join(" · ")}
              </SheetDescription>
            </SheetHeader>
            {s.status === "Active" ? (
              <div className="mt-6 flex items-center gap-3 rounded-lg bg-warning-soft p-4 text-warning">
                <AlertCircle className="size-4 shrink-0" />
                <b className="text-sm">
                  Renews on {formatDisplayDate(s.nextRenewal)}
                  {daysUntil(s.nextRenewal) >= 0 && ` (in ${daysUntil(s.nextRenewal)} days)`}. It
                  will be recorded as an expense automatically.
                </b>
              </div>
            ) : (
              <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
                <b>{s.status}.</b> No renewals are recorded while it isn't active.
              </div>
            )}
            <dl className="mt-6 divide-y border-y text-sm">
              {(
                [
                  ["Cost", `${cash(s.amount)} / ${s.billingCycle.toLowerCase()}`],
                  ["Per month", cash(s.monthlyCost)],
                  ["Per year", money(s.annualCost)],
                  ["Payment method", s.paymentMethod || "—"],
                  [
                    "Billed to",
                    s.project ? (
                      <Link
                        to="/projects/$projectSlug"
                        params={{ projectSlug: s.project }}
                        className="text-primary hover:underline"
                      >
                        {s.projectName}
                      </Link>
                    ) : (
                      "Agency overhead"
                    ),
                  ],
                  ["Status", <Status key="s">{s.status}</Status>],
                  ["Notes", s.notes || "—"],
                ] as [string, ReactNode][]
              ).map(([label, value]) => (
                <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3" key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 whitespace-pre-line break-words">{value}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-6 text-sm font-semibold">Recorded renewals ({s.renewalCount})</h3>
            {renewals.length ? (
              <ul className="mt-2 divide-y rounded-lg border text-sm">
                {renewals.slice(0, 12).map((e) => (
                  <li key={e.slug} className="flex justify-between p-2.5">
                    <span>{formatDisplayDate(e.date)}</span>
                    <span className="font-mono">{cash(e.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">None yet.</p>
            )}
            {canEdit && (
              <div className="mt-6 flex flex-wrap gap-2 border-t pt-6">
                <SubscriptionFormDialog subscription={s}>
                  <Button variant="outline">
                    <Pencil /> Edit
                  </Button>
                </SubscriptionFormDialog>
                {s.status === "Active" ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () =>
                          saveSubscription({ ...toSubscriptionWrite(s), status: "Paused" }, s.slug),
                        "Subscription paused",
                      )
                    }
                  >
                    <Pause /> Pause
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () =>
                          saveSubscription({ ...toSubscriptionWrite(s), status: "Active" }, s.slug),
                        "Subscription active again",
                      )
                    }
                  >
                    <Play /> Resume
                  </Button>
                )}
                <ConfirmDelete
                  title={`Delete ${s.name}?`}
                  text="Recorded renewals stay in your expenses. This can't be undone."
                  onConfirm={() =>
                    run(async () => {
                      await deleteSubscription(s.slug);
                      onClose();
                    }, "Subscription deleted")
                  }
                />
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const toSubscriptionWrite = (s?: SubscriptionItem): SubscriptionWrite => ({
  name: s?.name ?? "",
  vendor: s?.vendor ?? "",
  category: s?.category ?? "Software",
  amount: s ? String(s.amount) : "",
  billing_cycle: s?.billingCycle ?? "Monthly",
  next_renewal: s?.nextRenewal ?? "",
  payment_method: s?.paymentMethod ?? "",
  status: s?.status ?? "Active",
  project: s?.project ?? null,
  notes: s?.notes ?? "",
});

// 12+ digits in a row looks like a full card number; the API rejects those too.
const looksLikeCardNumber = (v: string) => /\d{12,}/.test(v.replace(/[\s-]/g, ""));

function SubscriptionFormDialog({
  subscription,
  children,
}: {
  subscription?: SubscriptionItem;
  children: ReactNode;
}) {
  const { saveSubscription, projects } = useMiniOps();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SubscriptionWrite>(() => toSubscriptionWrite(subscription));
  const [errors, setErrors] = useState<
    Partial<Record<keyof SubscriptionWrite, string | undefined>>
  >({});
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof SubscriptionWrite>(key: K, value: SubscriptionWrite[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!form.name.trim()) found.name = "Enter the subscription's name.";
    const amount = Number(form.amount);
    if (form.amount === "" || !Number.isFinite(amount) || amount < 0)
      found.amount = "Enter an amount of 0 or more.";
    if (!form.next_renewal) found.next_renewal = "Pick the next renewal date.";
    if (looksLikeCardNumber(form.payment_method))
      found.payment_method = "Don't enter a full card number — use a label like “Visa •••• 4242”.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await saveSubscription(
        { ...form, name: form.name.trim(), vendor: form.vendor.trim(), notes: form.notes.trim() },
        subscription?.slug,
      );
      const past = daysUntil(form.next_renewal) <= 0 && form.status === "Active";
      toast.success(
        `${subscription ? "Subscription updated" : `${form.name.trim()} added`}${
          past ? " — the due renewal was recorded as an expense" : ""
        }`,
      );
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the subscription.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setForm(toSubscriptionWrite(subscription));
          setErrors({});
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{subscription ? "Edit subscription" : "Add subscription"}</DialogTitle>
            <DialogDescription>
              Track a recurring tool or service. Each renewal is recorded as an expense.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-x-4 gap-y-5 py-5 sm:grid-cols-2">
            <Field label="Name" id="sub-name" required error={errors.name}>
              <Input
                id="sub-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Figma"
                autoFocus
              />
            </Field>
            <Field label="Vendor" id="sub-vendor">
              <Input
                id="sub-vendor"
                value={form.vendor}
                onChange={(e) => set("vendor", e.target.value)}
              />
            </Field>
            <Field label="Amount per cycle" id="sub-amount" required error={errors.amount}>
              <Input
                id="sub-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </Field>
            <Field label="Billing cycle" id="sub-cycle">
              <SearchableSelect
                id="sub-cycle"
                options={[...BILLING_CYCLES]}
                value={form.billing_cycle}
                onChange={(v) =>
                  set("billing_cycle", (v || "Monthly") as SubscriptionWrite["billing_cycle"])
                }
              />
            </Field>
            <Field label="Next renewal" id="sub-renewal" required error={errors.next_renewal}>
              <DateInput
                id="sub-renewal"
                value={form.next_renewal}
                onChange={(v) => set("next_renewal", v)}
              />
            </Field>
            <Field label="Category" id="sub-category">
              <SearchableSelect
                id="sub-category"
                options={[...EXPENSE_CATEGORIES]}
                value={form.category}
                onChange={(v) => set("category", (v || "Software") as ExpenseCategory)}
              />
            </Field>
            <Field label="Payment method" id="sub-payment" error={errors.payment_method}>
              <Input
                id="sub-payment"
                value={form.payment_method}
                onChange={(e) => set("payment_method", e.target.value)}
                placeholder="Visa •••• 4242"
                autoComplete="off"
              />
            </Field>
            <Field label="Billed to" id="sub-project">
              <SearchableSelect
                id="sub-project"
                clearable
                placeholder="Agency overhead"
                searchPlaceholder="Search projects…"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                value={form.project ?? ""}
                onChange={(v) => set("project", v || null)}
              />
            </Field>
            {subscription && (
              <Field label="Status" id="sub-status">
                <SearchableSelect
                  id="sub-status"
                  options={[...SUBSCRIPTION_STATUSES]}
                  value={form.status}
                  onChange={(v) => set("status", (v || "Active") as SubscriptionWrite["status"])}
                />
              </Field>
            )}
            <Field label="Notes" id="sub-notes" wide>
              <Textarea
                id="sub-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : subscription ? "Save changes" : "Add subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Shared */

function Field({
  label,
  id,
  required,
  error,
  wide,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  error?: string | undefined;
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
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ConfirmDelete({
  title,
  text,
  onConfirm,
}: {
  title: string;
  text: string;
  onConfirm: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="text-destructive hover:text-destructive">
          <Trash2 /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              setBusy(true);
              void onConfirm().finally(() => setBusy(false));
            }}
          >
            {busy ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-12 text-center shadow-card">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-6">
        {icon}
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
