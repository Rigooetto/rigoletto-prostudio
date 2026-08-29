import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { GoalProgress } from "@/components/dashboard/goal-progress";
import { TodaysSessionsCard } from "@/components/dashboard/todays-sessions-card";
import { OverdueProjectsCard } from "@/components/dashboard/priority-lists";
import { LiveForecastCard } from "@/components/compensation/live-forecast-card";
import {
  getRevenueStats,
  getGoals,
  getActiveProjectCount,
  getOverdueProjects,
  getTodaysSessions,
  getWeekScorecard,
  getUpcomingSessions,
} from "@/lib/queries/dashboard";
import { getLiveCompensationForecast } from "@/lib/queries/compensation";
import { formatCurrency, formatDateTime } from "@/lib/format";

export async function TuriDashboard({ name, employeeId }: { name: string; employeeId: string }) {
  const [revenue, goals, activeProjects, overdueProjects, todaysSessions, week, upcoming, forecast] = await Promise.all([
    getRevenueStats(),
    getGoals(),
    getActiveProjectCount(),
    getOverdueProjects(),
    getTodaysSessions(),
    getWeekScorecard(),
    getUpcomingSessions(14),
    getLiveCompensationForecast(employeeId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Good morning, {name}</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s where the studio stands and what needs your attention.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GoalProgress
          label="Monthly Revenue"
          current={revenue.month}
          goal={goals.monthlyOperating}
          nextGoalLabel="Stretch Goal"
          nextGoal={goals.monthlyStretch}
        />
        <div className="lg:col-span-2">
          {forecast ? (
            <LiveForecastCard forecast={forecast} name={name} />
          ) : (
            <Card className="flex h-full flex-col justify-center">
              <CardHeader>
                <CardTitle className="text-base">Your Compensation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No compensation plan is configured for this account yet — set a weekly base pay in
                  Settings → Users to see your projected pay here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">This Week</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Revenue" value={formatCurrency(week.revenue)} />
          <StatTile label="Billable Hours" value={`${week.billableHours}`} />
          <StatTile label="Sessions" value={String(week.sessionCount)} />
          <StatTile label="Projects Delivered" value={String(week.projectsDelivered)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatTile label="Active Projects" value={String(activeProjects)} sublabel="Studio-wide" />
        <StatTile label="Projects Overdue" value={String(overdueProjects.length)} sublabel="Goal: 2 or fewer" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TodaysSessionsCard sessions={todaysSessions} />
        <OverdueProjectsCard projects={overdueProjects} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next 2 Weeks</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing booked in the next two weeks yet — time to fill the calendar.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((session) => (
                <li key={session.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <span>
                    {session.client.displayName} · {session.service.serviceName}
                  </span>
                  <span className="text-muted-foreground">{formatDateTime(session.startsAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
