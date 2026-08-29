import { isSameDay } from "@/lib/dates";

/**
 * A session's real duration is only meaningful when it starts and ends on the
 * same calendar day. Multi-day bookings (Session has one startsAt/endsAt pair
 * spanning several days) don't record actual daily working windows, so raw
 * wall-clock time double-counts nights. For those, count a fixed studio-day
 * block for each calendar day touched within [windowStart, windowEnd] instead.
 */
export function sessionBillableHours(
  session: { startsAt: Date; endsAt: Date },
  dailyStudioHours: number,
  windowStart?: Date,
  windowEnd?: Date
) {
  const clampedStart = windowStart && session.startsAt < windowStart ? windowStart : session.startsAt;
  const clampedEnd = windowEnd && session.endsAt > windowEnd ? windowEnd : session.endsAt;
  if (clampedEnd <= clampedStart) return 0;

  if (isSameDay(session.startsAt, session.endsAt)) {
    return (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60);
  }

  const startDay = new Date(clampedStart.getFullYear(), clampedStart.getMonth(), clampedStart.getDate());
  const endDay = new Date(clampedEnd.getFullYear(), clampedEnd.getMonth(), clampedEnd.getDate());
  const daysTouched = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return daysTouched * dailyStudioHours;
}

export function calculateBillableHours(
  sessions: Array<{ startsAt: Date; endsAt: Date }>,
  dailyStudioHours: number,
  windowStart?: Date,
  windowEnd?: Date
) {
  return sessions.reduce((sum, s) => sum + sessionBillableHours(s, dailyStudioHours, windowStart, windowEnd), 0);
}
