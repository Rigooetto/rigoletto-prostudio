import Link from "next/link";
import { sessionOverlapsDay } from "./layout";
import { formatDateTime } from "@/lib/format";
import type { PlainCalendarSession } from "@/lib/serialize";

// Multi-day sessions render as one connected block spanning every column
// they touch, instead of being duplicated into each day's hourly grid.
// `gutterPx` reserves a leading empty column matching TimeGrid's hour-axis
// gutter, so this row's day columns line up with the grid underneath it.
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
      {sessions.map((session) => {
        const indices = days.reduce<number[]>((acc, day, i) => {
          if (sessionOverlapsDay(session, day)) acc.push(i);
          return acc;
        }, []);
        if (indices.length === 0) return null;
        const startCol = Math.min(...indices) + 1 + columnOffset;
        const endCol = Math.max(...indices) + 2 + columnOffset;

        if (compact) {
          return (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              onClick={(event) => event.stopPropagation()}
              style={{ gridColumn: `${startCol} / ${endCol}` }}
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
            style={{ gridColumn: `${startCol} / ${endCol}` }}
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
      })}
    </div>
  );
}
