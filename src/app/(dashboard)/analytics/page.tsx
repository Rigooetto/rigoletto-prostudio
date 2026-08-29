import { requireRole } from "@/lib/auth/session";
import { getMonthlySeries } from "@/lib/queries/analytics";
import { getGoals } from "@/lib/queries/dashboard";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueProfitChart, UtilizationChart, CompensationChart } from "@/components/analytics/monthly-charts";
import { formatCurrency } from "@/lib/format";

export default async function AnalyticsPage() {
  await requireRole("ADMIN");
  const [series, goals] = await Promise.all([getMonthlySeries(6), getGoals()]);

  const chartData = series.map((m) => ({
    ...m,
    month: m.month.toLocaleDateString("en-US", { month: "short" }),
  }));

  const thisMonth = series[series.length - 1];
  const lastMonth = series[series.length - 2];
  const prior3 = series.slice(-4, -1);
  const avg3 = prior3.length > 0 ? prior3.reduce((sum, m) => sum + m.revenue, 0) / prior3.length : 0;

  const revenueDelta = lastMonth ? thisMonth.revenue - lastMonth.revenue : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Historical performance, 6-month view. Admin-only.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          label="Revenue This Month"
          value={formatCurrency(thisMonth.revenue)}
          trend={lastMonth ? { direction: revenueDelta >= 0 ? "up" : "down", label: formatCurrency(Math.abs(revenueDelta)) + " vs last month" } : undefined}
        />
        <StatTile label="3-Month Avg Revenue" value={formatCurrency(avg3)} />
        <StatTile label="Revenue vs Goal" value={`${goals.monthlyOperating > 0 ? Math.round((thisMonth.revenue / goals.monthlyOperating) * 100) : 0}%`} sublabel={formatCurrency(goals.monthlyOperating)} />
        <StatTile label="Studio Utilization" value={`${thisMonth.utilizationPct}%`} sublabel={`${thisMonth.billableHours}/${thisMonth.availableHours} hrs`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue, Expenses & Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueProfitChart data={chartData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Studio Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <UtilizationChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compensation Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <CompensationChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Detail</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Month</th>
                <th className="py-2 pr-4 text-right">Revenue</th>
                <th className="py-2 pr-4 text-right">Profit</th>
                <th className="py-2 pr-4 text-right">Utilization</th>
                <th className="py-2 pr-4 text-right">Delivered</th>
                <th className="py-2 pr-4 text-right">Turnaround</th>
                <th className="py-2 pr-4 text-right">Conversion</th>
                <th className="py-2 text-right">Marketing Spend</th>
              </tr>
            </thead>
            <tbody>
              {series.map((m) => (
                <tr key={m.month.toISOString()} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4">{m.month.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(m.revenue)}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(m.profit)}</td>
                  <td className="py-2 pr-4 text-right">{m.utilizationPct}%</td>
                  <td className="py-2 pr-4 text-right">{m.projectsDelivered}</td>
                  <td className="py-2 pr-4 text-right">{m.avgTurnaroundDays ?? "—"} days</td>
                  <td className="py-2 pr-4 text-right">{m.conversionRatePct}%</td>
                  <td className="py-2 text-right">{formatCurrency(m.marketingSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
