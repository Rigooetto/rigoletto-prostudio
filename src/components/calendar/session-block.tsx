"use client";

import { useRouter } from "next/navigation";
import { topPxForDay, heightPx } from "./layout";
import { formatTime } from "@/lib/format";
import type { PlainCalendarSession } from "@/lib/serialize";

export function SessionBlock({
  session,
  dayDate,
  lane,
  laneCount,
}: {
  session: PlainCalendarSession;
  dayDate: Date;
  lane: number;
  laneCount: number;
}) {
  const router = useRouter();
  const top = topPxForDay(session.startsAt, dayDate);
  const height = heightPx(session.startsAt, session.endsAt, dayDate);
  const widthPct = 100 / laneCount;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        router.push(`/sessions/${session.id}`);
      }}
      className="absolute overflow-hidden rounded-md border border-primary/30 bg-primary/15 px-1.5 py-1 text-left text-[0.7rem] leading-tight text-primary hover:bg-primary/25 hover:z-10"
      style={{
        top,
        height,
        left: `${lane * widthPct}%`,
        width: `calc(${widthPct}% - 2px)`,
      }}
      title={`${session.clientDisplayName} · ${session.serviceName} · ${session.studioRoom}`}
    >
      <p className="truncate font-medium">
        {formatTime(session.startsAt)} {session.clientDisplayName}
      </p>
      {height > 32 && <p className="truncate text-primary/80">{session.serviceName}</p>}
      {height > 48 && <p className="truncate text-primary/70">{session.studioRoom}</p>}
    </button>
  );
}
