import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, MailX, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDate, toIso } from "@/components/miniops/date-time";
import { ApiError, inviteLinkApi, type PublicInvitation } from "@/lib/api";
import { GoogleButton } from "./login-dialog";
import { useMiniOps } from "./store";

const ROLE_LABEL = { employer: "Employer", employee: "Employee" };

/** /invite/<token>: the link from the invitation email. */
export function InvitePage({ token }: { token: string }) {
  const query = useQuery({
    queryKey: ["invite-link", token],
    queryFn: () => inviteLinkApi.get(token),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:grid sm:place-items-center">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <img src="/miniops-logo.png" alt="MiniOps" className="h-9 w-auto" />
        </div>
        <section className="rounded-[20px] bg-card p-6 shadow-card sm:p-8">
          {query.isPending ? (
            <div aria-busy="true" aria-label="Loading invitation" className="space-y-4">
              <Skeleton className="mx-auto size-12 rounded-full" />
              <Skeleton className="h-7 w-3/4 mx-auto rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : query.error ? (
            query.error instanceof ApiError && query.error.status === 404 ? (
              <Message
                icon={<MailX />}
                title="This invitation link isn't valid"
                text="It may have been replaced by a newer link. Check your latest invitation email, or ask for a new invitation."
              />
            ) : (
              <Message
                icon={<AlertTriangle />}
                title="Couldn't load the invitation"
                text={query.error.message}
              >
                <Button variant="outline" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              </Message>
            )
          ) : (
            <InvitationCard token={token} invitation={query.data} />
          )}
        </section>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          MiniOps · Know exactly where your agency makes money.
        </p>
      </div>
    </main>
  );
}

function InvitationCard({ token, invitation }: { token: string; invitation: PublicInvitation }) {
  const { authStatus, user, signOut, acceptInvitation } = useMiniOps();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const role = ROLE_LABEL[invitation.role];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["invite-link", token] });

  if (invitation.status === "accepted")
    return (
      <Message
        icon={<CheckCircle2 />}
        title="Invitation accepted"
        text={`This invitation to ${invitation.workspace} has already been accepted.`}
      >
        <Button asChild>
          <Link to="/app">Open MiniOps</Link>
        </Button>
      </Message>
    );
  if (invitation.status === "declined")
    return (
      <Message
        icon={<XCircle />}
        title="Invitation declined"
        text={`The invitation to join ${invitation.workspace} was declined. Ask ${invitation.invited_by_name || "the workspace owner"} if you'd like a new one.`}
      />
    );
  if (invitation.status === "cancelled")
    return (
      <Message
        icon={<XCircle />}
        title="This invitation is no longer available"
        text={`${invitation.workspace} cancelled this invitation.`}
      />
    );
  if (invitation.status === "expired")
    return (
      <Message
        icon={<Clock3 />}
        title="This invitation has expired"
        text={`Ask ${invitation.invited_by_name || "your contact"} at ${invitation.workspace} to send a new one.`}
      />
    );

  // Pending: confirm the email by signing in with that Google account.
  const emailMatches =
    authStatus === "signedIn" && user?.email.toLowerCase() === invitation.email.toLowerCase();

  async function accept() {
    setBusy("accept");
    try {
      const workspace = await acceptInvitation(token);
      toast.success(`Welcome to ${workspace.name}!`);
      navigate({ to: "/app" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't accept the invitation.");
      void refresh();
      setBusy(null);
    }
  }

  async function decline() {
    setBusy("decline");
    try {
      await inviteLinkApi.decline(token);
      toast.success("Invitation declined");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't decline the invitation.");
    } finally {
      void refresh();
      setBusy(null);
      setConfirmDecline(false);
    }
  }

  if (confirmDecline)
    return (
      <Message
        icon={<XCircle />}
        title="Decline this invitation?"
        text={`You won't join ${invitation.workspace}. This doesn't affect any other workspace.`}
      >
        <Button variant="outline" onClick={() => setConfirmDecline(false)} disabled={!!busy}>
          Go back
        </Button>
        <Button variant="destructive" onClick={() => void decline()} disabled={!!busy}>
          {busy === "decline" ? "Declining…" : "Decline invitation"}
        </Button>
      </Message>
    );

  return (
    <>
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
        <UserRound />
      </span>
      <div className="mt-5 text-center">
        <h1 className="text-xl font-semibold">You're invited to join {invitation.workspace}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {invitation.invited_by_name || "Someone"} invited <b>{invitation.email}</b> to the{" "}
          {invitation.workspace} workspace on MiniOps.
        </p>
      </div>
      {invitation.message && (
        <blockquote className="mt-5 whitespace-pre-line rounded-lg border-l-4 border-primary/50 bg-muted/60 p-3 text-sm">
          {invitation.message}
        </blockquote>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Role</dt>
          <dd className="font-semibold">{role}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Link expires</dt>
          <dd className="font-semibold">
            {formatDisplayDate(toIso(new Date(invitation.expires_at)))}
          </dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-3">
        {authStatus === "loading" ? (
          <Skeleton className="h-10 rounded-lg" />
        ) : authStatus === "signedOut" ? (
          <>
            <p className="text-center text-sm text-muted-foreground">
              Log in or create an account with <b>{invitation.email}</b> to accept.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild>
                <Link to="/register" search={{ next: `/invite/${token}` }}>
                  Create account
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/login" search={{ next: `/invite/${token}` }}>
                  Log in
                </Link>
              </Button>
            </div>
            <GoogleButton onDone={() => {}} redirectTo={null} />
          </>
        ) : emailMatches ? (
          <>
            <p className="text-center text-xs text-muted-foreground">Signed in as {user?.email}</p>
            <Button onClick={() => void accept()} disabled={!!busy}>
              {busy === "accept" ? "Joining…" : `Accept and join ${invitation.workspace}`}
            </Button>
          </>
        ) : (
          <div
            role="alert"
            className="rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm"
          >
            <p>
              This invitation is for <b>{invitation.email}</b>, but you're signed in as{" "}
              <b>{user?.email}</b>.
            </p>
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={() => void signOut().catch(() => {})}
            >
              Sign out and use {invitation.email}
            </Button>
          </div>
        )}
        <Button variant="ghost" onClick={() => setConfirmDecline(true)} disabled={!!busy}>
          Decline
        </Button>
      </div>
    </>
  );
}

function Message({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="py-4 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <h1 className="mt-5 text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
      {children && <div className="mt-6 flex justify-center gap-2">{children}</div>}
    </div>
  );
}
