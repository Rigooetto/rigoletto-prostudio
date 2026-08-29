import { describe, it, expect } from "vitest";
import { assignLanes, topPx, topPxForDay, heightPx, formatHourLabel, sessionOverlapsDay, isMultiDaySession } from "@/components/calendar/layout";

function d(hour: number, minute = 0) {
  return new Date(2026, 7, 20, hour, minute, 0, 0);
}

describe("topPx / heightPx", () => {
  it("positions by minutes since midnight", () => {
    expect(topPx(d(9, 30))).toBe(9 * 60 + 30);
  });

  it("sizes by duration in minutes", () => {
    expect(heightPx(d(9), d(10, 30), d(0))).toBe(90);
  });

  it("enforces a minimum height for very short sessions", () => {
    expect(heightPx(d(9), d(9, 5), d(0), 20)).toBe(20);
  });

  it("topPxForDay clamps a session that started the previous day to this day's midnight", () => {
    const start = new Date(2026, 7, 19, 23, 0);
    expect(topPxForDay(start, d(0))).toBe(0);
  });

  it("topPxForDay uses the real start time when the session starts on this day", () => {
    expect(topPxForDay(d(9, 30), d(0))).toBe(9 * 60 + 30);
  });

  it("clamps to the given day's bounds for a session crossing midnight", () => {
    const start = new Date(2026, 7, 19, 23, 0);
    const end = new Date(2026, 7, 20, 2, 0);
    // Rendered in the Aug 20 column: clamped from midnight to 2am = 120min.
    expect(heightPx(start, end, d(0))).toBe(120);
  });
});

describe("assignLanes", () => {
  it("gives non-overlapping events lane 0 and laneCount 1", () => {
    const result = assignLanes([
      { id: "a", startsAt: d(9), endsAt: d(10) },
      { id: "b", startsAt: d(10), endsAt: d(11) },
    ]);
    expect(result).toEqual(
      expect.arrayContaining([
        { id: "a", lane: 0, laneCount: 1 },
        { id: "b", lane: 0, laneCount: 1 },
      ])
    );
  });

  it("puts two overlapping events in separate lanes with laneCount 2", () => {
    const result = assignLanes([
      { id: "a", startsAt: d(9), endsAt: d(10) },
      { id: "b", startsAt: d(9, 30), endsAt: d(10, 30) },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a.laneCount).toBe(2);
    expect(byId.b.laneCount).toBe(2);
    expect(byId.a.lane).not.toBe(byId.b.lane);
  });

  it("does not treat a touching boundary as an overlap", () => {
    const result = assignLanes([
      { id: "a", startsAt: d(9), endsAt: d(10) },
      { id: "b", startsAt: d(10), endsAt: d(11) },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a.lane).toBe(0);
    expect(byId.b.lane).toBe(0);
    expect(byId.a.laneCount).toBe(1);
    expect(byId.b.laneCount).toBe(1);
  });

  it("reuses a freed lane within a staggered chain (2 lanes, not 3)", () => {
    // A: 9-11, B: 10-12, C: 11:30-12:30 — A ends before C starts, so C can
    // reuse A's lane instead of needing a third.
    const result = assignLanes([
      { id: "a", startsAt: d(9), endsAt: d(11) },
      { id: "b", startsAt: d(10), endsAt: d(12) },
      { id: "c", startsAt: d(11, 30), endsAt: d(12, 30) },
    ]);
    const laneCounts = new Set(result.map((r) => r.laneCount));
    expect(laneCounts).toEqual(new Set([2]));
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a.lane).toBe(byId.c.lane);
    expect(byId.b.lane).not.toBe(byId.c.lane);
  });

  it("gives an event in a later, unrelated cluster its own laneCount", () => {
    const result = assignLanes([
      { id: "a", startsAt: d(9), endsAt: d(10) },
      { id: "b", startsAt: d(9, 30), endsAt: d(10, 30) },
      { id: "c", startsAt: d(14), endsAt: d(15) },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a.laneCount).toBe(2);
    expect(byId.b.laneCount).toBe(2);
    expect(byId.c.laneCount).toBe(1);
  });
});

describe("sessionOverlapsDay", () => {
  it("matches a single-day session against its own day", () => {
    expect(sessionOverlapsDay({ startsAt: d(9), endsAt: d(10) }, d(0))).toBe(true);
  });

  it("does not match an unrelated day", () => {
    const otherDay = new Date(2026, 7, 21);
    expect(sessionOverlapsDay({ startsAt: d(9), endsAt: d(10) }, otherDay)).toBe(false);
  });

  it("matches every day a multi-day session touches", () => {
    const session = { startsAt: new Date(2026, 7, 20, 22, 0), endsAt: new Date(2026, 7, 22, 2, 0) };
    expect(sessionOverlapsDay(session, new Date(2026, 7, 20))).toBe(true);
    expect(sessionOverlapsDay(session, new Date(2026, 7, 21))).toBe(true);
    expect(sessionOverlapsDay(session, new Date(2026, 7, 22))).toBe(true);
    expect(sessionOverlapsDay(session, new Date(2026, 7, 23))).toBe(false);
  });
});

describe("isMultiDaySession", () => {
  it("is false for a session within one calendar day", () => {
    expect(isMultiDaySession({ startsAt: d(9), endsAt: d(17) })).toBe(false);
  });

  it("is true for a session crossing midnight", () => {
    expect(isMultiDaySession({ startsAt: d(22), endsAt: new Date(2026, 7, 21, 2) })).toBe(true);
  });
});

describe("formatHourLabel", () => {
  it("formats midnight, noon, and standard hours", () => {
    expect(formatHourLabel(0)).toBe("12 AM");
    expect(formatHourLabel(12)).toBe("12 PM");
    expect(formatHourLabel(9)).toBe("9 AM");
    expect(formatHourLabel(21)).toBe("9 PM");
  });
});
