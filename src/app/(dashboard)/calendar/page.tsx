import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getSessionsInRange } from "@/lib/queries/calendar";
import { Button } from "@/components/ui/button";
import {
  addDays,
  addMonths,
  startOfWeekFor,
  startOfMonthFor,
  endOfMonthFor,
  isSameDay,
} from "@/lib/dates";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Session, Client, Service } from "@/generated/prisma/client";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type SessionWithRelations = Session & { client: Client; service: Service };

function parseDateParam(value: string | undefined) {
  if (!value) return new Date();
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Overlap check, not exact-day-match — a multi-day session must show up on
// every day it touches, not just the day it started.
function sessionOverlapsDay(session: SessionWithRelations, day: Date) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);
  return session.startsAt < dayEnd && session.endsAt > dayStart;
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams;
  const view = params?.view === "week" ? "week" : "month";
  const anchor = parseDateParam(typeof params?.date === "string" ? params.date : undefined);

  if (view === "month") {
    const monthStart = startOfMonthFor(anchor);
    const monthEnd = endOfMonthFor(anchor);
    const gridStart = startOfWeekFor(monthStart);
    const gridEnd = addDays(startOfWeekFor(monthEnd), 6);
    const sessions = await getSessionsInRange(gridStart, addDays(gridEnd, 1));

    const days: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) days.push(d);

    const prevMonth = toDateParam(addMonths(anchor, -1));
    const nextMonth = toDateParam(addMonths(anchor, 1));

    return (
      <div className="space-y-6">
        <CalendarHeader
          title={anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          view={view}
          prevHref={`/calendar?view=month&date=${prevMonth}`}
          nextHref={`/calendar?view=month&date=${nextMonth}`}
        />
        <div className="grid grid-cols-7 gap-2">
          {dayLabels.map((label) => (
            <div key={label} className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const daySessions = sessions.filter((s) => sessionOverlapsDay(s, day));
            const inMonth = day.getMonth() === anchor.getMonth();
            const dateParam = toDateParam(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-24 rounded-md border border-border p-2 text-xs",
                  inMonth ? "bg-card" : "bg-background/50 text-muted-foreground"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <Link href={`/calendar?view=week&date=${dateParam}`} className="font-medium hover:underline">
                    {day.getDate()}
                  </Link>
                  <Link
                    href={`/sessions/new?date=${dateParam}`}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    aria-label="New session"
                  >
                    <Plus className="h-3 w-3" />
                  </Link>
                </div>
                <div className="space-y-1">
                  {daySessions.slice(0, 3).map((s) => (
                    <Link
                      key={s.id}
                      href={`/sessions/${s.id}`}
                      className="block truncate rounded bg-primary/15 px-1.5 py-0.5 text-primary hover:bg-primary/25"
                    >
                      {formatTime(s.startsAt)} {s.client.displayName}
                    </Link>
                  ))}
                  {daySessions.length > 3 && (
                    <Link
                      href={`/calendar?view=week&date=${dateParam}`}
                      className="block text-muted-foreground hover:underline"
                    >
                      +{daySessions.length - 3} more
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const weekStart = startOfWeekFor(anchor);
  const weekEnd = addDays(weekStart, 7);
  const sessions = await getSessionsInRange(weekStart, weekEnd);
  const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prevWeek = toDateParam(addDays(anchor, -7));
  const nextWeek = toDateParam(addDays(anchor, 7));

  // A session spans multiple days in this view if it overlaps more than one
  // of the 7 visible day columns — those render as one connected block in a
  // banner row instead of being duplicated into each day's list.
  const spanIndicesById = new Map<string, number[]>();
  for (const s of sessions) {
    const indices = days.reduce<number[]>((acc, day, i) => {
      if (sessionOverlapsDay(s, day)) acc.push(i);
      return acc;
    }, []);
    spanIndicesById.set(s.id, indices);
  }
  const spanningSessions = sessions.filter((s) => (spanIndicesById.get(s.id)?.length ?? 0) > 1);
  const singleDaySessions = sessions.filter((s) => (spanIndicesById.get(s.id)?.length ?? 0) <= 1);

  return (
    <div className="space-y-6">
      <CalendarHeader
        title={`Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
        view={view}
        prevHref={`/calendar?view=week&date=${prevWeek}`}
        nextHref={`/calendar?view=week&date=${nextWeek}`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={cn("rounded-md px-2 py-1 text-xs font-semibold", isToday ? "bg-primary/15 text-primary" : "text-muted-foreground")}
            >
              {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          );
        })}
      </div>

      {spanningSessions.length > 0 && (
        <div className="grid grid-cols-1 gap-1 md:grid-cols-7">
          {spanningSessions.map((s) => {
            const indices = spanIndicesById.get(s.id) ?? [0];
            const startCol = Math.min(...indices) + 1;
            const endCol = Math.max(...indices) + 2;
            return (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                style={{ gridColumn: `${startCol} / ${endCol}` }}
                className="block rounded-md border border-primary/30 bg-primary/15 p-2 text-xs text-primary hover:bg-primary/25"
              >
                <p className="font-medium">
                  {s.client.displayName} · {s.service.serviceName}
                </p>
                <p className="text-primary/80">
                  {formatDateTime(s.startsAt)} → {formatDateTime(s.endsAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        {days.map((day) => {
          const daySessions = singleDaySessions.filter((s) => sessionOverlapsDay(s, day));
          const dateParam = toDateParam(day);
          return (
            <div key={day.toISOString()} className="space-y-2">
              {daySessions.length === 0 && (
                <Link
                  href={`/sessions/new?date=${dateParam}`}
                  className="block rounded-md border border-dashed border-border p-2 text-center text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                >
                  + New Session
                </Link>
              )}
              {daySessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block rounded-md border border-border bg-card p-2 text-xs hover:bg-accent"
                >
                  <p className="font-medium">{formatTime(s.startsAt)}–{formatTime(s.endsAt)}</p>
                  <p className="text-muted-foreground">{s.client.displayName}</p>
                  <p className="text-muted-foreground">{s.service.serviceName} · {formatCurrency(s.amount)}</p>
                </Link>
              ))}
              {daySessions.length > 0 && (
                <Link
                  href={`/sessions/new?date=${dateParam}`}
                  className="block rounded-md border border-dashed border-border p-1.5 text-center text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                >
                  + Add
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarHeader({
  title,
  view,
  prevHref,
  nextHref,
}: {
  title: string;
  view: "week" | "month";
  prevHref: string;
  nextHref: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md border border-border">
          <Button variant="ghost" size="icon" render={<Link href={prevHref} />} nativeButton={false}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" render={<Link href={nextHref} />} nativeButton={false}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center rounded-md border border-border p-0.5 text-sm">
          <Button variant={view === "week" ? "secondary" : "ghost"} size="sm" render={<Link href="/calendar?view=week" />} nativeButton={false}>
            Week
          </Button>
          <Button variant={view === "month" ? "secondary" : "ghost"} size="sm" render={<Link href="/calendar?view=month" />} nativeButton={false}>
            Month
          </Button>
        </div>
        <Button render={<Link href="/sessions/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>
    </div>
  );
}
