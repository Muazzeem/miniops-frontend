import { Outlet, createFileRoute } from "@tanstack/react-router";
import { EmployeeShell } from "@/features/employee/ui";
export const Route=createFileRoute("/employee")({component:EmployeeLayout});
function EmployeeLayout(){return <EmployeeShell><Outlet/></EmployeeShell>}
