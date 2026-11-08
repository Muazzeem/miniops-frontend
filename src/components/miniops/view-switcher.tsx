import { Link } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMiniOps } from "@/features/store";

export function ViewSwitcher({ currentView }: { currentView: "employer" | "employee" }) {
  const { employeeOnly } = useMiniOps();
  const nextView = currentView === "employer" ? "Employee" : "Employer";
  const destination = currentView === "employer" ? "/employee" : "/app";

  if (employeeOnly) return null;

  return (
    <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg">
      <Link
        to={destination}
        aria-label={`Switch to ${nextView} View`}
        title={`Switch to ${nextView} View`}
      >
        <ArrowLeftRight aria-hidden="true" />
        <span>
          <span className="hidden sm:inline">Switch to </span>
          {nextView}
          <span className="hidden sm:inline"> View</span>
        </span>
      </Link>
    </Button>
  );
}
