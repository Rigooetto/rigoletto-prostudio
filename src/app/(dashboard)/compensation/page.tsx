import Link from "next/link";
import { requireEmployee } from "@/lib/auth/session";
import { listCompensationPeriods, getLiveCompensationForecast } from "@/lib/queries/compensation";
import { listActiveEmployees } from "@/lib/queries/employees";
import { GeneratePeriodForm } from "@/components/compensation/generate-period-form";
import { PeriodActions } from "@/components/compensation/period-actions";
import { LiveForecastCard } from "@/components/compensation/live-forecast-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { toPlainEmployee } from "@/lib/serialize";

export default async function CompensationPage() {
  const employee = await requireEmployee();
  const isAdmin = employee.role.code === "ADMIN";

  if (!isAdmin) {
    const [periods, forecast] = await Promise.all([
      listCompensationPeriods(),
      getLiveCompensationForecast(employee.id),
    ]);
    const mine = periods.filter((p) => p.employeeId === employee.id);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compensation</h1>
          <p className="text-sm text-muted-foreground">Your pay history and this month&apos;s projection.</p>
        </div>
        {forecast && <LiveForecastCard forecast={forecast} name={employee.displayName ?? employee.fullName} />}
        <PeriodsTable periods={mine} showEmployee={false} />
      </div>
    );
  }

  const [periods, employees] = await Promise.all([listCompensationPeriods(), listActiveEmployees()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compensation</h1>
        <p className="text-sm text-muted-foreground">Generate, review, and approve monthly compensation. Admin-only.</p>
      </div>
      <GeneratePeriodForm employees={employees.map((e) => ({ ...toPlainEmployee(e), role: e.role }))} />
      <PeriodsTable periods={periods} showEmployee />
    </div>
  );
}

function PeriodsTable({
  periods,
  showEmployee,
}: {
  periods: Awaited<ReturnType<typeof listCompensationPeriods>>;
  showEmployee: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {showEmployee && <TableHead>Employee</TableHead>}
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.length === 0 && (
            <TableRow>
              <TableCell colSpan={showEmployee ? 5 : 4} className="py-10 text-center text-sm text-muted-foreground">
                No compensation periods yet.
              </TableCell>
            </TableRow>
          )}
          {periods.map((period) => (
            <TableRow key={period.id}>
              {showEmployee && (
                <TableCell className="font-medium">
                  {period.employee.displayName ?? period.employee.fullName}
                </TableCell>
              )}
              <TableCell>
                <Link href={`/compensation/${period.id}`} className="hover:underline">
                  {formatDate(period.periodStart)}
                </Link>
              </TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(period.total)}</TableCell>
              <TableCell>
                <Badge variant={period.status === "PAID" ? "default" : "outline"}>{period.status}</Badge>
              </TableCell>
              <TableCell>
                <PeriodActions periodId={period.id} status={period.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
