import { useMemo, useState } from "react";
import {
  DateRangePicker,
  inRange,
  shortToDate,
  displayShort,
  type IsoRange,
} from "@/components/miniops/date-time";
import { SearchableSelect } from "@/components/miniops/select-search";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, Metric, Status } from "@/components/miniops/core";
import { CreateDialog, Section } from "@/components/miniops/forms";
import { ExpenseChart, FinanceChart, UtilizationChart } from "@/components/miniops/charts";
import { money, type Project } from "@/data/mock";
import { useMiniOps } from "./store";
import { ExpensesPage } from "./expenses";
import { Projects } from "./projects";
import { Clients } from "./clients";
const SearchBar = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="relative w-full sm:w-auto">
    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
    <Input
      className="w-full pl-9 sm:w-64"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search…"
    />
  </div>
);
function TeamTable({ compact = false }: { compact?: boolean }) {
  const { team } = useMiniOps();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Hourly cost</TableHead>
          <TableHead className="text-right">Capacity</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Billable</TableHead>
          <TableHead className="text-right">Utilization</TableHead>
          {!compact && <TableHead>Status</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {team.map((x) => (
          <TableRow key={String(x[0])}>
            <TableCell>
              <Link
                to="/team/$memberSlug"
                params={{ memberSlug: String(x[0]) }}
                className="flex items-center gap-2 font-medium"
              >
                <span className="avatar">
                  {String(x[1])
                    .split(" ")
                    .map((y) => y[0])
                    .join("")}
                </span>
                {x[1]}
              </Link>
            </TableCell>
            <TableCell>{x[2]}</TableCell>
            <TableCell className="num">${x[6]}/hr</TableCell>
            <TableCell className="num">160h</TableCell>
            <TableCell className="num">{x[3]}h</TableCell>
            <TableCell className="num">{x[4]}h</TableCell>
            <TableCell className="num">{x[5]}%</TableCell>
            {!compact && (
              <TableCell>
                <Status>Active</Status>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export function Expenses() {
  return <ExpensesPage />;
}
function LegacyExpenses() {
  return (
    <>
      <PageHeader
        title="Expenses"
        description="Where is money going across projects and agency overhead?"
        action={<CreateDialog kind="Expense" />}
      />
      <div className="mb-8 metric-grid">
        <Metric tone="violet" label="Total expenses" value="$17,540" />
        <Metric tone="primary" label="Project expenses" value="$12,100" />
        <Metric label="Agency overhead" value="$5,440" />
        <Metric tone="profit" label="Recurring" value="$640/mo" />
      </div>
      <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
        <Section title="All expenses">
          <ExpenseTable />
        </Section>
        <Section title="Recurring expenses" subtitle="$640 per month total">
          <div className="divide-y border-y">
            {[
              ["Figma", "$75", "Oct 18"],
              ["Adobe", "$120", "Oct 16"],
              ["Slack", "$90", "Oct 14"],
              ["Notion", "$65", "Oct 8"],
            ].map((x) => (
              <div className="flex justify-between py-3" key={x[0]}>
                <span>
                  <b className="text-sm">{x[0]}</b>
                  <small className="block text-muted-foreground">Renews {x[2]}</small>
                </span>
                <span className="font-mono text-sm">{x[1]}/mo</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
function ExpenseTable() {
  const { expenses } = useMiniOps();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Expense", "Category", "Project", "Amount", "Date", "Recurring", "Status"].map((x) => (
            <TableHead key={x} className={x === "Amount" ? "text-right" : ""}>
              {x}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((x) => (
          <TableRow key={String(x[0])}>
            {x.map((v, i) => (
              <TableCell key={i} className={i === 3 ? "num" : ""}>
                {i === 3 ? money(Number(v)) : i === 6 ? <Status>{v}</Status> : v}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
const reportCards = [
  ["Project Profitability", "Which projects produce the strongest returns?", "/reports/projects"],
  ["Client Profitability", "Which relationships create the most value?", "/reports/clients"],
  ["Team Utilization", "How is team capacity being used?", "/reports/team"],
  ["Revenue vs Cost", "How revenue, cost, and profit move over time.", "/reports/revenue"],
  ["Expense Breakdown", "Where operating spend is concentrated.", "/reports/expenses"],
] as const;
export function Reports() {
  return (
    <>
      <PageHeader title="Reports" description="Move from what happened to why it happened." />
      <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-2 xl:grid-cols-3">
        {reportCards.map(([t, d, to]) => (
          <Link to={to} className="group bg-card p-6 hover:bg-accent/40" key={t}>
            <BarChart3 className="size-5 text-primary" />
            <h2 className="mt-8 font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            <span className="mt-6 flex items-center gap-1 text-sm font-medium text-primary">
              Open report{" "}
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
export function ReportPage({
  type,
}: {
  type: "projects" | "clients" | "team" | "revenue" | "expenses";
}) {
  const { activeWorkspace, chartData, team, expenses } = useMiniOps();
  const title = reportCards.find((x) => x[2].endsWith(type))?.[0] ?? "Report";
  return (
    <>
      <PageHeader
        title={title}
        description={`${activeWorkspace.name} · Last 6 months`}
        action={<Button variant="outline">Export CSV</Button>}
      />
      <div className="mb-8 metric-grid">
        <Metric label="Total revenue" value="$84,500" />
        <Metric label="Total profit" value="$36,300" />
        <Metric label="Average margin" value="42.9%" />
        <Metric
          label={type === "team" ? "Average utilization" : "Strongest performer"}
          value={type === "team" ? "81.1%" : "Acme Website"}
        />
      </div>
      <Section title={title} subtitle="Hover chart values for details">
        <div className="h-80">
          {type === "team" ? (
            <UtilizationChart team={team} />
          ) : type === "expenses" ? (
            <ExpenseChart expenses={expenses} />
          ) : (
            <FinanceChart data={chartData} />
          )}
        </div>
      </Section>
      {type === "projects" && <Projects />}
      {type === "clients" && <Clients />}
      {type === "team" && <TeamTable />}
      {type === "expenses" && (
        <div className="grid grid-cols-2 gap-px rounded-md border bg-border md:grid-cols-5">
          {[
            ["Software", "$4,200"],
            ["Contractors", "$8,500"],
            ["Advertising", "$2,100"],
            ["Hosting", "$900"],
            ["Other", "$1,200"],
          ].map((x) => (
            <div className="bg-card p-4" key={x[0]}>
              <small className="text-muted-foreground">{x[0]}</small>
              <b className="mt-2 block font-mono text-xl">{x[1]}</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
export function SettingsPage() {
  const { activeWorkspace } = useMiniOps();
  const [section, setSection] = useState("Workspace");
  const menu = [
    "Workspace",
    "Team",
    "Billing",
    "Financial Settings",
    "Notifications",
    "Preferences",
  ];
  return (
    <>
      <PageHeader
        title="Settings"
        description={`Configure how ${activeWorkspace.name} works in MiniOps.`}
      />
      <div className="grid gap-8 md:grid-cols-[210px_1fr]">
        <nav className="flex gap-1 overflow-auto md:flex-col">
          {menu.map((x) => (
            <Button
              key={x}
              variant={section === x ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setSection(x)}
            >
              {x}
            </Button>
          ))}
        </nav>
        <Section title={section} subtitle="Changes are stored for this demo session only.">
          <SettingsForm section={section} workspaceName={activeWorkspace.name} />
        </Section>
      </div>
    </>
  );
}
function SettingsForm({ section, workspaceName }: { section: string; workspaceName: string }) {
  if (section === "Notifications")
    return (
      <div className="max-w-2xl divide-y border-y">
        {[
          "Project budget warnings",
          "Low margin alerts",
          "Expense alerts",
          "Subscription reminders",
        ].map((x) => (
          <label className="flex items-center justify-between py-4 text-sm" key={x}>
            <span>
              <b>{x}</b>
              <small className="block text-muted-foreground">
                Receive this notification in MiniOps.
              </small>
            </span>
            <Switch defaultChecked />
          </label>
        ))}
      </div>
    );
  if (section === "Billing")
    return (
      <div className="insight">
        Your current Growth plan is managed from the dedicated billing page.{" "}
        <Link to="/billing" className="font-medium text-primary">
          Open billing
        </Link>
      </div>
    );
  const fields =
    section === "Financial Settings"
      ? [
          ["Default Currency", "USD — US Dollar"],
          ["Target Profit Margin", "30%"],
          ["Default Working Hours", "40 hours/week"],
          ["Default Overhead Allocation", "15%"],
        ]
      : [
          ["Workspace Name", workspaceName],
          ["Industry", "Digital Agency"],
          ["Default Currency", "USD — US Dollar"],
          ["Timezone", "Asia/Dhaka (UTC+6)"],
          ["Working Days", "Monday–Friday"],
        ];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        toast.success("Settings updated");
      }}
      className="max-w-2xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((x) => (
          <label className="text-sm" key={x[0]}>
            <span className="font-medium">{x[0]}</span>
            <Input className="mt-1.5" defaultValue={x[1]} />
          </label>
        ))}
      </div>
      <Button className="mt-6">Save changes</Button>
    </form>
  );
}
export function Billing() {
  const { activeWorkspace } = useMiniOps();
  const plans = [
    ["Starter", "$19", "Up to 3 team members"],
    ["Growth", "$39", "Up to 10 team members"],
    ["Agency", "$79", "Up to 25 team members"],
  ];
  return (
    <>
      <PageHeader title="Billing" description={`Plan and usage for ${activeWorkspace.name}.`} />
      <div className="mb-8 flex items-center justify-between rounded-md border bg-secondary/50 p-5">
        <span>
          <small className="text-muted-foreground">Current plan</small>
          <b className="block text-lg">Growth · Monthly</b>
        </span>
        <Status>Active</Status>
      </div>
      <Section title="Choose a plan" subtitle="All plans include a 14-day trial.">
        <div className="grid gap-px overflow-hidden rounded-md border bg-border md:grid-cols-3">
          {plans.map((p, i) => (
            <div className="bg-card p-6" key={p[0]}>
              <div className="flex justify-between">
                <h2 className="font-semibold">{p[0]}</h2>
                {i === 1 && <Status>Current</Status>}
              </div>
              <p className="mt-6">
                <b className="font-mono text-3xl">{p[1]}</b>
                <span className="text-muted-foreground">/month</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{p[2]}</p>
              <Button
                variant={i === 1 ? "outline" : "default"}
                className="mt-6 w-full"
                onClick={() =>
                  toast.info("Payment configuration is not connected in this frontend demo.")
                }
              >
                {i === 1 ? "Current plan" : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>
      </Section>
      <div className="insight">
        Payment configuration is not connected. No charge will be made from this frontend demo.
      </div>
    </>
  );
}
export function Profile() {
  return (
    <>
      <PageHeader title="Profile" description="Manage your personal account preferences." />
      <div className="grid max-w-3xl gap-8 md:grid-cols-[180px_1fr]">
        <div className="grid size-28 place-items-center rounded-full bg-secondary text-3xl font-semibold">
          AM
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Changes saved");
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {[
            ["Name", "Alex Morgan"],
            ["Email", "alex@northstardigital.co"],
            ["Timezone", "Asia/Dhaka (UTC+6)"],
            ["Password", "••••••••••••"],
          ].map((x) => (
            <label className="text-sm" key={x[0]}>
              <b>{x[0]}</b>
              <Input className="mt-1.5" defaultValue={x[1]} />
            </label>
          ))}
          <div className="sm:col-span-2">
            <label className="flex items-center justify-between border-y py-4 text-sm">
              Email notifications <Switch defaultChecked />
            </label>
            <div className="mt-6 flex gap-2">
              <Button>Save changes</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  toast.info("Signed out locally. No account session exists in this demo.")
                }
              >
                Sign out
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
