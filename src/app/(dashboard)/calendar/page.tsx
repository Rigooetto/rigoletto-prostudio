import { getSessionsInRange } from "@/lib/queries/calendar";
import { toPlainCalendarSession } from "@/lib/serialize";
import { CalendarHeader, type CalendarView } from "@/components/calendar/calendar-header";
import { WeekView } from "@/components/calendar/week-view";
import { DayView } from "@/components/calendar/day-view";
import { MonthView, monthGridRange } from "@/components/calendar/month-view";
import { parseDateParam } from "@/components/calendar/params";
import { addDays, startOfWeekFor, endOfWeekFor, startOfDayFor, endOfDayFor } from "@/lib/dates";

function parseView(value: string | string[] | undefined): CalendarView {
  return value === "day" || value === "week" ? value : "month";
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams;
  const view = parseView(params?.view);
  const anchor = parseDateParam(typeof params?.date === "string" ? params.date : undefined);

  if (view === "day") {
    const dayStart = startOfDayFor(anchor);
    const dayEnd = endOfDayFor(anchor);
    const sessions = (await getSessionsInRange(dayStart, dayEnd)).map(toPlainCalendarSession);
    const title = anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    return (
      <div className="space-y-6">
        <CalendarHeader view={view} anchor={anchor} title={title} />
        <DayView day={anchor} sessions={sessions} />
      </div>
    );
  }

  if (view === "week") {
    const weekStart = startOfWeekFor(anchor);
    const weekEnd = endOfWeekFor(anchor);
    const sessions = (await getSessionsInRange(weekStart, weekEnd)).map(toPlainCalendarSession);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const title = `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    return (
      <div className="space-y-6">
        <CalendarHeader view={view} anchor={anchor} title={title} />
        <WeekView days={days} sessions={sessions} />
      </div>
    );
  }

  const { gridStart, gridEnd } = monthGridRange(anchor);
  const sessions = (await getSessionsInRange(gridStart, addDays(gridEnd, 1))).map(toPlainCalendarSession);
  const title = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <CalendarHeader view={view} anchor={anchor} title={title} />
      <MonthView anchor={anchor} sessions={sessions} />
    </div>
  );
}
