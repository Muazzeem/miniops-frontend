import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronRight, Clock3, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FinanceChart } from "@/components/miniops/charts";
import { projects, money } from "@/data/mock";
import { Status } from "@/components/miniops/core";
import { LoginDialog } from "@/features/login-dialog";

const capabilities = [
  [
    "Project profitability",
    "Revenue, cost, budget burn, margin, and progress in one decision-ready view.",
  ],
  ["Team utilization", "Understand available and billable capacity without ranking employees."],
  [
    "Profit leakage",
    "Spot low margins, unused capacity, recurring software, and over-budget work.",
  ],
];
const faq = [
  [
    "Is MiniOps a project management tool?",
    "No. MiniOps is a profitability and operations workspace with lightweight task coordination.",
  ],
  [
    "Who is MiniOps for?",
    "Small digital agencies and professional service teams with roughly 3–15 people.",
  ],
  [
    "Can I track team costs?",
    "Yes. Hourly cost, billable time, and capacity connect directly to project profitability.",
  ],
  [
    "Can I calculate project profitability?",
    "Yes. MiniOps combines revenue, team cost, expenses, and allocated overhead.",
  ],
  [
    "Can I track recurring expenses?",
    "Yes. Track recurring software and overhead without replacing accounting software.",
  ],
  [
    "Does MiniOps replace accounting software?",
    "No. It adds operational profitability context; it does not replace your books.",
  ],
  [
    "How is profitability calculated?",
    "Profit equals revenue minus team cost, direct expenses, and allocated overhead.",
  ],
  ["Is there a free trial?", "Yes. Every plan includes a 14-day trial."],
];

export function Landing() {
  return (
    <div className="landing bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2.5 font-display text-base font-semibold"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm text-primary-foreground">
              M
            </span>
            <span className="truncate">MiniOps</span>
          </Link>
          <div className="flex items-center gap-3 md:gap-7">
            <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
              <a className="transition-colors hover:text-foreground" href="#product">
                Product
              </a>
              <a className="transition-colors hover:text-foreground" href="#pricing">
                Pricing
              </a>
              <a className="transition-colors hover:text-foreground" href="#faq">
                FAQ
              </a>
            </nav>
            <Link
              to="/employee"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Employee sign in
            </Link>
            <LoginDialog />
            <Button asChild size="sm">
              <Link to="/app">
                Open demo <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main>
        <section className="hero-band overflow-hidden border-b">
          <div className="mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,.82fr)_minmax(560px,1.18fr)] lg:px-8 lg:py-20">
            <div className="min-w-0">
              <p className="eyebrow">Profitability intelligence for small agencies</p>
              <h1 className="mt-5 max-w-2xl font-display text-5xl font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
                Run your agency's day in <span className="text-primary">one simple workspace.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                Plan work, assign tasks, chat with your team, track time and respond to leads —
                everything a small agency needs to run the day.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/app">
                    Start Free <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#product">See How It Works</a>
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                14-day trial · No payment required for this demo
              </p>
            </div>
            <DashboardPreview />
          </div>
        </section>
        <section className="marketing-section">
          <div className="max-w-3xl">
            <p className="eyebrow">The operating loop</p>
            <h2 className="marketing-heading">
              Track the work. Understand the economics. Improve the margin.
            </h2>
            <p className="marketing-lead">
              MiniOps brings the few signals that matter into one focused workspace, without trying
              to replace every tool your agency already uses.
            </p>
          </div>
          <div className="mt-14 grid border-y md:grid-cols-3">
            {[
              ["Track", "Project activity, team time, and true delivery costs."],
              ["Understand", "Profitability, client value, and capacity in context."],
              ["Improve", "Decisions, margins, and the leaks holding growth back."],
            ].map((x, i) => (
              <div
                className="border-b py-8 md:border-b-0 md:border-r md:px-8 md:first:pl-0 last:border-0"
                key={x[0]}
              >
                <span className="font-mono text-xs font-semibold text-primary">0{i + 1}</span>
                <h3 className="mt-8 font-display text-xl font-semibold">{x[0]}</h3>
                <p className="mt-2 max-w-xs leading-7 text-muted-foreground">{x[1]}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="product" className="border-y bg-surface-subtle">
          <div className="marketing-section">
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div>
                <p className="eyebrow">Built for decisions</p>
                <h2 className="marketing-heading">See the business behind every project.</h2>
              </div>
              <p className="marketing-lead lg:justify-self-end">
                Clear operational context for owners who need answers, not another system to
                configure.
              </p>
            </div>
            <div className="mt-14 grid overflow-hidden rounded-lg border bg-card md:grid-cols-2">
              {capabilities.map((x, i) => (
                <div
                  className="border-b p-7 md:nth-[odd]:border-r md:nth-last-[-n+2]:border-b-0"
                  key={x[0]}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-8 place-items-center rounded-md bg-primary-soft text-primary">
                      <Check className="size-4" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-8 font-display text-xl font-semibold">{x[0]}</h3>
                  <p className="mt-2 max-w-md leading-7 text-muted-foreground">{x[1]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="marketing-section">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="eyebrow">Made for small agencies</p>
              <h2 className="marketing-heading">
                Real delivery economics, without enterprise overhead.
              </h2>
              <p className="marketing-lead">
                For web, product, brand, marketing, and consulting teams that need a reliable view
                of project health and profit.
              </p>
            </div>
            <div className="border-y">
              {[
                "Web & product agencies",
                "Brand & creative studios",
                "Marketing teams",
                "Software consultancies",
              ].map((x, i) => (
                <div
                  className="flex items-center justify-between border-b py-5 last:border-0"
                  key={x}
                >
                  <span className="font-medium">{x}</span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="pricing" className="border-y bg-surface-subtle">
          <div className="marketing-section">
            <p className="eyebrow">Simple pricing</p>
            <h2 className="marketing-heading">Clarity that pays for itself.</h2>
            <div className="mt-12 grid overflow-hidden rounded-lg border bg-card md:grid-cols-3">
              {[
                ["Starter", "$19", "For a focused team of up to 3"],
                ["Growth", "$39", "For growing agencies up to 10"],
                ["Agency", "$79", "For established teams up to 25"],
              ].map((p, i) => (
                <div className="border-b p-7 md:border-b-0 md:border-r last:border-0" key={p[0]}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold">{p[0]}</h3>
                    {i === 1 && (
                      <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-8">
                    <b className="font-display text-4xl">{p[1]}</b>
                    <span className="text-muted-foreground">/month</span>
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{p[2]}</p>
                  <Button asChild variant={i === 1 ? "default" : "outline"} className="mt-8 w-full">
                    <Link to="/app">Start 14-day trial</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="faq" className="marketing-section">
          <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2 className="marketing-heading">The useful details.</h2>
            </div>
            <Accordion type="single" collapsible className="border-t">
              {faq.map((x, i) => (
                <AccordionItem value={String(i)} key={x[0]}>
                  <AccordionTrigger>{x[0]}</AccordionTrigger>
                  <AccordionContent>{x[1]}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
        <section className="border-t bg-foreground text-background">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 md:flex-row md:items-center lg:px-8">
            <div>
              <p className="font-display text-3xl font-semibold sm:text-4xl">
                Run a more profitable agency.
              </p>
              <p className="mt-3 text-background/65">
                See what’s working, what’s leaking, and what needs attention.
              </p>
            </div>
            <Button asChild variant="secondary" size="lg">
              <Link to="/app">
                Open MiniOps <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-9 text-sm text-muted-foreground md:flex-row lg:px-8">
        <b className="font-display text-foreground">MiniOps</b>
        <span>© 2026 MiniOps · myminiops.com</span>
        <span>Profitability intelligence for small agencies.</span>
      </footer>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative min-w-0 lg:translate-x-8">
      <div className="preview-shell overflow-hidden rounded-xl border bg-card shadow-preview">
        <div className="grid h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-positive" />
            <b className="truncate text-sm">Northstar Digital</b>
          </div>
          <small className="shrink-0 text-muted-foreground">September 2026</small>
        </div>
        <div className="grid md:grid-cols-[132px_minmax(0,1fr)]">
          <aside className="hidden border-r bg-sidebar p-3 md:block">
            {["Overview", "Projects", "Tasks", "Clients", "Team", "Chat", "Expenses"].map(
              (x, i) => (
                <div
                  className={
                    i === 0
                      ? "rounded-md bg-sidebar-accent px-3 py-2 text-xs font-semibold text-sidebar-accent-foreground"
                      : "px-3 py-2 text-xs text-muted-foreground"
                  }
                  key={x}
                >
                  {x}
                </div>
              ),
            )}
          </aside>
          <div className="min-w-0 p-4 sm:p-5">
            <div className="grid grid-cols-2 border md:grid-cols-4">
              {[
                ["Revenue", "$84,500", "12.4%"],
                ["Total cost", "$48,200", "5.8%"],
                ["Profit", "$36,300", "21.6%"],
                ["Margin", "42.9%", "3.2%"],
              ].map((x) => (
                <div
                  className="border-b border-r p-3 nth-[2n]:border-r-0 md:border-b-0 md:nth-[2n]:border-r md:last:border-r-0"
                  key={x[0]}
                >
                  <small className="text-muted-foreground">{x[0]}</small>
                  <b className="mt-1 block font-mono text-base sm:text-lg">{x[1]}</b>
                  <span className="text-[10px] font-semibold text-positive">↗ {x[2]}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div className="h-40 min-w-0">
                <FinanceChart />
              </div>
              <div className="grid content-start gap-2">
                <div className="border p-3">
                  <div className="flex items-center justify-between">
                    <small className="text-muted-foreground">Utilization</small>
                    <Gauge className="size-3.5 text-primary" />
                  </div>
                  <b className="mt-2 block font-mono text-xl">81.1%</b>
                  <div className="mt-2 h-1.5 bg-muted">
                    <div className="h-full w-4/5 bg-primary" />
                  </div>
                </div>
                <div className="border p-3">
                  <div className="flex items-center justify-between">
                    <small className="text-muted-foreground">Overdue tasks</small>
                    <Clock3 className="size-3.5 text-warning" />
                  </div>
                  <b className="mt-2 block font-mono text-sm text-warning">3 need attention</b>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(70px,.7fr)_auto] border-b pb-2 text-[10px] font-semibold text-muted-foreground">
                <span>Project</span>
                <span>Profit</span>
                <span>Health</span>
              </div>
              {projects.slice(0, 3).map((p) => (
                <div
                  className="grid grid-cols-[minmax(0,1.5fr)_minmax(70px,.7fr)_auto] items-center border-b py-2 text-[10px] sm:text-xs"
                  key={p.id}
                >
                  <b className="truncate pr-2">{p.name}</b>
                  <span className="font-mono">{money(p.profit)}</span>
                  <Status>{p.health}</Status>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-md border bg-card px-4 py-3 shadow-lg xl:flex">
        <span className="grid size-8 place-items-center rounded-md bg-warning-soft text-warning">
          <Clock3 className="size-4" />
        </span>
        <span>
          <small className="block text-muted-foreground">Needs attention</small>
          <b className="text-xs">Atlas is 92% through budget</b>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </div>
  );
}
