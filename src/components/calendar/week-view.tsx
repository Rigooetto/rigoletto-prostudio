"use client";

import Link from "next/link";
import { isMultiDaySession } from "./layout";
import { AllDayRow } from "./all-day-row";
import { TimeGrid, GUTTER_WIDTH } from "./time-grid";
import { toDateParam } from "./params";
import { isSameDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { PlainCalendarSession } from "@/lib/serialize";

export function WeekView({ days, sessions }: { days: Date[]; sessions: PlainCalendarSession[] }) {
  const spanning = sessions.filter(isMultiDaySession);
  const timed = sessions.filter((s) => !isMultiDaySession(s));

  return (
    <div className="space-y-2">
      <div className="grid" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div />
        {days.map((day) => {
          const today = isSameDay(day, new Date());
          return (
            <Link
              key={day.toISOString()}
              href={`/calendar?view=day&date=${toDateParam(day)}`}
              className={cn(
                "rounded-md px-2 py-1 text-center text-xs font-semibold hover:bg-accent",
                today ? "bg-primary/15 text-primary" : "text-muted-foreground"
              )}
            >
              {day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}
            </Link>
          );
        })}
      </div>
      <AllDayRow days={days} sessions={spanning} gutterPx={GUTTER_WIDTH} />
      <TimeGrid days={days} sessions={timed} view="week" />
    </div>
  );
}
