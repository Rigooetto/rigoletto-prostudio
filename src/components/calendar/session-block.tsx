"use client";

import { useRouter } from "next/navigation";
import { topPxForDay, heightPx } from "./layout";
import type { UseDragReschedule } from "./use-drag-reschedule";
import { addDays, addMinutes } from "@/lib/dates";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlainCalendarSession } from "@/lib/serialize";

export function SessionBlock({
  session,
  dayDate,
  lane,
  laneCount,
  drag,
}: {
  session: PlainCalendarSession;
  dayDate: Date;
  lane: number;
  laneCount: number;
  drag: UseDragReschedule;
}) {
  const router = useRouter();
  const top = topPxForDay(session.startsAt, dayDate);
  const height = heightPx(session.startsAt, session.endsAt, dayDate);
  const widthPct = 100 / laneCount;

  const isDragging = drag.preview?.sessionId === session.id;
  const previewStart = isDragging
    ? addMinutes(addDays(session.startsAt, drag.preview!.dayOffset), drag.preview!.minuteDelta)
    : null;

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.stopPropagation();
        drag.startDrag(event, session);
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (drag.consumeSuppressedClick(session.id)) return;
        router.push(`/sessions/${session.id}`);
      }}
      className={cn(
        "absolute overflow-hidden rounded-md border border-primary/30 bg-primary/15 px-1.5 py-1 text-left text-[0.7rem] leading-tight text-primary hover:bg-primary/25 hover:z-10",
        isDragging && "z-20 cursor-grabbing shadow-lg"
      )}
      style={{
        top,
        height,
        left: `${lane * widthPct}%`,
        width: `calc(${widthPct}% - 2px)`,
        touchAction: "none",
        transform: isDragging ? `translate(${drag.preview!.pixelDx}px, ${drag.preview!.pixelDy}px)` : undefined,
      }}
      title={`${session.clientDisplayName} · ${session.serviceName} · ${session.studioRoom}`}
    >
      <p className="truncate font-medium">
        {formatTime(previewStart ?? session.startsAt)} {session.clientDisplayName}
      </p>
      {height > 32 && <p className="truncate text-primary/80">{session.serviceName}</p>}
      {height > 48 && <p className="truncate text-primary/70">{session.studioRoom}</p>}
    </button>
  );
}
