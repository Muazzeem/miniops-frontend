import { useState, type FormEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput, TimeInput } from "./date-time";
import { SearchableSelect } from "./select-search";
import { useMiniOps, useNeeds } from "@/features/store";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export function CreateDialog({
  kind,
  onCreate,
}: {
  kind: "Project" | "Client" | "Task" | "Expense" | "Time" | "Employee";
  onCreate?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  useNeeds(...(open ? (["clients", "projects", "members"] as const) : []));
  const labels: Record<string, string[]> = {
    Project: [
      "Project Name",
      "Client",
      "Project Type",
      "Revenue / Contract Value",
      "Budget",
      "Start Date",
      "End Date",
      "Assigned Team",
    ],
    Client: ["Client Name", "Industry", "Contact Name", "Email", "Phone"],
    Task: ["Task Title", "Project", "Assigned To", "Due Date"],
    Expense: ["Expense", "Category", "Project", "Amount", "Date"],
    Time: ["Date", "Start Time", "Employee", "Project", "Description", "Hours"],
    Employee: ["Name", "Email", "Role / Position"],
  };
  const currentLabels = labels[kind] ?? [];
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const { clients, projects, team } = useMiniOps();
  const people = team.map((t) => t[0]);
  const selects: Record<string, string[]> = {
    Client: clients.map((c) => c[1]),
    Project: [
      ...projects.map((p) => p.name),
      ...(kind === "Expense" || kind === "Time" ? ["Agency overhead"] : []),
    ],
    "Assigned To": people,
    Employee: people,
    "Assigned Team": people,
    Category: ["Software", "Hosting", "Contractor", "Travel", "Equipment", "Marketing", "Other"],
    "Project Type": ["Website", "Branding", "Web app", "Marketing", "Retainer", "Other"],
    Industry: [
      "Technology",
      "Retail",
      "Healthcare",
      "Finance",
      "Hospitality",
      "Education",
      "Other",
    ],
  };
  function save(e: FormEvent) {
    e.preventDefault();
    onCreate?.(name || `New ${kind}`);
    toast.success(
      kind === "Employee"
        ? `Invitation sent to ${name || "jordan@example.com"}.`
        : `${kind} ${kind === "Time" ? "logged" : "created"}`,
    );
    setOpen(false);
    setName("");
    setStart("");
  }
  const triggerLabel =
    kind === "Employee"
      ? "Add Team Member"
      : kind === "Time"
        ? "Log Time"
        : kind === "Expense"
          ? "Add Expense"
          : kind === "Client"
            ? "Add Client"
            : `New ${kind}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>
              {kind === "Employee"
                ? "Invite employee"
                : kind === "Time"
                  ? "Log time"
                  : `Add ${kind.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              Enter the essential details. This demo keeps changes for the current session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-x-4 gap-y-5 py-5 sm:grid-cols-2">
            {currentLabels.map((l, i) => (
              <div key={l} className={l === "Description" ? "sm:col-span-2" : ""}>
                <Label htmlFor={`${kind}-${i}`}>
                  {l}
                  {i === 0 && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
                <div className="mt-1.5">
                  {l.includes("Date") ? (
                    <DateInput
                      id={`${kind}-${i}`}
                      onChange={l === "Start Date" ? setStart : undefined}
                      min={l === "End Date" && start ? start : undefined}
                      hint={
                        l === "End Date" && !start
                          ? "Pick a start date first to limit this range."
                          : undefined
                      }
                    />
                  ) : l === "Start Time" ? (
                    <TimeInput id={`${kind}-${i}`} defaultValue="09:00" />
                  ) : selects[l] ? (
                    <SearchableSelect
                      id={`${kind}-${i}`}
                      options={selects[l]!}
                      placeholder={`Select ${l.toLowerCase()}`}
                      searchPlaceholder={`Search ${l.toLowerCase()}…`}
                    />
                  ) : (
                    <Input
                      id={`${kind}-${i}`}
                      type={
                        l === "Email"
                          ? "email"
                          : l === "Phone"
                            ? "tel"
                            : l.includes("Amount") ||
                                l.includes("Value") ||
                                l === "Budget" ||
                                l === "Hours"
                              ? "number"
                              : "text"
                      }
                      inputMode={
                        l.includes("Amount") ||
                        l.includes("Value") ||
                        l === "Budget" ||
                        l === "Hours"
                          ? "decimal"
                          : undefined
                      }
                      min={
                        l === "Hours" ||
                        l.includes("Amount") ||
                        l === "Budget" ||
                        l.includes("Value")
                          ? 0
                          : undefined
                      }
                      step={l === "Hours" ? 0.25 : undefined}
                      value={i === 0 ? name : undefined}
                      onChange={i === 0 ? (e) => setName(e.target.value) : undefined}
                      maxLength={120}
                      className="h-11 sm:h-10"
                      required={i === 0}
                    />
                  )}
                </div>
              </div>
            ))}
            {kind === "Task" && (
              <FieldSelect label="Priority" items={["Low", "Medium", "High", "Urgent"]} />
            )}{" "}
            {kind === "Employee" && (
              <FieldSelect
                label="Permissions"
                items={["Standard access", "Project manager", "Operations manager"]}
              />
            )}
            <div className="sm:col-span-2">
              <Label htmlFor={`${kind}-notes`}>Notes</Label>
              <Textarea id={`${kind}-notes`} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {kind === "Employee"
                ? "Send Invitation"
                : kind === "Time"
                  ? "Save Time"
                  : `Create ${kind}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function FieldSelect({ label, items }: { label: string; items: string[] }) {
  const first = items[0] ?? "";
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">
        <SearchableSelect options={items} defaultValue={first} aria-label={label} />
      </div>
    </div>
  );
}
export function Section({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-2xl bg-card p-5 shadow-card md:p-6 ${className ?? ""}`}>
      <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {children}
    </section>
  );
}
