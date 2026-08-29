import { describe, it, expect } from "vitest";
import { sessionBillableHours, calculateBillableHours } from "@/lib/billable-hours";

describe("sessionBillableHours", () => {
  it("uses exact duration for a same-day session", () => {
    const hours = sessionBillableHours({
      startsAt: new Date("2026-08-18T17:00:00Z"),
      endsAt: new Date("2026-08-18T21:00:00Z"),
    }, 8);
    expect(hours).toBe(4);
  });

  it("counts a fixed block per calendar day touched for a multi-day session", () => {
    // Tue 5pm -> Thu 1am: touches Tue, Wed, Thu = 3 days.
    const hours = sessionBillableHours({
      startsAt: new Date("2026-08-18T17:00:00Z"),
      endsAt: new Date("2026-08-21T01:00:00Z"),
    }, 8);
    expect(hours).toBe(24);
  });

  it("clamps to the given window instead of counting days outside it", () => {
    // Session runs Fri -> next Tue, but the window only covers through Sunday.
    const hours = sessionBillableHours(
      { startsAt: new Date("2026-08-21T17:00:00Z"), endsAt: new Date("2026-08-25T01:00:00Z") },
      8,
      new Date("2026-08-17T00:00:00Z"),
      new Date("2026-08-23T23:59:59Z")
    );
    // Clamped end falls on Sun (Aug 23) -> touches Fri, Sat, Sun = 3 days.
    expect(hours).toBe(24);
  });

  it("returns 0 when the session falls entirely outside the window", () => {
    const hours = sessionBillableHours(
      { startsAt: new Date("2026-08-30T10:00:00Z"), endsAt: new Date("2026-08-30T12:00:00Z") },
      8,
      new Date("2026-08-17T00:00:00Z"),
      new Date("2026-08-23T23:59:59Z")
    );
    expect(hours).toBe(0);
  });
});

describe("calculateBillableHours", () => {
  it("sums same-day and multi-day sessions with the correct policy for each", () => {
    // Reproduces the real bug: a 56h multi-day session should count as 24h
    // (3 days x 8h), and a next-week session should be excluded by the window.
    const weekStart = new Date("2026-08-17T00:00:00Z");
    const weekEnd = new Date("2026-08-23T23:59:59.999Z");
    const sessions = [
      { startsAt: new Date("2026-08-18T17:00:00Z"), endsAt: new Date("2026-08-21T01:00:00Z") }, // 3 days -> 24h
      { startsAt: new Date("2026-08-23T17:00:00Z"), endsAt: new Date("2026-08-28T01:00:00Z") }, // starts in window, ends outside
    ];
    const hours = calculateBillableHours(sessions, 8, weekStart, weekEnd);
    // First: 24h. Second: clamped end = weekEnd, touches only Aug 23 -> 8h.
    expect(hours).toBe(32);
  });

  it("excludes sessions with no overlap in the window", () => {
    const weekStart = new Date("2026-08-17T00:00:00Z");
    const weekEnd = new Date("2026-08-23T23:59:59.999Z");
    const sessions = [{ startsAt: new Date("2026-08-24T10:00:00Z"), endsAt: new Date("2026-08-24T12:00:00Z") }];
    expect(calculateBillableHours(sessions, 8, weekStart, weekEnd)).toBe(0);
  });
});
