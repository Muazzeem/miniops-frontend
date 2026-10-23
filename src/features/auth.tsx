import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MailCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMiniOps } from "@/features/store";
import { GoogleButton } from "@/features/login-dialog";
import { authApi, errorCode, fieldErrors } from "@/lib/api";
import { cn } from "@/lib/utils";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/** Only same-site paths, never another host (mirrors the backend's safe_next). */
export const safeNext = (next?: string) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";

/** Go to `next` (a path that may include a query string). */
function useGo() {
  const router = useRouter();
  return (next?: string) => router.history.push(safeNext(next));
}

// ---- building blocks ---------------------------------------------------------

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 font-semibold">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            M
          </span>
          MiniOps
        </Link>
        <div className="rounded-2xl bg-card p-6 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  action,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  invalid?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        className="pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "danger" | "success";
  children: ReactNode;
}) {
  const Icon = tone === "danger" ? TriangleAlert : tone === "success" ? CheckCircle2 : MailCheck;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-2.5 rounded-xl p-3 text-sm",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "success" && "bg-positive-soft text-positive",
        tone === "info" && "bg-primary-soft text-primary",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

const PASSWORD_HINT = "At least 8 characters; not too common or similar to your name or email.";

function ResendLink({ email, next }: { email: string; next?: string | undefined }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  return (
    <button
      type="button"
      disabled={state !== "idle" || !email}
      className="font-medium underline underline-offset-2 disabled:no-underline disabled:opacity-70"
      onClick={async () => {
        setState("sending");
        try {
          await authApi.resendVerification(email, next);
          setState("sent");
        } catch (e) {
          toast.error(errorText(e));
          setState("idle");
        }
      }}
    >
      {state === "sent"
        ? "Link sent — check your inbox"
        : state === "sending"
          ? "Sending…"
          : "Resend the link"}
    </button>
  );
}

// ---- login -------------------------------------------------------------------

/** Email + password form (plus Google). Used by /login and the login dialog. */
export function LoginForm({ next, onDone }: { next?: string | undefined; onDone?: () => void }) {
  const { signIn } = useMiniOps();
  const go = useGo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; unverified: boolean } | null>(null);
  const done = () => {
    onDone?.();
    go(next);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(email, password);
      toast.success(`Welcome back, ${user.name.split(" ")[0] || user.email}`);
      done();
    } catch (err) {
      setError({ message: errorText(err), unverified: errorCode(err) === "email_not_verified" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <form onSubmit={submit} className="grid gap-4">
        {error && (
          <Notice tone={error.unverified ? "info" : "danger"}>
            {error.message} {error.unverified && <ResendLink email={email} next={next} />}
          </Notice>
        )}
        <Field id="login-email" label="Email">
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field
          id="login-password"
          label="Password"
          action={
            <Link
              to="/forgot-password"
              onClick={onDone}
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" disabled={busy} className="mt-1">
          {busy && <Loader2 className="animate-spin" />}
          Log in
        </Button>
      </form>
      <OrDivider />
      <GoogleButton onDone={done} redirectTo={null} />
    </>
  );
}

export function LoginPage({ next }: { next?: string | undefined }) {
  const { authStatus } = useMiniOps();
  const go = useGo();
  useEffect(() => {
    if (authStatus === "signedIn") go(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);
  return (
    <AuthShell
      title="Log in"
      description="Welcome back. Log in to your MiniOps workspace."
      footer={
        <>
          New to MiniOps?{" "}
          <Link
            to="/register"
            search={next ? { next } : {}}
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}

// ---- register ----------------------------------------------------------------

export function RegisterPage({ next }: { next?: string | undefined }) {
  const { authStatus } = useMiniOps();
  const go = useGo();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  useEffect(() => {
    if (authStatus === "signedIn") go(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setErrors({ confirm: "Passwords don't match." });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        ...(next ? { next } : {}),
      });
      setSentTo(form.email.trim().toLowerCase());
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(Object.keys(fields).length ? fields : { detail: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  if (sentTo)
    return (
      <AuthShell
        title="Check your email"
        description={
          <>
            We sent a confirmation link to <b className="text-foreground">{sentTo}</b>. Open it to
            finish creating your account.
          </>
        }
        footer={
          <>
            Wrong address?{" "}
            <button
              className="font-medium text-primary hover:underline"
              onClick={() => setSentTo(null)}
            >
              Start over
            </button>
          </>
        }
      >
        <Notice>
          Didn’t get it? Check spam, or <ResendLink email={sentTo} next={next} />.
        </Notice>
      </AuthShell>
    );

  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value });
  return (
    <AuthShell
      title="Create your account"
      description="Run your agency’s projects, time and margins in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            search={next ? { next } : {}}
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        {errors["detail"] && <Notice tone="danger">{errors["detail"]}</Notice>}
        <Field id="reg-name" label="Full name" error={errors["name"]}>
          <Input
            id="reg-name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field id="reg-email" label="Work email" error={errors["email"]}>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            required
          />
        </Field>
        <Field id="reg-password" label="Password" error={errors["password"]} hint={PASSWORD_HINT}>
          <PasswordInput
            id="reg-password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            invalid={!!errors["password"]}
          />
        </Field>
        <Field id="reg-confirm" label="Confirm password" error={errors["confirm"]}>
          <PasswordInput
            id="reg-confirm"
            value={form.confirm}
            onChange={set("confirm")}
            autoComplete="new-password"
            invalid={!!errors["confirm"]}
          />
        </Field>
        <Button type="submit" disabled={busy} className="mt-1">
          {busy && <Loader2 className="animate-spin" />}
          Create account
        </Button>
      </form>
      <OrDivider />
      <GoogleButton onDone={() => go(next)} redirectTo={null} />
    </AuthShell>
  );
}

// ---- email confirmation ------------------------------------------------------

export function VerifyEmailPage({
  token,
  next,
}: {
  token?: string | undefined;
  next?: string | undefined;
}) {
  const { completeSignIn } = useMiniOps();
  const go = useGo();
  const [state, setState] = useState<
    | { kind: "verifying" }
    | { kind: "done" }
    | { kind: "already" }
    | { kind: "error"; message: string; expired: boolean }
  >(
    token
      ? { kind: "verifying" }
      : { kind: "error", message: "This link is missing its code.", expired: false },
  );
  const [email, setEmail] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // links are single-use: don't run twice in StrictMode
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (res.already_verified || !res.user) {
          setState({ kind: "already" });
          return;
        }
        completeSignIn(res.user);
        setState({ kind: "done" });
        setTimeout(() => go(next), 1200);
      })
      .catch((e) =>
        setState({ kind: "error", message: errorText(e), expired: errorCode(e) === "expired" }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state.kind === "verifying")
    return (
      <AuthShell title="Confirming your email…">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> One moment.
        </p>
      </AuthShell>
    );
  if (state.kind === "done")
    return (
      <AuthShell title="Email confirmed" description="You’re signed in. Taking you to MiniOps…">
        <Notice tone="success">Your account is ready.</Notice>
      </AuthShell>
    );
  if (state.kind === "already")
    return (
      <AuthShell title="Already confirmed" description="This email address is already confirmed.">
        <Button asChild className="w-full">
          <Link to="/login" search={next ? { next } : {}}>
            Log in
          </Link>
        </Button>
      </AuthShell>
    );
  return (
    <AuthShell title="We couldn’t confirm your email" description={state.message}>
      <div className="grid gap-4">
        <Field id="resend-email" label="Send a new link to">
          <Input
            id="resend-email"
            type="email"
            placeholder="you@agency.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Notice>
          Enter the email you signed up with, then <ResendLink email={email} next={next} />.
        </Notice>
        <Button asChild variant="outline">
          <Link to="/login">Back to log in</Link>
        </Button>
      </div>
    </AuthShell>
  );
}

// ---- forgot / reset password -------------------------------------------------

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we’ll send you a link to choose a new one."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <Notice tone="success">
          If an account uses <b>{email}</b>, a reset link is on its way. It works once and expires
          in 2 hours.
        </Notice>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <Field id="forgot-email" label="Email">
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage({
  uid,
  token,
}: {
  uid?: string | undefined;
  token?: string | undefined;
}) {
  const { completeSignIn } = useMiniOps();
  const go = useGo();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(
    uid && token ? null : "This reset link is incomplete. Request a new one.",
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrors({ confirm: "Passwords don't match." });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const res = await authApi.resetPassword(uid!, token!, password);
      completeSignIn(res.user);
      toast.success("Password updated. You’re signed in.");
      go("/app");
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields["password"]) setErrors(fields);
      else setLinkError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  if (linkError)
    return (
      <AuthShell title="Reset link not valid" description={linkError}>
        <Button asChild className="w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </AuthShell>
    );
  return (
    <AuthShell
      title="Choose a new password"
      description="You’ll be signed out on your other devices."
    >
      <form onSubmit={submit} className="grid gap-4">
        <Field
          id="reset-password"
          label="New password"
          error={errors["password"]}
          hint={PASSWORD_HINT}
        >
          <PasswordInput
            id="reset-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            invalid={!!errors["password"]}
          />
        </Field>
        <Field id="reset-confirm" label="Confirm new password" error={errors["confirm"]}>
          <PasswordInput
            id="reset-confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            invalid={!!errors["confirm"]}
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}

// ---- change password (signed in) ---------------------------------------------

/** For Settings. Google-only accounts set a first password without the current one. */
export function ChangePasswordForm({ className }: { className?: string }) {
  const { user, changePassword } = useMiniOps();
  const hasPassword = user?.has_password ?? true;
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setErrors({ confirm: "Passwords don't match." });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      toast.success(
        hasPassword
          ? "Password updated. Other devices were signed out."
          : "Password set. You can now log in with your email too.",
      );
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(Object.keys(fields).length ? fields : { detail: errorText(err) });
    } finally {
      setBusy(false);
    }
  };
  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value });
  return (
    <form onSubmit={submit} className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {errors["detail"] && (
        <div className="sm:col-span-2">
          <Notice tone="danger">{errors["detail"]}</Notice>
        </div>
      )}
      {hasPassword ? (
        <div className="sm:col-span-2">
          <Field id="cp-current" label="Current password" error={errors["current_password"]}>
            <PasswordInput
              id="cp-current"
              value={form.current}
              onChange={set("current")}
              autoComplete="current-password"
              invalid={!!errors["current_password"]}
            />
          </Field>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          You sign in with Google. Set a password to also log in with your email.
        </p>
      )}
      <Field id="cp-new" label="New password" error={errors["new_password"]} hint={PASSWORD_HINT}>
        <PasswordInput
          id="cp-new"
          value={form.next}
          onChange={set("next")}
          autoComplete="new-password"
          invalid={!!errors["new_password"]}
        />
      </Field>
      <Field id="cp-confirm" label="Confirm new password" error={errors["confirm"]}>
        <PasswordInput
          id="cp-confirm"
          value={form.confirm}
          onChange={set("confirm")}
          autoComplete="new-password"
          invalid={!!errors["confirm"]}
        />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
          {hasPassword ? "Update password" : "Set password"}
        </Button>
      </div>
    </form>
  );
}
