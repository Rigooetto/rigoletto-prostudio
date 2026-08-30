"use client";

import { useEffect, useRef } from "react";
import { HOURS, PX_PER_MINUTE, formatHourLabel, sessionOverlapsDay } from "./layout";
import { DayColumn } from "./day-column";
import { useDragReschedule } from "./use-drag-reschedule";
import { isSameDay } from "@/lib/dates";
import type { PlainCalendarSession } from "@/lib/serialize";

export const GUTTER_WIDTH = 56;
const SCROLL_TO_HOUR = 7;

export function TimeGrid({
  days,
  sessions,
  view,
}: {
  days: Date[];
  sessions: PlainCalendarSession[];
  view: "day" | "week";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const drag = useDragReschedule(columnsRef, days.length);

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const anchorHour = days.some((d) => isSameDay(d, now)) ? Math.max(now.getHours() - 1, 0) : SCROLL_TO_HOUR;
    scrollRef.current.scrollTop = anchorHour * 60 * PX_PER_MINUTE;
  }, [days]);

  return (
    <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto rounded-md border border-border">
      <div className="flex" style={{ minHeight: 24 * 60 * PX_PER_MINUTE }}>
        <div className="shrink-0 border-r border-border" style={{ width: GUTTER_WIDTH }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="relative text-right text-[0.65rem] text-muted-foreground"
              style={{ height: 60 * PX_PER_MINUTE }}
            >
              <span className="absolute -top-2 right-1.5">{hour === 0 ? "" : formatHourLabel(hour)}</span>
            </div>
          ))}
        </div>
        <div
          ref={columnsRef}
          className="grid flex-1"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              dayDate={day}
              sessions={sessions.filter((s) => sessionOverlapsDay(s, day))}
              view={view}
              drag={drag}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
