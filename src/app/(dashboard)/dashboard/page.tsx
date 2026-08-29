import { requireEmployee } from "@/lib/auth/session";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { TuriDashboard } from "@/components/dashboard/turi-dashboard";

export default async function DashboardPage() {
  const employee = await requireEmployee();
  const name = employee.displayName ?? employee.fullName;

  if (employee.role.code === "ADMIN") {
    return <OwnerDashboard name={name} />;
  }

  return <TuriDashboard name={name} employeeId={employee.id} />;
}
