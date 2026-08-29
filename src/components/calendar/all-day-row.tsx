import Link from "next/link";
import { sessionOverlapsDay } from "./layout";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlainCalendarSession } from "@/lib/serialize";

// Multi-day sessions render as one connected block spanning every column
// they touch, instead of being duplicated into each day's hourly grid.
// `gutterPx` reserves a leading empty column matching TimeGrid's hour-axis
// gutter, so this row's day columns line up with the grid underneath it.
//
// `gapClassName` MUST match the `gap-*` class of whatever sibling grid this
// row is meant to align with (the day cells below it, in month view; the
// header row and hour grid, in week/day view) — two same-template grids
// with different gap values end up with subtly different column widths,
// which compounds across 7 columns into a visibly misaligned bar.
export function AllDayRow({
  days,
  sessions,
  gutterPx = 0,
  compact = false,
  gapClassName = "gap-1",
}: {
  days: Date[];
  sessions: PlainCalendarSession[];
  gutterPx?: number;
  compact?: boolean;
  gapClassName?: string;
}) {
  if (sessions.length === 0) return null;
  const columnOffset = gutterPx > 0 ? 1 : 0;

  return (
    <div
      className={cn("grid", gapClassName)}
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
