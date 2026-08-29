import { requireRole } from "@/lib/auth/session";
import { listEmployees } from "@/lib/queries/employees";
import { prisma } from "@/lib/db";
import { EmployeeDialog } from "@/components/settings/employee-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { toPlainEmployee } from "@/lib/serialize";

export default async function UsersSettingsPage() {
  await requireRole("ADMIN");
  const [employees, roles] = await Promise.all([listEmployees(), prisma.role.findMany()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Employee accounts and roles. Admin-only.</p>
        </div>
        <EmployeeDialog roles={roles} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Base Pay (Weekly)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.displayName ?? employee.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                <TableCell className="text-muted-foreground">{employee.role.label}</TableCell>
                <TableCell className="text-right">
                  {employee.basePayWeekly ? formatCurrency(employee.basePayWeekly) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={employee.active ? "default" : "secondary"}>
                    {employee.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <EmployeeDialog employee={toPlainEmployee(employee)} roles={roles} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
