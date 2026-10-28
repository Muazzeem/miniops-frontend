import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  MailPlus,
  RotateCw,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Metric, MobileCard, MobileField, PageHeader, Status } from "@/components/miniops/core";
import { Section } from "@/components/miniops/forms";
import { SearchableSelect } from "@/components/miniops/select-search";
import { formatDisplayDate, toIso } from "@/components/miniops/date-time";
import { money } from "@/data/mock";
import {
  permissionsApi,
  type AccessLevel,
  type PermissionCatalogEntry,
  type PermissionMap,
  type WorkspaceRole,
  WORKSPACE_ROLES,
  ROLE_LABELS,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ErrorState, SignInPrompt } from "./projects";
import { useMiniOps, type Invitation, type Member } from "./store";

const ROLE_INFO: Record<WorkspaceRole, { label: string; summary: string }> = {
  employer: { label: "Employer", summary: "Full access. Manages the team and workspace." },
  project_manager: {
    label: "Project Manager",
    summary: "Runs projects and every task in the projects they manage.",
  },
  employee: { label: "Employee", summary: "Works on tasks and time; access set per person." },
};
const LEVEL_LABEL: Record<AccessLevel, string> = { none: "No access", view: "View", edit: "Edit" };
const FULL_ACCESS: WorkspaceRole[] = ["employer"];

const toRole = (label: string) =>
  WORKSPACE_ROLES.find((r) => ROLE_LABELS[r] === label) ?? (label.toLowerCase() as WorkspaceRole);
const fmtDate = (iso: string) => formatDisplayDate(toIso(new Date(iso)));

function useCatalog() {
  const { live } = useMiniOps();
  return useQuery({
    queryKey: ["permission-catalog"],
    queryFn: permissionsApi.catalog,
    enabled: live,
    staleTime: Infinity,
  });
}

/** The role's default level for every module. */
function defaultsFor(catalog: PermissionCatalogEntry[], role: WorkspaceRole): PermissionMap {
  return Object.fromEntries(catalog.map((m) => [m.key, m.defaults[role]])) as PermissionMap;
}

/** Roles the signed-in user may hand out (mirrors the backend rules). */
function assignableRoles(myRole: WorkspaceRole): WorkspaceRole[] {
  return myRole === "employer" ? WORKSPACE_ROLES : [];
}

function Avatar({
  member,
  className,
}: {
  member: Pick<Member, "name" | "avatarUrl">;
  className?: string;
}) {
  const initials = member.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return member.avatarUrl ? (
    <img
      src={member.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      className={cn("size-9 shrink-0 rounded-full object-cover", className)}
    />
  ) : (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}

function AccessSummary({
  member,
}: {
  member: Pick<Member, "role" | "permissions" | "customized">;
}) {
  if (FULL_ACCESS.includes(toRole(member.role)))
    return <span className="text-sm text-muted-foreground">Full access</span>;
  const edit = Object.entries(member.permissions)
    .filter(([, level]) => level === "edit")
    .map(([key]) => key);
  return (
    <span className="text-sm text-muted-foreground">
      {edit.length ? `Edits ${edit.join(", ")}` : "View only"}
      {member.customized && (
        <span className="ml-2 rounded bg-warning-soft px-1.5 py-0.5 text-xs text-warning">
          Custom
        </span>
      )}
    </span>
  );
}

export function Team() {
  const { members, invitations, teamState, canManageTeam, can, authStatus } = useMiniOps();
  const showMoney = can("financials");
  const capacity = members.reduce((s, m) => s + m.weeklyCapacity, 0);

  const body = () => {
    if (authStatus === "signedOut") return <SignInPrompt what="team" />;
    if (teamState.error)
      return <ErrorState what="the team" message={teamState.error} onRetry={teamState.retry} />;
    if (teamState.loading)
      return (
        <div aria-busy="true" aria-label="Loading team" className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      );
    return (
      <>
        <div className="mb-6 metric-grid">
          <Metric label="Team members" value={String(members.length)} />
          <Metric
            label="Employers"
            value={String(members.filter((m) => FULL_ACCESS.includes(toRole(m.role))).length)}
          />
          <Metric label="Weekly capacity" value={`${capacity}h`} />
          {canManageTeam && (
            <Metric label="Pending invitations" value={String(invitations.length)} />
          )}
        </div>
        <Section title="Members" subtitle="Everyone with access to this workspace.">
          <div className="desktop-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access</TableHead>
                  {showMoney && <TableHead className="text-right">Hourly cost</TableHead>}
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.slug}>
                    <TableCell>
                      <Link
                        to="/team/$memberSlug"
                        params={{ memberSlug: m.slug }}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        <Avatar member={m} />
                        <span className="min-w-0">
                          <b className="block truncate text-sm">
                            {m.name}
                            {m.isMe && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </b>
                          <small className="block truncate text-xs text-muted-foreground">
                            {m.email}
                          </small>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Status>{m.role}</Status>
                    </TableCell>
                    <TableCell>
                      <AccessSummary member={m} />
                    </TableCell>
                    {showMoney && (
                      <TableCell className="num">
                        {m.hourlyCost != null ? `${money(m.hourlyCost)}/hr` : "—"}
                      </TableCell>
                    )}
                    <TableCell className="num">{m.weeklyCapacity}h/wk</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmtDate(m.joinedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mobile-list space-y-3">
            {members.map((member) => (
              <MobileCard key={member.slug}>
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/team/$memberSlug"
                    params={{ memberSlug: member.slug }}
                    className="flex min-w-0 items-center gap-3 hover:text-primary"
                  >
                    <Avatar member={member} />
                    <span className="min-w-0">
                      <b className="block truncate text-sm">
                        {member.name}
                        {member.isMe && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </b>
                      <small className="block truncate text-xs text-muted-foreground">
                        {member.email}
                      </small>
                    </span>
                  </Link>
                  <Status>{member.role}</Status>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  {showMoney && (
                    <MobileField label="Hourly cost">
                      {member.hourlyCost != null ? `${money(member.hourlyCost)}/hr` : "-"}
                    </MobileField>
                  )}
                  <MobileField label="Capacity">{member.weeklyCapacity}h/wk</MobileField>
                  <MobileField label="Joined">{fmtDate(member.joinedAt)}</MobileField>
                </dl>
                <div className="mt-3 text-sm">
                  <AccessSummary member={member} />
                </div>
              </MobileCard>
            ))}
          </div>
        </Section>
        {canManageTeam && (
          <Section
            className="mt-8"
            title="Pending invitations"
            subtitle="Invitations expire after 7 days. Resending sends a fresh link."
          >
            {invitations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No pending invitations.
              </p>
            ) : (
              <InvitationsTable invitations={invitations} />
            )}
          </Section>
        )}
      </>
    );
  };

  return (
    <>
      <PageHeader
        title="Team"
        description="Who's in this workspace, and what each person can see and change."
        action={
          canManageTeam && (
            <InviteDialog>
              <Button>
                <MailPlus /> Invite people
              </Button>
            </InviteDialog>
          )
        }
      />
      {body()}
    </>
  );
}

function InvitationsTable({ invitations }: { invitations: Invitation[] }) {
  const { resendInvitation, cancelInvitation } = useMiniOps();
  const [busy, setBusy] = useState<number | null>(null);

  async function run(id: number, action: () => Promise<unknown>, done: string) {
    setBusy(id);
    try {
      await action();
      toast.success(done);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function resend(inv: Invitation) {
    void run(inv.id, () => resendInvitation(inv.id), `Sent a new link to ${inv.email}`);
  }

  function cancel(inv: Invitation) {
    void run(inv.id, () => cancelInvitation(inv.id), "Invitation cancelled");
  }

  return (
    <>
      <div className="desktop-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited by</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.email}</TableCell>
                <TableCell>
                  <Status>{inv.role}</Status>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {inv.invitedByName || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {inv.sentAt ? fmtDate(inv.sentAt) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {fmtDate(inv.expiresAt)}
                </TableCell>
                <TableCell>
                  <InvitationActions
                    invitation={inv}
                    busy={busy === inv.id}
                    onResend={() => resend(inv)}
                    onCancel={() => cancel(inv)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mobile-list space-y-3">
        {invitations.map((inv) => (
          <MobileCard key={inv.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate font-medium">{inv.email}</p>
              <Status>{inv.role}</Status>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <MobileField label="Invited by">{inv.invitedByName || "-"}</MobileField>
              <MobileField label="Sent">{inv.sentAt ? fmtDate(inv.sentAt) : "-"}</MobileField>
              <MobileField label="Expires">{fmtDate(inv.expiresAt)}</MobileField>
            </dl>
            <div className="mt-3">
              <InvitationActions
                invitation={inv}
                busy={busy === inv.id}
                onResend={() => resend(inv)}
                onCancel={() => cancel(inv)}
              />
            </div>
          </MobileCard>
        ))}
      </div>
    </>
  );
}

function InvitationActions({
  invitation,
  busy,
  onResend,
  onCancel,
}: {
  invitation: Invitation;
  busy: boolean;
  onResend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" disabled={busy} onClick={onResend}>
        <RotateCw /> Resend
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={busy}
          >
            <X /> Cancel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel the invitation to {invitation.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their invite link will stop working. You can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={onCancel}
            >
              Cancel invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy. Select the link and copy it manually.");
  }
}

/** A row per module with a None / View / Edit choice. Read-only for full-access roles. */
function PermissionEditor({
  catalog,
  role,
  value,
  onChange,
  readOnly,
}: {
  catalog: PermissionCatalogEntry[];
  role: WorkspaceRole;
  value: PermissionMap;
  onChange?: (next: PermissionMap) => void;
  readOnly?: boolean;
}) {
  const full = FULL_ACCESS.includes(role);
  const defaults = defaultsFor(catalog, role);
  return (
    <div className="divide-y rounded-xl border">
      {full && (
        <p className="flex items-center gap-2 bg-primary-soft/50 p-3 text-sm">
          <ShieldCheck className="size-4 text-primary" />
          {ROLE_INFO[role].label}s always have full access to everything.
        </p>
      )}
      {catalog.map((m) => {
        const current = full ? m.levels[m.levels.length - 1]! : value[m.key];
        const changed = !full && current !== defaults[m.key];
        return (
          <div
            key={m.key}
            className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <span className="min-w-0">
              <b className="text-sm">{m.label}</b>
              {changed && (
                <span className="ml-2 rounded bg-warning-soft px-1.5 py-0.5 text-xs text-warning">
                  Changed
                </span>
              )}
              <small className="block text-xs text-muted-foreground">{m.description}</small>
            </span>
            <div
              role="radiogroup"
              aria-label={`${m.label} access`}
              className="inline-flex w-fit rounded-lg bg-muted p-0.5"
            >
              {m.levels.map((level) => {
                const active = current === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={readOnly || full}
                    onClick={() => onChange?.({ ...value, [m.key]: level })}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                      active
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground",
                    )}
                  >
                    {LEVEL_LABEL[level]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RolePicker({
  id,
  roles,
  value,
  onChange,
  disabled,
}: {
  id: string;
  roles: WorkspaceRole[];
  value: WorkspaceRole;
  onChange: (role: WorkspaceRole) => void;
  disabled?: boolean;
}) {
  if (disabled)
    return (
      <p id={id} className="text-sm">
        <b>{ROLE_INFO[value].label}</b>
        <span className="block text-xs text-muted-foreground">{ROLE_INFO[value].summary}</span>
      </p>
    );
  return (
    <SearchableSelect
      id={id}
      options={roles.map((r) => ({
        value: r,
        label: ROLE_INFO[r].label,
        hint: ROLE_INFO[r].summary,
      }))}
      value={value}
      onChange={(v) => v && onChange(v as WorkspaceRole)}
    />
  );
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

function InviteDialog({ children }: { children: ReactNode }) {
  const { activeWorkspace, inviteMember } = useMiniOps();
  const { data: catalog } = useCatalog();
  const myRole = toRole(activeWorkspace.role);
  const roles = assignableRoles(myRole);
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("employee");
  const [permissions, setPermissions] = useState<PermissionMap | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ email: string; url?: string; error?: string }[] | null>(null);

  const effective = permissions ?? (catalog ? defaultsFor(catalog, role) : null);

  function reset() {
    setEmails("");
    setRole("employee");
    setPermissions(null);
    setMessage("");
    setError("");
    setSent(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const list = [
      ...new Set(
        emails
          .split(/[\s,;]+/)
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const bad = list.filter((x) => !EMAIL_RE.test(x));
    if (!list.length) return setError("Enter at least one email address.");
    if (bad.length) return setError(`Check ${bad.join(", ")} — that doesn't look like an email.`);
    setSending(true);
    const results = [];
    for (const email of list) {
      try {
        const inv = await inviteMember({
          email,
          role,
          ...(permissions ? { permissions } : {}),
          message: message.trim(),
        });
        results.push({ email, ...(inv.inviteUrl ? { url: inv.inviteUrl } : {}) });
      } catch (err) {
        results.push({ email, error: err instanceof Error ? err.message : "Couldn't invite." });
      }
    }
    setSending(false);
    setSent(results);
    const ok = results.filter((r) => !r.error).length;
    if (ok) toast.success(`Sent ${ok} invitation${ok === 1 ? "" : "s"}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitations</DialogTitle>
              <DialogDescription>
                We emailed each person a link to join {activeWorkspace.name}. They'll sign in with
                the Google account for that address to accept.
              </DialogDescription>
            </DialogHeader>
            <ul className="my-5 divide-y rounded-xl border">
              {sent.map((r) => (
                <li key={r.email} className="grid gap-2 p-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    {r.error ? (
                      <X className="size-4 text-destructive" />
                    ) : (
                      <Check className="size-4 text-positive" />
                    )}
                    {r.email}
                  </span>
                  {r.error ? (
                    <span className="text-xs text-destructive">{r.error}</span>
                  ) : (
                    r.url && (
                      <span className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={r.url}
                          className="h-8 text-xs"
                          aria-label="Invite link"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void copy(r.url!)}
                        >
                          <Copy /> Copy
                        </Button>
                      </span>
                    )
                  )}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Invite more
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>Invite people to {activeWorkspace.name}</DialogTitle>
              <DialogDescription>
                They'll get an email with a link to join. Links expire after 7 days.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-5">
              <div>
                <Label htmlFor="invite-emails">
                  Email addresses<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Textarea
                  id="invite-emails"
                  className="mt-1.5"
                  rows={2}
                  value={emails}
                  onChange={(e) => {
                    setEmails(e.target.value);
                    setError("");
                  }}
                  placeholder="maya@studio.com, sam@studio.com"
                  autoFocus
                />
                {error && (
                  <p role="alert" className="mt-1 text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <div className="mt-1.5">
                  <RolePicker
                    id="invite-role"
                    roles={roles}
                    value={role}
                    onChange={(r) => {
                      setRole(r);
                      setPermissions(null); // a new role starts from its own defaults
                    }}
                  />
                </div>
              </div>
              <div>
                <Label>Permissions</Label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Starts from the role's defaults. Adjust anything for this invitation.
                </p>
                {catalog && effective ? (
                  <PermissionEditor
                    catalog={catalog}
                    role={role}
                    value={effective}
                    onChange={setPermissions}
                  />
                ) : (
                  <Skeleton className="h-48 rounded-xl" />
                )}
              </div>
              <div>
                <Label htmlFor="invite-message">Personal message (optional)</Label>
                <Textarea
                  id="invite-message"
                  className="mt-1.5"
                  rows={2}
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Welcome to the team!"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send invitations"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function MemberDetail({ slug }: { slug: string }) {
  const { members, teamState, canManageTeam, activeWorkspace, can, authStatus, saveMember } =
    useMiniOps();
  const { data: catalog } = useCatalog();
  const member = members.find((m) => m.slug === slug);
  const myRole = toRole(activeWorkspace.role);

  if (authStatus === "signedOut") return <SignInPrompt what="team" />;
  if (teamState.error)
    return <ErrorState what="the team" message={teamState.error} onRetry={teamState.retry} />;
  if (teamState.loading)
    return (
      <div aria-busy="true" aria-label="Loading member" className="space-y-6">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  if (!member)
    return (
      <div className="rounded-2xl bg-card p-12 text-center shadow-card">
        <h1 className="font-display text-xl font-semibold">Member not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          They may have left or been removed from this workspace.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/team">Back to team</Link>
        </Button>
      </div>
    );

  const targetRole = toRole(member.role);
  // Same rule as the backend: employers manage everyone but themselves.
  const canManageThis = canManageTeam && !member.isMe;
  const canSeeRate = can("financials") || member.isMe;

  return (
    <>
      <PageHeader
        title={member.name}
        description={`${ROLE_INFO[targetRole].label} · ${member.email}`}
        action={canManageThis && <RemoveMember member={member} />}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-8">
          <Section title="Profile">
            <div className="mb-4 flex items-center gap-3">
              <Avatar member={member} className="size-14 text-base" />
              <span>
                <b className="block">{member.name}</b>
                <small className="text-muted-foreground">{member.title || "No job title"}</small>
              </span>
            </div>
            <dl className="divide-y text-sm">
              {[
                ["Email", member.email],
                ["Joined", fmtDate(member.joinedAt)],
                ["Invited by", member.invitedByName || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <WorkDetails
            member={member}
            editable={canManageTeam}
            showRate={canSeeRate}
            onSave={saveMember}
          />
        </div>
        <Section
          title="Role & permissions"
          subtitle={
            canManageThis
              ? "Choose a role, then adjust any area for this person."
              : member.isMe
                ? "Your access in this workspace. Only an owner or admin can change it."
                : "Only an owner or admin can change this."
          }
        >
          {catalog ? (
            <AccessEditor
              key={`${member.slug}-${member.role}-${JSON.stringify(member.permissions)}`}
              member={member}
              catalog={catalog}
              editable={canManageThis}
              roles={assignableRoles(myRole)}
            />
          ) : (
            <Skeleton className="h-72 rounded-xl" />
          )}
        </Section>
      </div>
    </>
  );
}

function AccessEditor({
  member,
  catalog,
  editable,
  roles,
}: {
  member: Member;
  catalog: PermissionCatalogEntry[];
  editable: boolean;
  roles: WorkspaceRole[];
}) {
  const { saveMember } = useMiniOps();
  const [role, setRole] = useState<WorkspaceRole>(toRole(member.role));
  const [permissions, setPermissions] = useState<PermissionMap>(member.permissions);
  const [saving, setSaving] = useState(false);
  const dirty =
    role !== toRole(member.role) ||
    JSON.stringify(permissions) !== JSON.stringify(member.permissions);

  async function save() {
    setSaving(true);
    try {
      await saveMember(member.slug, {
        ...(role !== toRole(member.role) ? { role } : {}),
        permissions,
      });
      toast.success("Access updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update access.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="member-role">Role</Label>
        <div className="mt-1.5">
          <RolePicker
            id="member-role"
            roles={roles.includes(role) ? roles : [role, ...roles]}
            value={role}
            disabled={!editable}
            onChange={(r) => {
              setRole(r);
              setPermissions(defaultsFor(catalog, r));
            }}
          />
        </div>
      </div>
      <PermissionEditor
        catalog={catalog}
        role={role}
        value={permissions}
        onChange={setPermissions}
        readOnly={!editable}
      />
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save access"}
          </Button>
          {!FULL_ACCESS.includes(role) && (
            <Button
              variant="ghost"
              onClick={() => setPermissions(defaultsFor(catalog, role))}
              disabled={saving}
            >
              Reset to {ROLE_INFO[role].label} defaults
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function WorkDetails({
  member,
  editable,
  showRate,
  onSave,
}: {
  member: Member;
  editable: boolean;
  showRate: boolean;
  onSave: (
    slug: string,
    update: { hourly_cost?: number | null; weekly_capacity?: number },
  ) => Promise<Member>;
}) {
  const [rate, setRate] = useState(member.hourlyCost != null ? String(member.hourlyCost) : "");
  const [capacity, setCapacity] = useState(String(member.weeklyCapacity));
  const [saving, setSaving] = useState(false);
  const capacityNum = Number(capacity);
  const rateNum = rate === "" ? null : Number(rate);
  const invalid =
    !Number.isInteger(capacityNum) ||
    capacityNum < 0 ||
    capacityNum > 168 ||
    (rateNum !== null && (!Number.isFinite(rateNum) || rateNum < 0));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    try {
      await onSave(member.slug, {
        weekly_capacity: capacityNum,
        ...(showRate ? { hourly_cost: rateNum } : {}),
      });
      toast.success("Work details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (!editable)
    return (
      <Section title="Work details">
        <dl className="divide-y text-sm">
          {showRate && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">Hourly cost</dt>
              <dd className="font-medium">
                {member.hourlyCost != null ? `${money(member.hourlyCost)}/hr` : "Not set"}
              </dd>
            </div>
          )}
          <div className="flex justify-between py-2.5">
            <dt className="text-muted-foreground">Weekly capacity</dt>
            <dd className="font-medium">{member.weeklyCapacity} hours</dd>
          </div>
        </dl>
      </Section>
    );

  return (
    <Section title="Work details" subtitle="Used for capacity and cost calculations.">
      <form onSubmit={save} className="grid gap-4" noValidate>
        {showRate && (
          <div>
            <Label htmlFor="member-rate">Hourly cost</Label>
            <Input
              id="member-rate"
              className="mt-1.5"
              type="number"
              min={0}
              step="0.01"
              placeholder="Not set"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
        )}
        <div>
          <Label htmlFor="member-capacity">Weekly capacity (hours)</Label>
          <Input
            id="member-capacity"
            className="mt-1.5"
            type="number"
            min={0}
            max={168}
            step={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        {invalid && (
          <p role="alert" className="text-xs text-destructive">
            Capacity must be 0–168 hours and cost 0 or more.
          </p>
        )}
        <Button type="submit" disabled={saving || invalid} className="w-fit">
          {saving ? "Saving…" : "Save details"}
        </Button>
      </form>
    </Section>
  );
}

function RemoveMember({ member }: { member: Member }) {
  const { removeMember } = useMiniOps();
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setRemoving(true);
    try {
      await removeMember(member.slug);
      toast.success(`${member.name} was removed`);
      navigate({ to: "/team" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove the member.");
      setRemoving(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <UserMinus /> Remove from workspace
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They'll lose access to this workspace immediately. Tasks assigned to them become
            unassigned. You can invite them again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={removing}
            onClick={(e) => {
              e.preventDefault();
              void remove();
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            <Trash2 /> {removing ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Settings → Team & Permissions: a compact roster linking to the Team page. */
export function TeamSettingsSummary() {
  const { members, invitations, canManageTeam } = useMiniOps();
  const sorted = useMemo(
    () =>
      [...members].sort(
        (a, b) => WORKSPACE_ROLES.indexOf(toRole(a.role)) - WORKSPACE_ROLES.indexOf(toRole(b.role)),
      ),
    [members],
  );
  return (
    <Section
      title="Team & permissions"
      subtitle={`${members.length} member${members.length === 1 ? "" : "s"}${
        canManageTeam && invitations.length ? ` · ${invitations.length} pending invitation(s)` : ""
      }`}
      action={
        <Button asChild size="sm" variant="outline">
          <Link to="/team">
            <Users /> Manage team
          </Link>
        </Button>
      }
    >
      <div className="divide-y">
        {sorted.map((m) => (
          <Link
            key={m.slug}
            to="/team/$memberSlug"
            params={{ memberSlug: m.slug }}
            className="flex items-center gap-3 py-3 hover:text-primary"
          >
            <Avatar member={m} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm">{m.name}</b>
              <small className="text-xs text-muted-foreground">{m.email}</small>
            </span>
            <Status>{m.role}</Status>
          </Link>
        ))}
      </div>
    </Section>
  );
}
