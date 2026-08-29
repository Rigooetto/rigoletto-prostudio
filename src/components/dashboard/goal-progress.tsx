import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";

export function GoalProgress({
  label,
  current,
  goal,
  nextGoalLabel,
  nextGoal,
}: {
  label: string;
  current: number;
  goal: number;
  nextGoalLabel?: string;
  nextGoal?: number;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const remaining = Math.max(0, goal - current);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold text-muted-foreground">{pct}%</p>
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-card-foreground">
        {formatCurrency(current)}{" "}
        <span className="text-base font-normal text-muted-foreground">/ {formatCurrency(goal)}</span>
      </p>
      <Progress value={pct} className="mt-3 h-2" />
      <p className="mt-2 text-xs text-muted-foreground">
        {remaining > 0
          ? `${formatCurrency(remaining)} more to reach the goal`
          : "Goal reached this month"}
      </p>
      {nextGoalLabel && nextGoal !== undefined && (
        <p className="mt-1 text-xs text-muted-foreground">
          {nextGoalLabel}: {formatCurrency(nextGoal)}
        </p>
      )}
    </div>
  );
}
