"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { rescheduleSession } from "@/lib/actions/sessions";
import { parseDateParam } from "./params";
import { addDays } from "@/lib/dates";
import type { PlainCalendarSession } from "@/lib/serialize";

const DRAG_THRESHOLD_PX = 5;
const MS_PER_DAY = 86400000;

// Every band of a day's column (header, spanning-row filler, pill/banner
// content) carries this attribute set to that day's date param, so a
// pointer over ANY of them during a drag resolves to the right drop target
// regardless of which band it's currently over.
export const DAY_CELL_ATTR = "data-day-cell";

export interface DayDragPreview {
  sessionId: string;
  pixelDx: number;
  pixelDy: number;
  targetDateParam: string | null;
}

interface DragOrigin {
  x: number;
  y: number;
  session: PlainCalendarSession;
  grabDateParam: string;
}

/**
 * Day-granularity drag-to-reschedule, used by both Month view's single-day
 * pills and its multi-day banners, and by the day/week all-day row's
 * multi-day banners. Deliberately simpler than the time-grid's
 * useDragReschedule (no vertical/minute component, hit-tested via
 * elementFromPoint instead of column-width math, since Month's grid wraps
 * into multiple week rows rather than one continuous row of day columns).
 *
 * The move is computed as a RELATIVE day offset (drop day minus grab day),
 * not "snap the session's start to whatever day you dropped on" — that
 * distinction only matters for multi-day sessions: grabbing the middle day
 * of a 3-day bar and dropping it one day over should shift the whole span
 * by one day, not re-anchor its start to the drop day. `startDrag`'s
 * `grabDateParam` is the specific calendar day under the pointer at grab
 * time (for a single-day pill that's just the day it's rendered in; for a
 * multi-day banner segment the caller resolves it from the sub-column the
 * pointer landed on — see the bounding-rect math in month-view.tsx and
 * all-day-row.tsx).
 */
export function useDayDragReschedule() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState<DayDragPreview | null>(null);
  const originRef = useRef<DragOrigin | null>(null);
  const draggingRef = useRef(false);
  const previewRef = useRef<DayDragPreview | null>(null);
  const suppressClickRef = useRef<string | null>(null);

  const commit = useCallback(
    (session: PlainCalendarSession, grabDateParam: string, targetDateParam: string) => {
      const grabDate = parseDateParam(grabDateParam);
      const targetDate = parseDateParam(targetDateParam);
      const dayOffset = Math.round((targetDate.getTime() - grabDate.getTime()) / MS_PER_DAY);
      if (dayOffset === 0) return;

      const newStart = addDays(session.startsAt, dayOffset);
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

      const next: DayDragPreview = { sessionId: origin.session.id, pixelDx: dx, pixelDy: dy, targetDateParam };
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
        if (finalPreview?.targetDateParam) {
          commit(origin.session, origin.grabDateParam, finalPreview.targetDateParam);
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

  function startDrag(event: React.PointerEvent, session: PlainCalendarSession, grabDateParam: string) {
    if (event.button !== 0) return;
    originRef.current = { x: event.clientX, y: event.clientY, session, grabDateParam };
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

export type UseDayDragReschedule = ReturnType<typeof useDayDragReschedule>;
