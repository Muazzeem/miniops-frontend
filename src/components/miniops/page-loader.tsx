import { useMiniOps } from "@/features/store";

/** Full-page spinner while the session (profile, then workspaces) is loading. */
export function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background" aria-busy="true">
      <span
        className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-label="Loading"
      />
    </div>
  );
}

/** True until we know who's signed in and which workspaces they have. */
export function useSessionLoading() {
  const { authStatus, workspacesLoading } = useMiniOps();
  return authStatus === "loading" || workspacesLoading;
}
