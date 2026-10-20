import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PageLoader, useSessionLoading } from "@/components/miniops/page-loader";
import { EmployeeProvider } from "@/features/employee/store";
import { EmployeeShell } from "@/features/employee/ui";
export const Route = createFileRoute("/employee")({ component: EmployeeLayout });
// Load the profile and workspace first, so the shell never shows placeholder data.
function EmployeeLayout() {
  return useSessionLoading() ? (
    <PageLoader />
  ) : (
    <EmployeeProvider>
      <EmployeeShell>
        <Outlet />
      </EmployeeShell>
    </EmployeeProvider>
  );
}
