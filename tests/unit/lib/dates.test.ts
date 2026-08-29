import { describe, it, expect } from "vitest";
import { startOfDayFor, endOfDayFor, endOfWeekFor, addMinutes, snapToInterval } from "@/lib/dates";

describe("startOfDayFor / endOfDayFor", () => {
  it("zeroes out the time to the start and end of the given day", () => {
    const d = new Date(2026, 7, 20, 14, 32, 10);
    expect(startOfDayFor(d)).toEqual(new Date(2026, 7, 20, 0, 0, 0, 0));
    expect(endOfDayFor(d)).toEqual(new Date(2026, 7, 20, 23, 59, 59, 999));
  });
});

describe("endOfWeekFor", () => {
  it("returns the end of the Monday-start week containing the given date", () => {
    // Aug 20, 2026 is a Thursday; that week runs Mon Aug 17 - Sun Aug 23.
    const result = endOfWeekFor(new Date(2026, 7, 20));
    expect(result).toEqual(new Date(2026, 7, 23, 23, 59, 59, 999));
  });
});

describe("addMinutes", () => {
  it("adds minutes, rolling over hour/day boundaries", () => {
    expect(addMinutes(new Date(2026, 7, 20, 23, 50), 20)).toEqual(new Date(2026, 7, 21, 0, 10));
  });
});

describe("snapToInterval", () => {
  it("rounds to the nearest interval", () => {
    expect(snapToInterval(new Date(2026, 7, 20, 10, 7), 15)).toEqual(new Date(2026, 7, 20, 10, 0));
    expect(snapToInterval(new Date(2026, 7, 20, 10, 8), 15)).toEqual(new Date(2026, 7, 20, 10, 15));
  });
});
