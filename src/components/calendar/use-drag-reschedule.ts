"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { rescheduleSession } from "@/lib/actions/sessions";
import { addDays, addMinutes, snapToInterval } from "@/lib/dates";
import { PX_PER_MINUTE } from "./layout";
import type { PlainCalendarSession } from "@/lib/serialize";

const DRAG_THRESHOLD_PX = 5;
const SNAP_MINUTES = 15;

export interface DragPreview {
  sessionId: string;
  pixelDx: number;
  pixelDy: number;
  dayOffset: number;
  minuteDelta: number;
}

interface DragOrigin {
  x: number;
  y: number;
  session: PlainCalendarSession;
}

/**
 * Pointer-based (not HTML5 Drag-and-Drop, which has poor touch support)
 * drag-to-reschedule for the Calendar's time-grid. One instance is shared by
 * every SessionBlock in a TimeGrid: `gridRef` points at the columns
 * container so a horizontal drag can be read as a day offset in week view
 * (dayCount > 1); day view (dayCount === 1) only ever reports dayOffset 0.
 *
 * Follows this codebase's convention for inline mutations (see
 * track-status-select.tsx): useTransition + a plain server action + a
 * sonner toast, no useOptimistic — the dragged block re-renders locally via
 * `preview` while dragging, then a real `router.refresh()` picks up the
 * committed value.
 */
export function useDragReschedule(gridRef: React.RefObject<HTMLDivElement | null>, dayCount: number) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const originRef = useRef<DragOrigin | null>(null);
  const draggingRef = useRef(false);
  const previewRef = useRef<DragPreview | null>(null);
  const suppressClickRef = useRef<string | null>(null);

  const commit = useCallback(
    (session: PlainCalendarSession, dayOffset: number, minuteDelta: number) => {
      if (dayOffset === 0 && minuteDelta === 0) return;
      const newStart = snapToInterval(addMinutes(addDays(session.startsAt, dayOffset), minuteDelta), SNAP_MINUTES);
      const duration = session.endsAt.getTime() - session.startsAt.getTime();
      const newEnd = new Date(newStart.getTime() + duration);

      startTransition(async () => {
        try {
          const result = await rescheduleSession(session.id, newStart, newEnd);
          if (result.warning) toast.warning(result.warning);
          router.refresh();
        } catch {
          toast.error("Couldn't reschedule session.");
        }
      });
    },
    [router, startTransition]
  );

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const origin = originRef.current;
      if (!origin) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (!draggingRef.current) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
        draggingRef.current = true;
      }
      event.preventDefault();

      const minuteDelta = Math.round(dy / PX_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;
      let dayOffset = 0;
      const grid = gridRef.current;
      if (dayCount > 1 && grid) {
        const columnWidth = grid.getBoundingClientRect().width / dayCount;
        dayOffset = columnWidth > 0 ? Math.round(dx / columnWidth) : 0;
      }

      const next: DragPreview = { sessionId: origin.session.id, pixelDx: dx, pixelDy: dy, dayOffset, minuteDelta };
      previewRef.current = next;
      setPreview(next);
    }

    function onUp() {
      const origin = originRef.current;
      const wasDragging = draggingRef.current;
      const finalPreview = previewRef.current;
      originRef.current = null;
      draggingRef.current = false;
      previewRef.current = null;
      setPreview(null);

      if (!origin) return;
      if (wasDragging && finalPreview) {
        suppressClickRef.current = origin.session.id;
        commit(origin.session, finalPreview.dayOffset, finalPreview.minuteDelta);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [commit, dayCount, gridRef]);

  function startDrag(event: React.PointerEvent, session: PlainCalendarSession) {
    if (event.button !== 0) return;
    originRef.current = { x: event.clientX, y: event.clientY, session };
    draggingRef.current = false;
  }

  // A click firing right after a drag would otherwise navigate to the
  // session's detail page — called from SessionBlock's onClick to swallow
  // exactly that one click, for exactly the session that was just dragged.
  function consumeSuppressedClick(sessionId: string): boolean {
    if (suppressClickRef.current !== sessionId) return false;
    suppressClickRef.current = null;
    return true;
  }

  return { preview, startDrag, consumeSuppressedClick };
}

export type UseDragReschedule = ReturnType<typeof useDragReschedule>;
