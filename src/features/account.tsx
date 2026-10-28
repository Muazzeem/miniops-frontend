import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Check, CreditCard, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NotificationPrefsList } from "@/features/notifications";
import { ChangePasswordForm } from "@/features/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
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
import { useNavigate } from "@tanstack/react-router";
import { SearchableSelect } from "@/components/miniops/select-search";
import {
  CURRENCIES,
  WORKING_DAYS,
  currencySymbol,
  timezoneOptions,
  type WorkingDays,
} from "@/lib/workspace-options";
import { PageHeader, Status } from "@/components/miniops/core";
import { Section } from "@/components/miniops/forms";
import { UserAvatar } from "@/components/miniops/header";
import { IMAGE_TYPES, readImage, validateImage } from "@/data/ops";
import { cn } from "@/lib/utils";
import { useMiniOps } from "./store";
import { TeamSettingsSummary } from "./team";

/** Crops the chosen photo to a centred square using the zoom level, returns a data URL. */
async function cropSquare(src: string, zoom: number) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const size = 320;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const side = Math.min(img.width, img.height) / zoom;
  c.getContext("2d")!.drawImage(
    img,
    (img.width - side) / 2,
    (img.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  return c.toDataURL("image/jpeg", 0.9);
}

export function Profile() {
  const { profile, updateProfile, authStatus, saveProfile, uploadAvatar, removeAvatar, user } =
    useMiniOps();
  // No password (Google-only sign-in): nothing to manage, so no security panel.
  const showSecurity = user?.has_password !== false;
  const live = authStatus === "signedIn";
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: profile.name,
    title: profile.title,
    email: profile.email,
    phone: profile.phone,
    timezone: profile.timezone,
  });
  useEffect(() => {
    setForm({
      name: profile.name,
      title: profile.title,
      email: profile.email,
      phone: profile.phone,
      timezone: profile.timezone,
    });
  }, [profile.name, profile.title, profile.email, profile.phone, profile.timezone]);
  /** Signed in: persist via the API. Signed out (demo): keep the change in local state. */
  async function run(action: () => Promise<void>, done: string) {
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
  async function pick(file?: File) {
    if (!file) return;
    const err = validateImage(file);
    setError(err);
    if (err) return;
    setZoom(1);
    setPreview(await readImage(file));
  }
  async function savePhoto() {
    if (!preview) return;
    const cropped = await cropSquare(preview, zoom);
    await run(async () => {
      if (live) await uploadAvatar(await (await fetch(cropped)).blob());
      else updateProfile({ avatar: cropped });
      setPreview(null);
    }, "Profile photo updated");
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.includes("@")) {
      toast.error("Enter a name and a valid email.");
      return;
    }
    const { email: _email, ...patch } = form;
    run(async () => {
      if (live) await saveProfile(patch);
      else updateProfile(form);
    }, "Profile saved");
  }
  return (
    <>
      <PageHeader
        title="Profile"
        description={
          showSecurity
            ? "Your personal details, photo and sign-in security."
            : "Your personal details and photo."
        }
      />
      <div className="grid max-w-4xl gap-6">
        <Section
          title="Profile photo"
          subtitle="JPG, PNG or WEBP · up to 5MB. Shown across MiniOps."
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {preview ? (
              <div className="relative size-28 shrink-0 overflow-hidden rounded-full ring-4 ring-primary-soft">
                <img
                  src={preview}
                  alt="New photo preview"
                  className="size-full object-cover"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>
            ) : (
              <UserAvatar
                id={profile.id}
                name={profile.name}
                className="size-28 text-3xl ring-4 ring-primary-soft"
              />
            )}
            <div className="flex-1 space-y-3">
              {preview ? (
                <>
                  <label className="block max-w-xs text-sm">
                    <span className="text-muted-foreground">Zoom</span>
                    <Slider
                      className="mt-2"
                      min={1}
                      max={2.5}
                      step={0.05}
                      value={[zoom]}
                      onValueChange={(v) => setZoom(v[0] ?? 1)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button onClick={savePhoto} disabled={busy}>
                      <Check />
                      Save photo
                    </Button>
                    <Button variant="outline" onClick={() => setPreview(null)}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <Camera />
                    Change photo
                  </Button>
                  {profile.avatar && (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          if (live) await removeAvatar();
                          else updateProfile({ avatar: undefined });
                        }, "Photo removed")
                      }
                    >
                      <Trash2 />
                      Remove photo
                    </Button>
                  )}
                </div>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </Section>
        <Section title="Personal details">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["name", "Full name"],
                ["title", "Job title"],
                ["email", "Email"],
                ["phone", "Phone"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="text-sm">
                <span className="font-medium">{l}</span>
                <Input
                  className="mt-1.5"
                  type={k === "email" ? "email" : "text"}
                  value={form[k]}
                  readOnly={live && k === "email"}
                  title={
                    live && k === "email" ? "Email comes from your sign-in account" : undefined
                  }
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                />
              </label>
            ))}
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Timezone</span>
              <Select
                value={form.timezone}
                onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...new Set([
                      "Asia/Dhaka (UTC+6)",
                      "America/New_York",
                      "Europe/London",
                      "Asia/Singapore",
                      ...(form.timezone ? [form.timezone] : []),
                    ]),
                  ].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="sm:col-span-2">
              <Button disabled={busy}>Save changes</Button>
            </div>
          </form>
        </Section>
        {showSecurity && <SecurityPanel />}
      </div>
    </>
  );
}

function SecurityPanel() {
  const { live, user } = useMiniOps();
  if (!live)
    return (
      <Section title="Password & security" subtitle="Sign in to manage your password.">
        <p className="text-sm text-muted-foreground">You're viewing the demo workspace.</p>
      </Section>
    );
  return (
    <Section
      title={user?.has_password ? "Change password" : "Set a password"}
      subtitle={
        user?.has_password
          ? "You'll stay signed in here; other devices are signed out."
          : "Your account uses Google sign-in. Add a password to log in with your email too."
      }
    >
      <ChangePasswordForm />
    </Section>
  );
}

export const SETTINGS_SECTIONS = [
  "Workspace",
  "Team & Permissions",
  "Billing",
  "Notifications",
  "Preferences",
  "Financial Defaults",
  "Security",
] as const;
export function SettingsPage({ section: initial }: { section?: string | undefined }) {
  const { activeWorkspace, user } = useMiniOps();
  // Security is password management: hide it for accounts without a password (Google-only sign-in).
  const sections = SETTINGS_SECTIONS.filter(
    (x) => x !== "Security" || user?.has_password !== false,
  );
  const [picked, setSection] = useState<string>(initial ?? "Workspace");
  const section = sections.includes(picked as never) ? picked : "Workspace";
  return (
    <>
      <PageHeader
        title="Settings"
        description={`Configure how ${activeWorkspace.name} works in MiniOps.`}
      />
      <div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
        <nav className="flex flex-wrap gap-1 md:flex-col md:flex-nowrap">
          {sections.map((x) => (
            <button
              key={x}
              onClick={() => setSection(x)}
              className={cn(
                "shrink-0 rounded-[10px] px-3 py-2 text-left text-sm transition-colors",
                section === x
                  ? "bg-primary-soft font-semibold text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {x}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          <SettingsBody section={section} />
        </div>
      </div>
    </>
  );
}

function Toggles({ items }: { items: string[] }) {
  return (
    <div className="divide-y">
      {items.map((x) => (
        <label className="flex items-center justify-between gap-4 py-3.5 text-sm" key={x}>
          <b className="font-medium">{x}</b>
          <Switch defaultChecked />
        </label>
      ))}
    </div>
  );
}

function SettingsBody({ section }: { section: string }) {
  const { activeWorkspace, team, live } = useMiniOps();
  if (section === "Billing") return <BillingPanel />;
  if (section === "Security") return <SecurityPanel />;
  // Signed in: the real roster (managed on the Team page). Signed out: the demo list below.
  if (section === "Team & Permissions" && live) return <TeamSettingsSummary />;
  if (section === "Team & Permissions")
    return (
      <Section
        title="Team & permissions"
        subtitle={`${team.length} members in ${activeWorkspace.name}`}
      >
        <div className="divide-y">
          {team.map((m, i) => (
            <div key={m[0]} className="flex items-center gap-3 py-3">
              <UserAvatar id={m[0]} name={m[1]} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{m[1]}</b>
                <small className="text-xs text-muted-foreground">{m[2]}</small>
              </span>
              <Select defaultValue={i < 3 ? "Employer" : "Employee"}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Employer", "Employee"].map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Section>
    );
  if (section === "Notifications")
    return (
      <Section
        title="Notifications"
        subtitle="Choose what you're notified about. Applies to all your workspaces."
      >
        {live ? (
          <NotificationPrefsList className="-my-3.5" />
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to manage your notifications.</p>
        )}
      </Section>
    );
  if (section === "Preferences")
    return (
      <Section title="Preferences">
        <Toggles
          items={["Start week on Monday", "Show weekends in Tasks calendar", "Compact tables"]}
        />
      </Section>
    );
  if (section === "Financial Defaults") return <FinancialDefaults key={activeWorkspace.id} />;
  return (
    <div className="grid gap-6">
      <WorkspaceSettings key={activeWorkspace.id} />
      {activeWorkspace.role === "Employer" && <DeleteWorkspace />}
    </div>
  );
}

/** Name, industry, timezone and working days. Owners and admins edit; everyone else sees them read-only. */
function WorkspaceSettings() {
  const { activeWorkspace: w, updateWorkspace } = useMiniOps();
  const canEdit = w.role === "Employer";
  const [form, setForm] = useState({
    name: w.name,
    industry: w.industry,
    timezone: w.timezone,
    workingDays: w.workingDays,
  });
  const [busy, setBusy] = useState(false);
  const dirty =
    form.name !== w.name ||
    form.industry !== w.industry ||
    form.timezone !== w.timezone ||
    form.workingDays !== w.workingDays;
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Enter a workspace name.");
      return;
    }
    setBusy(true);
    try {
      await updateWorkspace(w.id, {
        ...form,
        name: form.name.trim(),
        industry: form.industry.trim(),
      });
      toast.success("Workspace settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section
      title="Workspace"
      {...(!canEdit && { subtitle: "Only employers can change these settings." })}
    >
      <form onSubmit={save}>
        <fieldset disabled={!canEdit || busy} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Workspace name</span>
            <Input
              className="mt-1.5"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Industry</span>
            <Input
              className="mt-1.5"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            />
          </label>
          <div className="text-sm">
            <span className="font-medium">Timezone</span>
            <SearchableSelect
              className="mt-1.5"
              aria-label="Timezone"
              options={timezoneOptions()}
              value={form.timezone}
              onChange={(v) => v && setForm((f) => ({ ...f, timezone: v }))}
              placeholder="Select a timezone"
              searchPlaceholder="Search city or offset…"
            />
          </div>
          <label className="text-sm">
            <span className="font-medium">Working days</span>
            <Select
              value={form.workingDays}
              onValueChange={(v) => setForm((f) => ({ ...f, workingDays: v as WorkingDays }))}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKING_DAYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </fieldset>
        {canEdit && (
          <Button className="mt-6" disabled={busy || !dirty}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        )}
      </form>
    </Section>
  );
}

/** Currency, rate, hours and margin the workspace's money figures start from. */
function FinancialDefaults() {
  const { activeWorkspace: w, updateWorkspace, can, live } = useMiniOps();
  const canEdit = w.role === "Employer";
  const showRate = !live || can("financials");
  const initial = {
    currency: w.currency,
    rate: w.defaultHourlyRate == null ? "" : String(w.defaultHourlyRate),
    hours: String(w.weeklyHours ?? 40),
    margin: String(w.targetMargin ?? 30),
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some(
    (k) => form[k] !== initial[k],
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    const hours = Number(form.hours),
      margin = Number(form.margin),
      rate = form.rate.trim() === "" ? null : Number(form.rate);
    if (!Number.isInteger(hours) || hours < 0 || hours > 168) {
      toast.error("Working hours must be a whole number from 0 to 168.");
      return;
    }
    if (!Number.isInteger(margin) || margin < 0 || margin > 100) {
      toast.error("Target margin must be a whole number from 0 to 100.");
      return;
    }
    if (rate !== null && (!Number.isFinite(rate) || rate < 0)) {
      toast.error("Enter a valid hourly rate.");
      return;
    }
    setBusy(true);
    try {
      await updateWorkspace(w.id, {
        currency: form.currency,
        weeklyHours: hours,
        targetMargin: margin,
        ...(showRate && { defaultHourlyRate: rate }),
      });
      toast.success("Financial defaults saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section
      title="Financial defaults"
      subtitle={
        canEdit
          ? "Used for time costs and expense summaries."
          : "Only employers can change these settings."
      }
    >
      <form onSubmit={save}>
        <fieldset disabled={!canEdit || busy} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Default currency</span>
            <Select
              value={form.currency}
              onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {showRate && (
            <label className="text-sm">
              <span className="font-medium">Default hourly rate</span>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {currencySymbol(form.currency)}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  placeholder="Not set"
                  className="pl-9"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                />
              </div>
            </label>
          )}
          <label className="text-sm">
            <span className="font-medium">Working hours per week</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={168}
              step={1}
              className="mt-1.5"
              value={form.hours}
              onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Target margin</span>
            <div className="relative mt-1.5">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                className="pr-9"
                value={form.margin}
                onChange={(e) => setForm((f) => ({ ...f, margin: e.target.value }))}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </label>
        </fieldset>
        {canEdit && (
          <Button className="mt-6" disabled={busy || !dirty}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        )}
      </form>
    </Section>
  );
}

/** Employers only. Typing the workspace name confirms, since this wipes all of its data. */
function DeleteWorkspace() {
  const { activeWorkspace, workspaces, live, deleteWorkspace } = useMiniOps();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const name = activeWorkspace.name;
  const lastDemo = !live && workspaces.length < 2;
  async function remove() {
    setBusy(true);
    try {
      await deleteWorkspace(activeWorkspace.id);
      toast.success(`${name} deleted`);
      setOpen(false);
      void navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section
      title="Delete workspace"
      subtitle="Permanently removes this workspace with all its projects, tasks, clients, time, expenses and chat. Members lose access."
      className="ring-1 ring-destructive/20"
    >
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (!busy) {
            setOpen(o);
            setTyped("");
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            disabled={lastDemo}
            title={lastDemo ? "You need at least one workspace." : undefined}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 />
            Delete workspace
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the workspace and everything in it for every member. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="text-sm">
            <span className="font-medium">
              Type <b>{name}</b> to confirm
            </span>
            <Input
              className="mt-1.5"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || typed.trim() !== name}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}

function BillingPanel() {
  const plans = [
    ["Starter", "$19", "Up to 3 team members"],
    ["Growth", "$39", "Up to 10 team members"],
    ["Agency", "$79", "Up to 25 team members"],
  ];
  return (
    <Section
      title="Billing"
      subtitle="Payments are not connected in this demo — no charges are made."
    >
      <div className="mb-5 flex items-center justify-between rounded-xl bg-primary-soft/60 p-4">
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-card text-primary shadow-card">
            <CreditCard className="size-4" />
          </span>
          <span>
            <small className="text-muted-foreground">Current plan</small>
            <b className="block">Growth · Monthly</b>
          </span>
        </span>
        <Status>Active</Status>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p, i) => (
          <div className={cn("rounded-xl border p-5", i === 1 && "border-primary/40")} key={p[0]}>
            <div className="flex justify-between">
              <h3 className="font-semibold">{p[0]}</h3>
              {i === 1 && <Status>Current</Status>}
            </div>
            <p className="mt-4">
              <b className="font-mono text-2xl">{p[1]}</b>
              <span className="text-sm text-muted-foreground">/month</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{p[2]}</p>
            <Button
              variant={i === 1 ? "outline" : "default"}
              size="sm"
              className="mt-5 w-full"
              disabled={i === 1}
              onClick={() => toast.info("Payments are not connected in this demo.")}
            >
              {i === 1 ? "Current plan" : "Switch plan"}
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}
