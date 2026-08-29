import { requireRole } from "@/lib/auth/session";
import { getCurrentMonthCloseStatus, listClosedMonths } from "@/lib/queries/month-end-close";
import { getFinancialSummary } from "@/lib/queries/finance";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloseMonthForm } from "@/components/settings/close-month-form";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function MonthEndClosePage() {
  await requireRole("ADMIN");
  const [status, closedMonths, summary, draftPeriods, unpaidInvoices] = await Promise.all([
    getCurrentMonthCloseStatus(),
    listClosedMonths(),
    getFinancialSummary(),
    prisma.compensationPeriod.count({ where: { status: "DRAFT" } }),
    prisma.invoice.count({ where: { status: { in: ["UNPAID", "PARTIAL"] } } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Month-End Close</h1>
        <p className="text-sm text-muted-foreground">Review the month, then lock it in as reviewed. Admin-only.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Month at a Glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Revenue" value={formatCurrency(summary.monthRevenue)} />
          <Row label="Expenses" value={formatCurrency(summary.monthExpenses)} />
          <Row label="Operating Profit" value={formatCurrency(summary.monthOperatingProfit)} />
          <Row label="Draft Compensation Periods" value={String(draftPeriods)} warn={draftPeriods > 0} />
          <Row label="Unpaid Invoices" value={String(unpaidInvoices)} warn={unpaidInvoices > 0} />
        </CardContent>
      </Card>

      {status ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
          This month was closed {formatDate(status.createdAt)} by{" "}
          {status.closedByEmployee?.displayName ?? status.closedByEmployee?.fullName ?? "an admin"}.
          {status.notes && <p className="mt-1 text-success/80">{status.notes}</p>}
        </div>
      ) : (
        <CloseMonthForm />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Close History</CardTitle>
        </CardHeader>
        <CardContent>
          {closedMonths.length === 0 ? (
            <p className="text-sm text-muted-foreground">No months closed yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {closedMonths.map((c) => (
                <li key={c.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <span>{c.month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  <span className="text-muted-foreground">
                    {c.closedByEmployee?.displayName ?? c.closedByEmployee?.fullName ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={warn ? "font-medium text-warning" : "font-medium"}>{value}</span>
    </div>
  );
}
