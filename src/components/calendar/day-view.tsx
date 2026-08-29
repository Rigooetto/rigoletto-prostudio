"use client";

import { isMultiDaySession } from "./layout";
import { AllDayRow } from "./all-day-row";
import { TimeGrid, GUTTER_WIDTH } from "./time-grid";
import type { PlainCalendarSession } from "@/lib/serialize";

export function DayView({ day, sessions }: { day: Date; sessions: PlainCalendarSession[] }) {
  const spanning = sessions.filter(isMultiDaySession);
  const timed = sessions.filter((s) => !isMultiDaySession(s));

  return (
    <div className="space-y-2">
      <AllDayRow days={[day]} sessions={spanning} gutterPx={GUTTER_WIDTH} gapClassName="gap-0" />
      <TimeGrid days={[day]} sessions={timed} />
    </div>
  );
}
