import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoginForm } from "@/features/auth";
import { useMiniOps } from "@/features/store";

// Google Identity Services: https://developers.google.com/identity/gsi/web
type GoogleCredential = { credential: string };
type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: GoogleCredential) => void }) => void;
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const clientId = import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined;
const GSI_SRC = "https://accounts.google.com/gsi/client";
let gsiPromise: Promise<void> | undefined;
function loadGsi() {
  return (gsiPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve();
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gsiPromise = undefined;
      reject(new Error("Failed to load Google Sign-In"));
    };
    document.head.appendChild(s);
  }));
}
export function LoginDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Login
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Log in to MiniOps</DialogTitle>
          <DialogDescription>Welcome back. Log in to your workspace.</DialogDescription>
        </DialogHeader>
        {open && <LoginForm onDone={() => setOpen(false)} />}
        <p className="text-center text-sm text-muted-foreground">
          New to MiniOps?{" "}
          <Link
            to="/register"
            onClick={() => setOpen(false)}
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Google Identity Services button that signs in to MiniOps.
 * After sign-in it calls `onDone` and, unless `redirectTo` is null, navigates there. */
export function GoogleButton({
  onDone,
  redirectTo = "/app",
}: {
  onDone: () => void;
  redirectTo?: "/app" | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signInWithGoogle } = useMiniOps();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const redirectRef = useRef(redirectTo);
  redirectRef.current = redirectTo;
  const signInRef = useRef(signInWithGoogle);
  signInRef.current = signInWithGoogle;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    clientId ? null : "Google login is not configured. Set VITE_GOOGLE_CLIENT_ID in .env.",
  );
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          // The backend verifies the Google ID token and returns a MiniOps API token.
          callback: async ({ credential }) => {
            setPending(true);
            try {
              const user = await signInRef.current(credential);
              toast.success(`Signed in as ${user.name || user.email}`);
              doneRef.current();
              if (redirectRef.current) navigate({ to: redirectRef.current });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Google sign-in failed.");
            } finally {
              setPending(false);
            }
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: ref.current.offsetWidth || 320,
        });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  return error ? (
    <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {error}
    </p>
  ) : (
    <div className="relative">
      <div ref={ref} className="flex min-h-11 w-full justify-center" aria-busy={pending} />
      {pending && (
        <p className="absolute inset-0 grid place-items-center rounded-md bg-background/80 text-sm text-muted-foreground">
          Signing in…
        </p>
      )}
    </div>
  );
}
