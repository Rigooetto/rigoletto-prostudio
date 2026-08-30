"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { rescheduleSession } from "@/lib/actions/sessions";
import { parseDateParam } from "./params";
import type { PlainCalendarSession } from "@/lib/serialize";

const DRAG_THRESHOLD_PX = 5;

// Every band of a day's column (header, spanning-row filler, pill content)
// carries this attribute set to that day's date param, so a pointer over
// ANY of them during a drag — not just the content band the pill started
// in — resolves to the right drop target.
export const DAY_CELL_ATTR = "data-day-cell";

export interface MonthDragPreview {
  sessionId: string;
  pixelDx: number;
  pixelDy: number;
  targetDateParam: string | null;
}

interface DragOrigin {
  x: number;
  y: number;
  session: PlainCalendarSession;
  originDateParam: string;
}

/**
 * Day-granularity drag-to-reschedule for Month view's single-day session
 * pills — dropping a pill on a different day cell moves the session to that
 * date, keeping its original time-of-day and duration. Deliberately simpler
 * than the time-grid's useDragReschedule (no vertical/minute component,
 * hit-tested via elementFromPoint instead of column-width math, since the
 * month grid wraps into multiple week rows rather than one continuous row
 * of day columns). Multi-day spanning banners aren't draggable here —
 * reshaping a multi-day span is a different, more involved gesture.
 */
export function useMonthDragReschedule() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState<MonthDragPreview | null>(null);
  const originRef = useRef<DragOrigin | null>(null);
  const draggingRef = useRef(false);
  const previewRef = useRef<MonthDragPreview | null>(null);
  const suppressClickRef = useRef<string | null>(null);

  const commit = useCallback(
    (session: PlainCalendarSession, targetDateParam: string) => {
      const targetDate = parseDateParam(targetDateParam);
      const newStart = new Date(session.startsAt);
      newStart.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
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

      const el = document.elementFromPoint(event.clientX, event.clientY);
      const cell = el?.closest(`[${DAY_CELL_ATTR}]`);
      const targetDateParam = cell?.getAttribute(DAY_CELL_ATTR) ?? null;

      const next: MonthDragPreview = { sessionId: origin.session.id, pixelDx: dx, pixelDy: dy, targetDateParam };
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
      if (wasDragging) {
        suppressClickRef.current = origin.session.id;
        if (finalPreview?.targetDateParam && finalPreview.targetDateParam !== origin.originDateParam) {
          commit(origin.session, finalPreview.targetDateParam);
        }
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [commit]);

  function startDrag(event: React.PointerEvent, session: PlainCalendarSession, originDateParam: string) {
    if (event.button !== 0) return;
    originRef.current = { x: event.clientX, y: event.clientY, session, originDateParam };
    draggingRef.current = false;
  }

  // Mirrors useDragReschedule's click-suppression: a click firing right
  // after a drag would otherwise navigate to the session's detail page.
  function consumeSuppressedClick(sessionId: string): boolean {
    if (suppressClickRef.current !== sessionId) return false;
    suppressClickRef.current = null;
    return true;
  }

  return { preview, startDrag, consumeSuppressedClick };
}

export type UseMonthDragReschedule = ReturnType<typeof useMonthDragReschedule>;
