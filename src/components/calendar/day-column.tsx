"use client";

import { useRouter } from "next/navigation";
import { HOURS, PX_PER_MINUTE, assignLanes } from "./layout";
import { SessionBlock } from "./session-block";
import { toDateParam } from "./params";
import { isSameDay } from "@/lib/dates";
import type { PlainCalendarSession } from "@/lib/serialize";

export function DayColumn({
  dayDate,
  sessions,
  view,
}: {
  dayDate: Date;
  sessions: PlainCalendarSession[];
  view: "day" | "week";
}) {
  const router = useRouter();
  const lanes = assignLanes(sessions.map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt })));
  const laneById = new Map(lanes.map((l) => [l.id, l]));

  // Clicking empty grid space creates a session pre-filled at that time,
  // snapped to the nearest 15 minutes. Session blocks stop this from firing
  // when the click actually lands on one of them (see SessionBlock). The
  // `view` param round-trips back through the New Session page's cancel
  // link so cancelling returns to this calendar view/date, not /sessions.
  function handleSlotClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const rawMinutes = offsetY / PX_PER_MINUTE;
    const snapped = Math.round(rawMinutes / 15) * 15;
    const minutes = Math.max(0, Math.min(24 * 60 - 15, snapped));
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    router.push(`/sessions/new?date=${toDateParam(dayDate)}&time=${hh}:${mm}&view=${view}`);
  }

  return (
    <div
      className="relative border-l border-border first:border-l-0"
      style={{ height: 24 * 60 * PX_PER_MINUTE }}
      onClick={handleSlotClick}
    >
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-border/60"
          style={{ top: hour * 60 * PX_PER_MINUTE }}
        />
      ))}
      {isSameDay(dayDate, new Date()) && <CurrentTimeLine />}
      {sessions.map((session) => {
        const lane = laneById.get(session.id);
        return (
          <SessionBlock
            key={session.id}
            session={session}
            dayDate={dayDate}
            lane={lane?.lane ?? 0}
            laneCount={lane?.laneCount ?? 1}
          />
        );
      })}
    </div>
  );
}

function CurrentTimeLine() {
  const now = new Date();
  const top = (now.getHours() * 60 + now.getMinutes()) * PX_PER_MINUTE;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top }}>
      <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
      <div className="h-px flex-1 bg-destructive" />
    </div>
  );
}
