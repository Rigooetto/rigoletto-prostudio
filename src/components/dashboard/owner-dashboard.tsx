import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { GoalProgress } from "@/components/dashboard/goal-progress";
import { TodaysSessionsCard } from "@/components/dashboard/todays-sessions-card";
import { OverdueProjectsCard, FollowUpClientsCard } from "@/components/dashboard/priority-lists";
import { LiveForecastCard } from "@/components/compensation/live-forecast-card";
import {
  getRevenueStats,
  getGoals,
  getActiveProjectCount,
  getOverdueProjects,
  getTodaysSessions,
  getRecentClientsNeedingFollowUp,
  getWeekScorecard,
} from "@/lib/queries/dashboard";
import { getLiveCompensationForecast } from "@/lib/queries/compensation";
import { getPrimaryStudioManager } from "@/lib/queries/employees";
import { formatCurrency } from "@/lib/format";

export async function OwnerDashboard({ name }: { name: string }) {
  const [revenue, goals, activeProjects, overdueProjects, todaysSessions, followUpClients, studioManager, week] =
    await Promise.all([
      getRevenueStats(),
      getGoals(),
      getActiveProjectCount(),
      getOverdueProjects(),
      getTodaysSessions(),
      getRecentClientsNeedingFollowUp(),
      getPrimaryStudioManager(),
      getWeekScorecard(),
    ]);
  const forecast = studioManager ? await getLiveCompensationForecast(studioManager.id) : null;
  const studioManagerName = studioManager?.displayName ?? studioManager?.fullName ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rigoletto ProStudio</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {name}. Here&apos;s how the studio is doing.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Revenue Today" value={formatCurrency(revenue.today)} />
        <StatTile label="Revenue This Week" value={formatCurrency(revenue.week)} />
        <StatTile label="Revenue This Month" value={formatCurrency(revenue.month)} />
        <StatTile label="Revenue YTD" value={formatCurrency(revenue.ytd)} sublabel={`Annual goal ${formatCurrency(goals.annual)}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GoalProgress
          label="Monthly Goal"
          current={revenue.month}
          goal={goals.monthlyOperating}
          nextGoalLabel="Stretch Goal"
          nextGoal={goals.monthlyStretch}
        />
        <StatTile label="Active Projects" value={String(activeProjects)} sublabel="Not yet delivered" />
        <StatTile
          label="Projects Overdue"
          value={String(overdueProjects.length)}
          sublabel="Past scheduled recording, not started"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TodaysSessionsCard sessions={todaysSessions} />
        <OverdueProjectsCard projects={overdueProjects} />
      </div>

      <FollowUpClientsCard clients={followUpClients} />

      {studioManager && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {studioManagerName} — Pay &amp; Productivity
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {forecast ? (
                <LiveForecastCard forecast={forecast} name={studioManagerName} />
              ) : (
                <Card className="flex h-full flex-col justify-center">
                  <CardHeader>
                    <CardTitle className="text-base">{studioManagerName}&apos;s Compensation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      No compensation plan is configured for this account yet — set a weekly base pay in
                      Settings → Users to see projected pay here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatTile label="Billable Hours" value={`${week.billableHours}`} sublabel="This week" />
              <StatTile label="Sessions" value={String(week.sessionCount)} sublabel="This week" />
              <StatTile
                label="Projects Delivered"
                value={String(week.projectsDelivered)}
                sublabel="This week"
                className="col-span-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
