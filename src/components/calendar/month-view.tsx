import Link from "next/link";
import { Plus } from "lucide-react";
import { sessionOverlapsDay } from "./layout";
import { toDateParam } from "./params";
import { addDays, startOfWeekFor, startOfMonthFor, endOfMonthFor } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlainCalendarSession } from "@/lib/serialize";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The visible grid pads the month out to full weeks (Monday-start), so the
// caller must fetch sessions across this same range, not just the month
// itself, or the leading/trailing days from adjacent months look empty.
export function monthGridRange(anchor: Date) {
  const monthStart = startOfMonthFor(anchor);
  const monthEnd = endOfMonthFor(anchor);
  const gridStart = startOfWeekFor(monthStart);
  const gridEnd = addDays(startOfWeekFor(monthEnd), 6);
  return { gridStart, gridEnd };
}

export function MonthView({ anchor, sessions }: { anchor: Date; sessions: PlainCalendarSession[] }) {
  const { gridStart, gridEnd } = monthGridRange(anchor);
  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) days.push(d);

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAY_LABELS.map((label) => (
        <div key={label} className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const daySessions = sessions.filter((s) => sessionOverlapsDay(s, day));
        const inMonth = day.getMonth() === anchor.getMonth();
        const dateParam = toDateParam(day);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "min-h-24 rounded-md border border-border p-2 text-xs",
              inMonth ? "bg-card" : "bg-background/50 text-muted-foreground"
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <Link href={`/calendar?view=day&date=${dateParam}`} className="font-medium hover:underline">
                {day.getDate()}
              </Link>
              <Link
                href={`/sessions/new?date=${dateParam}`}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="New session"
              >
                <Plus className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1">
              {daySessions.slice(0, 3).map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block truncate rounded bg-primary/15 px-1.5 py-0.5 text-primary hover:bg-primary/25"
                >
                  {formatTime(s.startsAt)} {s.clientDisplayName}
                </Link>
              ))}
              {daySessions.length > 3 && (
                <Link href={`/calendar?view=day&date=${dateParam}`} className="block text-muted-foreground hover:underline">
                  +{daySessions.length - 3} more
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
