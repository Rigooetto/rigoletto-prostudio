"use client";

import Link from "next/link";
import { sessionOverlapsDay } from "./layout";
import { toDateParam } from "./params";
import { useDayDragReschedule, type UseDayDragReschedule } from "./use-day-drag-reschedule";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlainCalendarSession } from "@/lib/serialize";

function spanColumns(session: PlainCalendarSession, days: Date[], columnOffset: number) {
  const indices = days.reduce<number[]>((acc, day, i) => {
    if (sessionOverlapsDay(session, day)) acc.push(i);
    return acc;
  }, []);
  if (indices.length === 0) return null;
  return { startCol: Math.min(...indices) + 1 + columnOffset, endCol: Math.max(...indices) + 2 + columnOffset, indices };
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
  drag,
}: {
  days: Date[];
  sessions: PlainCalendarSession[];
  columnOffset?: number;
  compact?: boolean;
  gridRow?: number;
  drag?: UseDayDragReschedule;
}) {
  return sessions.map((session) => {
    const cols = spanColumns(session, days, columnOffset);
    if (!cols) return null;
    const isDragging = drag?.preview?.sessionId === session.id;
    const segmentDayCount = cols.endCol - cols.startCol;

    // Same relative-offset grab logic as month-view.tsx's banner — resolve
    // which specific day within this segment the pointer grabbed, so
    // dragging any point on the bar shifts the whole span by the pointer's
    // day delta instead of re-anchoring its start to the drop day.
    function handlePointerDown(event: React.PointerEvent<HTMLAnchorElement>) {
      if (!drag) return;
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const dayWidth = rect.width / segmentDayCount;
      const offsetIndex = Math.min(
        segmentDayCount - 1,
        Math.max(0, Math.floor((event.clientX - rect.left) / dayWidth))
      );
      const grabDay = days[cols!.indices[0] + offsetIndex];
      drag.startDrag(event, session, toDateParam(grabDay));
    }

    function handleClick(event: React.MouseEvent) {
      event.stopPropagation();
      if (drag?.consumeSuppressedClick(session.id)) event.preventDefault();
    }

    const style = {
      gridColumn: `${cols.startCol} / ${cols.endCol}`,
      ...(gridRow ? { gridRow } : {}),
      ...(drag ? { touchAction: "none" as const } : {}),
      ...(isDragging && drag?.preview
        ? { transform: `translate(${drag.preview.pixelDx}px, ${drag.preview.pixelDy}px)` }
        : {}),
    };

    if (compact) {
      return (
        <Link
          key={session.id}
          href={`/sessions/${session.id}`}
          draggable={false}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          style={style}
          className={cn(
            "block truncate rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary hover:bg-primary/25",
            isDragging && "relative z-20 pointer-events-none shadow-lg"
          )}
        >
          {session.clientDisplayName} · {session.serviceName}
        </Link>
      );
    }

    return (
      <Link
        key={session.id}
        href={`/sessions/${session.id}`}
        draggable={false}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        style={style}
        className={cn(
          "block rounded-md border border-primary/30 bg-primary/15 p-2 text-xs text-primary hover:bg-primary/25",
          isDragging && "relative z-20 pointer-events-none shadow-lg"
        )}
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
// it renders its own banner Links directly inside its own day-cell grid
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
  const drag = useDayDragReschedule();
  if (sessions.length === 0) return null;
  const columnOffset = gutterPx > 0 ? 1 : 0;

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: gutterPx > 0 ? `${gutterPx}px repeat(${days.length}, minmax(0, 1fr))` : `repeat(${days.length}, minmax(0, 1fr))`,
      }}
    >
      {/*
        Explicit gridRow:1 on both these markers and the banners below (via
        SpanningSessionBlocks' gridRow prop) is required, not cosmetic: with
        no grid-template-rows defined, "1 / -1" is a meaningless span (there
        are no explicit row lines to span between) and collapses to zero
        height — invisible to elementFromPoint, which is how a drop target
        is resolved during a drag. Pinning both to row 1 also sidesteps a
        second failure mode: a filler with no intrinsic height placed in its
        own auto-row has nothing to stretch to, so it stays zero-height even
        with align-items:stretch. Accepted limitation: two genuinely
        simultaneous multi-day sessions here will overlap instead of
        auto-stacking into separate rows, since they now share one explicit
        row on purpose — an edge case for a single studio, not worth the
        extra complexity of a real lane-assignment pass for this row.
      */}
      {days.map((day, i) => (
        <div
          key={day.toISOString()}
          data-day-cell={toDateParam(day)}
          style={{ gridColumn: i + 1 + columnOffset, gridRow: 1 }}
        />
      ))}
      <SpanningSessionBlocks
        days={days}
        sessions={sessions}
        columnOffset={columnOffset}
        compact={compact}
        drag={drag}
        gridRow={1}
      />
    </div>
  );
}
