import { requireRole } from "@/lib/auth/session";
import { getFinancialSummary, getOutstandingInvoicesTotal } from "@/lib/queries/finance";
import { getExpenseTotalsByCategory } from "@/lib/queries/expenses";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { startOfMonth } from "@/lib/dates";

export default async function FinancePage() {
  await requireRole("ADMIN");
  const [summary, outstanding, expensesByCategory] = await Promise.all([
    getFinancialSummary(),
    getOutstandingInvoicesTotal(),
    getExpenseTotalsByCategory(startOfMonth()),
  ]);

  const marginPct = summary.monthRevenue > 0 ? Math.round((summary.monthOperatingProfit / summary.monthRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financial Dashboard</h1>
        <p className="text-sm text-muted-foreground">Revenue, expenses, and profitability. Admin-only.</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">This Month</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Revenue" value={formatCurrency(summary.monthRevenue)} />
          <StatTile label="Expenses" value={formatCurrency(summary.monthExpenses)} />
          <StatTile
            label="Operating Profit"
            value={formatCurrency(summary.monthOperatingProfit)}
            sublabel={`${marginPct}% margin`}
          />
          <StatTile label="Outstanding Invoices" value={formatCurrency(outstanding)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Payroll (Expenses)" value={formatCurrency(summary.monthPayroll)} sublabel="This month" />
        <StatTile label="Marketing Spend" value={formatCurrency(summary.monthMarketing)} sublabel="This month" />
        <StatTile label="Revenue YTD" value={formatCurrency(summary.yearRevenue)} />
        <StatTile label="Operating Profit YTD" value={formatCurrency(summary.yearOperatingProfit)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expenses by Category (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          {expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses logged this month.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {expensesByCategory
                .sort((a, b) => b.total - a.total)
                .map((row) => (
                  <li key={row.category} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{row.category}</span>
                    <span className="font-medium">{formatCurrency(row.total)}</span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
