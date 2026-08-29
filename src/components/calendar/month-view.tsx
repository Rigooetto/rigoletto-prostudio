"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { sessionOverlapsDay, isMultiDaySession, monthGridRange } from "./layout";
import { SpanningSessionBlocks } from "./all-day-row";
import { toDateParam } from "./params";
import { addDays } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlainCalendarSession } from "@/lib/serialize";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function MonthView({ anchor, sessions }: { anchor: Date; sessions: PlainCalendarSession[] }) {
  const router = useRouter();
  const { gridStart, gridEnd } = monthGridRange(anchor);
  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) days.push(d);
  const weeks = chunkIntoWeeks(days);

  // Multi-day sessions render once per week-row as one connected block
  // spanning every column they touch that week (mirroring the week view's
  // all-day banner), instead of a separate pill duplicated into each day
  // cell. Single-day sessions still list inside each day's own cell.
  const spanning = sessions.filter(isMultiDaySession);
  const timed = sessions.filter((s) => !isMultiDaySession(s));

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week) => {
        const weekSpanning = spanning.filter((s) => week.some((day) => sessionOverlapsDay(s, day)));
        return (
          // One grid per week — the spanning banner (row 1) and the day
          // cells (row 2) are direct children of the SAME grid instance, not
          // two separate grid elements stacked via space-y. That's the only
          // way to guarantee they share identical column tracks: two
          // separately-laid-out grids, even with an identical template and
          // gap, can round fractional column widths a fraction of a pixel
          // differently depending on the browser, which is exactly what
          // caused the banner to drift out of alignment with the cells.
          <div key={week[0].toISOString()} className="grid grid-cols-7 gap-2">
            <SpanningSessionBlocks days={week} sessions={weekSpanning} compact gridRow={1} />
            {week.map((day, i) => {
              const daySessions = timed.filter((s) => sessionOverlapsDay(s, day));
              const inMonth = day.getMonth() === anchor.getMonth();
              const dateParam = toDateParam(day);
              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/calendar?view=day&date=${dateParam}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") router.push(`/calendar?view=day&date=${dateParam}`);
                  }}
                  style={{ gridColumn: i + 1, gridRow: 2 }}
                  className={cn(
                    "min-h-24 cursor-pointer rounded-md border border-border p-2 text-xs transition-colors hover:border-primary/50",
                    inMonth ? "bg-card" : "bg-background/50 text-muted-foreground"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">{day.getDate()}</span>
                    <Link
                      href={`/sessions/new?date=${dateParam}`}
                      onClick={(event) => event.stopPropagation()}
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
                        onClick={(event) => event.stopPropagation()}
                        className="block truncate rounded bg-primary/15 px-1.5 py-0.5 text-primary hover:bg-primary/25"
                      >
                        {formatTime(s.startsAt)} {s.clientDisplayName}
                      </Link>
                    ))}
                    {daySessions.length > 3 && (
                      <Link
                        href={`/calendar?view=day&date=${dateParam}`}
                        onClick={(event) => event.stopPropagation()}
                        className="block text-muted-foreground hover:underline"
                      >
                        +{daySessions.length - 3} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
