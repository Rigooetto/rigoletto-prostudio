import { startOfDayFor, endOfDayFor, isSameDay, addDays, startOfWeekFor, startOfMonthFor, endOfMonthFor } from "@/lib/dates";

// Pure time-grid math — no "use client", no DB access. Kept framework-free
// so the trickiest piece (lane assignment for overlapping sessions) is
// directly unit-testable.

export const PX_PER_MINUTE = 1; // 60px/hour — change this one constant to re-scale the whole grid

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function topPx(date: Date): number {
  return minutesSinceMidnight(date) * PX_PER_MINUTE;
}

// A session starting before the rendered day (a spanning session's later
// day) visually begins at that day's midnight, not its real start time.
export function topPxForDay(start: Date, dayDate: Date): number {
  const dayStart = startOfDayFor(dayDate);
  return topPx(start < dayStart ? dayStart : start);
}

// Clamped to the given day's bounds so a session that spans past midnight
// (into/out of the day being rendered) doesn't overflow the grid.
export function heightPx(start: Date, end: Date, dayDate: Date, minPx = 20): number {
  const dayStart = startOfDayFor(dayDate);
  const dayEnd = endOfDayFor(dayDate);
  const clampedStart = start < dayStart ? dayStart : start;
  const clampedEnd = end > dayEnd ? dayEnd : end;
  return Math.max(((clampedEnd.getTime() - clampedStart.getTime()) / 60000) * PX_PER_MINUTE, minPx);
}

export interface LaneInput {
  id: string;
  startsAt: Date;
  endsAt: Date;
}

export interface LaneResult {
  id: string;
  lane: number;
  laneCount: number;
}

/**
 * Side-by-side layout for sessions that overlap in time (e.g. two different
 * rooms booked at overlapping times) so blocks sit in lanes instead of
 * visually colliding. Touching boundaries (one ends exactly when the next
 * starts) are NOT overlaps, matching normal calendar semantics.
 *
 * Groups events into connected clusters (a chain of mutually-overlapping
 * events), greedily assigns each event the lowest-numbered lane whose
 * previous occupant has already ended, then stamps every event in a cluster
 * with that cluster's total lane count — an event ending before a later
 * cluster starts must get its own (possibly smaller) laneCount, not inherit
 * an earlier cluster's width.
 */
export function assignLanes(events: LaneInput[]): LaneResult[] {
  const sorted = [...events].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime() || b.endsAt.getTime() - a.endsAt.getTime()
  );

  const results: LaneResult[] = [];
  let cluster: { event: LaneInput; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterMaxEnd = -Infinity;

  const flush = () => {
    const laneCount = laneEnds.length;
    for (const { event, lane } of cluster) results.push({ id: event.id, lane, laneCount });
    cluster = [];
    laneEnds = [];
    clusterMaxEnd = -Infinity;
  };

  for (const event of sorted) {
    const start = event.startsAt.getTime();
    if (cluster.length > 0 && start >= clusterMaxEnd) flush();

    let lane = laneEnds.findIndex((end) => end <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(event.endsAt.getTime());
    } else {
      laneEnds[lane] = event.endsAt.getTime();
    }

    cluster.push({ event, lane });
    clusterMaxEnd = Math.max(clusterMaxEnd, event.endsAt.getTime());
  }
  flush();

  return results;
}

// Overlap check, not exact-day-match — a multi-day session must show up on
// every day it touches, not just the day it started.
export function sessionOverlapsDay(session: { startsAt: Date; endsAt: Date }, dayDate: Date): boolean {
  const dayStart = startOfDayFor(dayDate);
  const dayEnd = endOfDayFor(dayDate);
  return session.startsAt <= dayEnd && session.endsAt >= dayStart;
}

// A session that starts and ends on different calendar days renders in the
// all-day banner (spanning every column it touches) instead of as a
// time-positioned block in a single day's hourly column.
export function isMultiDaySession(session: { startsAt: Date; endsAt: Date }): boolean {
  return !isSameDay(session.startsAt, session.endsAt);
}

// The visible month grid pads the month out to full weeks (Monday-start), so
// the caller must fetch sessions across this same range, not just the month
// itself, or the leading/trailing days from adjacent months look empty.
export function monthGridRange(anchor: Date) {
  const monthStart = startOfMonthFor(anchor);
  const monthEnd = endOfMonthFor(anchor);
  const gridStart = startOfWeekFor(monthStart);
  const gridEnd = addDays(startOfWeekFor(monthEnd), 6);
  return { gridStart, gridEnd };
}

export const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${period}`;
}
