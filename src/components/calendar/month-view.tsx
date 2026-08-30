"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { sessionOverlapsDay, isMultiDaySession, monthGridRange } from "./layout";
import { toDateParam } from "./params";
import { useMonthDragReschedule } from "./use-month-drag-reschedule";
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

function spanColumns(session: PlainCalendarSession, week: Date[]) {
  const indices = week.reduce<number[]>((acc, day, i) => {
    if (sessionOverlapsDay(session, day)) acc.push(i);
    return acc;
  }, []);
  if (indices.length === 0) return null;
  return { startCol: Math.min(...indices) + 1, endCol: Math.max(...indices) + 2, indices };
}

export function MonthView({ anchor, sessions }: { anchor: Date; sessions: PlainCalendarSession[] }) {
  const router = useRouter();
  const drag = useMonthDragReschedule();
  const { gridStart, gridEnd } = monthGridRange(anchor);
  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) days.push(d);
  const weeks = chunkIntoWeeks(days);

  const spanning = sessions.filter(isMultiDaySession);
  const timed = sessions.filter((s) => !isMultiDaySession(s));

  function goToDay(dateParam: string) {
    router.push(`/calendar?view=day&date=${dateParam}`);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      {/*
        Each week is one grid with three row bands, matching Google
        Calendar's actual month view: (1) date numbers, (2) one row per
        multi-day session touching this week — sitting right BELOW the date
        numbers, not above them, so it reads as belonging to this week, not
        the previous one — and (3) single-day session pills. All three bands
        share the same seamless background/border-r per column (no grid gap)
        so a day reads as one continuous cell despite being built from
        several grid items stacked in different rows.
      */}
      <div className="overflow-hidden rounded-md border border-border">
        {weeks.map((week, weekIndex) => {
          const weekSpanning = spanning.filter((s) => week.some((day) => sessionOverlapsDay(s, day)));
          const contentRow = 2 + weekSpanning.length;

          return (
            <div
              key={week[0].toISOString()}
              className={cn("grid grid-cols-7", weekIndex > 0 && "border-t border-border")}
            >
              {week.map((day, i) => {
                const inMonth = day.getMonth() === anchor.getMonth();
                const dateParam = toDateParam(day);
                const isDropTarget = drag.preview !== null && drag.preview.targetDateParam === dateParam;
                return (
                  <div
                    key={`hdr-${day.toISOString()}`}
                    role="button"
                    tabIndex={0}
                    data-day-cell={dateParam}
                    onClick={() => goToDay(dateParam)}
                    onKeyDown={(event) => event.key === "Enter" && goToDay(dateParam)}
                    style={{ gridColumn: i + 1, gridRow: 1 }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between px-2 pt-1.5 pb-0.5 text-xs transition-colors hover:bg-accent/50",
                      i < 6 && "border-r border-border",
                      inMonth ? "bg-card" : "bg-background/50 text-muted-foreground",
                      isDropTarget && "bg-accent"
                    )}
                  >
                    <span className="font-medium">{day.getDate()}</span>
                    <Link
                      href={`/sessions/new?date=${dateParam}&view=month`}
                      onClick={(event) => event.stopPropagation()}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      aria-label="New session"
                    >
                      <Plus className="h-3 w-3" />
                    </Link>
                  </div>
                );
              })}

              {weekSpanning.map((session, bannerIndex) => {
                const cols = spanColumns(session, week);
                if (!cols) return null;
                const covered = new Set(cols.indices);
                const row = 2 + bannerIndex;
                return (
                  <Fragment key={session.id}>
                    <Link
                      href={`/sessions/${session.id}`}
                      onClick={(event) => event.stopPropagation()}
                      style={{ gridColumn: `${cols.startCol} / ${cols.endCol}`, gridRow: row }}
                      className="block truncate rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary hover:bg-primary/25"
                    >
                      {session.clientDisplayName} · {session.serviceName}
                    </Link>
                    {week.map((day, i) => {
                      if (covered.has(i)) return null;
                      const inMonth = day.getMonth() === anchor.getMonth();
                      const dateParam = toDateParam(day);
                      const isDropTarget = drag.preview !== null && drag.preview.targetDateParam === dateParam;
                      return (
                        <div
                          key={i}
                          role="button"
                          tabIndex={0}
                          data-day-cell={dateParam}
                          onClick={() => goToDay(dateParam)}
                          onKeyDown={(event) => event.key === "Enter" && goToDay(dateParam)}
                          style={{ gridColumn: i + 1, gridRow: row }}
                          className={cn(
                            "cursor-pointer px-2 transition-colors hover:bg-accent/50",
                            i < 6 && "border-r border-border",
                            inMonth ? "bg-card" : "bg-background/50",
                            isDropTarget && "bg-accent"
                          )}
                        />
                      );
                    })}
                  </Fragment>
                );
              })}

              {week.map((day, i) => {
                const daySessions = timed.filter((s) => sessionOverlapsDay(s, day));
                const inMonth = day.getMonth() === anchor.getMonth();
                const dateParam = toDateParam(day);
                const isDropTarget = drag.preview !== null && drag.preview.targetDateParam === dateParam;
                return (
                  <div
                    key={`content-${day.toISOString()}`}
                    role="button"
                    tabIndex={0}
                    data-day-cell={dateParam}
                    data-day-content={dateParam}
                    onClick={() => goToDay(dateParam)}
                    onKeyDown={(event) => event.key === "Enter" && goToDay(dateParam)}
                    style={{ gridColumn: i + 1, gridRow: contentRow }}
                    className={cn(
                      "min-h-16 cursor-pointer space-y-1 px-2 pb-2 text-xs transition-colors hover:bg-accent/50",
                      i < 6 && "border-r border-border",
                      inMonth ? "bg-card" : "bg-background/50 text-muted-foreground",
                      isDropTarget && "bg-accent"
                    )}
                  >
                    {daySessions.slice(0, 3).map((s) => {
                      const isDragging = drag.preview?.sessionId === s.id;
                      return (
                        <Link
                          key={s.id}
                          href={`/sessions/${s.id}`}
                          draggable={false}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            drag.startDrag(event, s, dateParam);
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (drag.consumeSuppressedClick(s.id)) event.preventDefault();
                          }}
                          className={cn(
                            "block truncate rounded bg-primary/15 px-1.5 py-0.5 text-primary hover:bg-primary/25",
                            isDragging && "relative z-20 pointer-events-none shadow-lg"
                          )}
                          style={{
                            touchAction: "none",
                            transform: isDragging
                              ? `translate(${drag.preview!.pixelDx}px, ${drag.preview!.pixelDy}px)`
                              : undefined,
                          }}
                        >
                          {formatTime(s.startsAt)} {s.clientDisplayName}
                        </Link>
                      );
                    })}
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
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
