"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, addMonths } from "@/lib/dates";
import { toDateParam } from "./params";

export type CalendarView = "day" | "week" | "month";

const VIEWS: CalendarView[] = ["day", "week", "month"];

export function CalendarHeader({ view, anchor, title }: { view: CalendarView; anchor: Date; title: string }) {
  const router = useRouter();

  const stepDays = view === "day" ? 1 : view === "week" ? 7 : 0;
  const prevDate = stepDays > 0 ? addDays(anchor, -stepDays) : addMonths(anchor, -1);
  const nextDate = stepDays > 0 ? addDays(anchor, stepDays) : addMonths(anchor, 1);
  const prevHref = `/calendar?view=${view}&date=${toDateParam(prevDate)}`;
  const nextHref = `/calendar?view=${view}&date=${toDateParam(nextDate)}`;
  const todayHref = `/calendar?view=${view}&date=${toDateParam(new Date())}`;

  // Arrow keys step the period, "t" jumps to today — ignored while typing
  // into any form field elsewhere on the page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowLeft") router.push(prevHref);
      else if (event.key === "ArrowRight") router.push(nextHref);
      else if (event.key.toLowerCase() === "t") router.push(todayHref);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prevHref, nextHref, todayHref, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-border">
          <Button variant="ghost" size="icon" render={<Link href={prevHref} aria-label="Previous" />} nativeButton={false}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" render={<Link href={todayHref} />} nativeButton={false}>
            Today
          </Button>
          <Button variant="ghost" size="icon" render={<Link href={nextHref} aria-label="Next" />} nativeButton={false}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center rounded-md border border-border p-0.5 text-sm">
          {VIEWS.map((v) => (
            <Button
              key={v}
              variant={view === v ? "secondary" : "ghost"}
              size="sm"
              render={<Link href={`/calendar?view=${v}&date=${toDateParam(anchor)}`} />}
              nativeButton={false}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
        <Button
          render={<Link href={`/sessions/new?date=${toDateParam(anchor)}&view=${view}`} />}
          nativeButton={false}
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>
    </div>
  );
}
