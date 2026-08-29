import Link from "next/link";
import { sessionOverlapsDay } from "./layout";
import { formatDateTime } from "@/lib/format";
import type { PlainCalendarSession } from "@/lib/serialize";

function spanColumns(session: PlainCalendarSession, days: Date[], columnOffset: number) {
  const indices = days.reduce<number[]>((acc, day, i) => {
    if (sessionOverlapsDay(session, day)) acc.push(i);
    return acc;
  }, []);
  if (indices.length === 0) return null;
  return { startCol: Math.min(...indices) + 1 + columnOffset, endCol: Math.max(...indices) + 2 + columnOffset };
}

/**
 * Just the positioned Link elements for multi-day sessions — no wrapping
 * grid of its own. Meant to be rendered as a direct child of an existing
 * grid (row 1) that also lays out the day cells (row 2), so both share
 * literally the same computed column tracks. Two separate grid elements,
 * even with an identical template/gap, can round fractional column widths
 * slightly differently across browsers/zoom levels — sharing one grid
 * instance is the only way to guarantee pixel-exact alignment.
 */
export function SpanningSessionBlocks({
  days,
  sessions,
  columnOffset = 0,
  compact = false,
  gridRow,
}: {
  days: Date[];
  sessions: PlainCalendarSession[];
  columnOffset?: number;
  compact?: boolean;
  gridRow?: number;
}) {
  return sessions.map((session) => {
    const cols = spanColumns(session, days, columnOffset);
    if (!cols) return null;
    const style = { gridColumn: `${cols.startCol} / ${cols.endCol}`, ...(gridRow ? { gridRow } : {}) };

    if (compact) {
      return (
        <Link
          key={session.id}
          href={`/sessions/${session.id}`}
          onClick={(event) => event.stopPropagation()}
          style={style}
          className="block truncate rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary hover:bg-primary/25"
        >
          {session.clientDisplayName} · {session.serviceName}
        </Link>
      );
    }

    return (
      <Link
        key={session.id}
        href={`/sessions/${session.id}`}
        style={style}
        className="block rounded-md border border-primary/30 bg-primary/15 p-2 text-xs text-primary hover:bg-primary/25"
      >
        <p className="font-medium">
          {session.clientDisplayName} · {session.serviceName}
        </p>
        <p className="text-primary/80">
          {formatDateTime(session.startsAt)} → {formatDateTime(session.endsAt)}
        </p>
      </Link>
    );
  });
}

// Used by week/day view, where the banner genuinely is its own area above a
// separately-scrollable time grid — `gutterPx` reserves a leading empty
// column matching TimeGrid's hour-axis gutter. Month view does NOT use this;
// it renders SpanningSessionBlocks directly inside its own day-cell grid
// instead (see month-view.tsx), specifically to avoid the two-separate-grids
// alignment problem this component still has for its own use case.
export function AllDayRow({
  days,
  sessions,
  gutterPx = 0,
  compact = false,
}: {
  days: Date[];
  sessions: PlainCalendarSession[];
  gutterPx?: number;
  compact?: boolean;
}) {
  if (sessions.length === 0) return null;
  const columnOffset = gutterPx > 0 ? 1 : 0;

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: gutterPx > 0 ? `${gutterPx}px repeat(${days.length}, minmax(0, 1fr))` : `repeat(${days.length}, minmax(0, 1fr))`,
      }}
    >
      <SpanningSessionBlocks days={days} sessions={sessions} columnOffset={columnOffset} compact={compact} />
    </div>
  );
}
