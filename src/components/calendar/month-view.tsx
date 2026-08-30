"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { sessionOverlapsDay, isMultiDaySession, monthGridRange } from "./layout";
import { toDateParam } from "./params";
import { useDayDragReschedule } from "./use-day-drag-reschedule";
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
  const drag = useDayDragReschedule();
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
                const row = 2 + bannerIndex;
                const isDragging = drag.preview?.sessionId === session.id;
                const segmentDayCount = cols.endCol - cols.startCol;

                // The grab point is resolved to a specific calendar day
                // within this segment (not just "the session"), so dragging
                // the middle of a 3-day bar shifts the whole span by the
                // pointer's day delta instead of re-anchoring its start to
                // wherever it's dropped — see useDayDragReschedule's docblock.
                function handleBannerPointerDown(event: React.PointerEvent<HTMLAnchorElement>) {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  const dayWidth = rect.width / segmentDayCount;
                  const offsetIndex = Math.min(
                    segmentDayCount - 1,
                    Math.max(0, Math.floor((event.clientX - rect.left) / dayWidth))
                  );
                  const grabDay = week[cols!.indices[0] + offsetIndex];
                  drag.startDrag(event, session, toDateParam(grabDay));
                }

                return (
                  <Fragment key={session.id}>
                    {/*
                      A day-cell hit-test marker for EVERY day in this row —
                      including the ones the banner itself covers — rendered
                      BEFORE the banner so it paints underneath in the normal
                      case. That's essential while dragging: the dragged
                      banner gets pointer-events:none so elementFromPoint can
                      "see through" it, but if the columns it started on had
                      no marker at all (as when only non-covered days got
                      one), dropping it back over its own original span
                      would resolve to nothing and silently no-op the move.
                    */}
                    {week.map((day, i) => {
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
                    <Link
                      href={`/sessions/${session.id}`}
                      draggable={false}
                      onPointerDown={handleBannerPointerDown}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (drag.consumeSuppressedClick(session.id)) event.preventDefault();
                      }}
                      style={{
                        gridColumn: `${cols.startCol} / ${cols.endCol}`,
                        gridRow: row,
                        touchAction: "none",
                        transform: isDragging
                          ? `translate(${drag.preview!.pixelDx}px, ${drag.preview!.pixelDy}px)`
                          : undefined,
                      }}
                      className={cn(
                        "block truncate rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary hover:bg-primary/25",
                        isDragging && "relative z-20 pointer-events-none shadow-lg"
                      )}
                    >
                      {session.clientDisplayName} · {session.serviceName}
                    </Link>
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
