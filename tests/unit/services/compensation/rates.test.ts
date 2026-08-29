import { describe, it, expect } from "vitest";
import { resolveRateAsOf, resolveTierSetAsOf } from "@/lib/services/compensation/rates";

describe("resolveRateAsOf", () => {
  const history = [
    { id: "old", value: 300, effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2026-08-15") },
    { id: "new", value: 350, effectiveFrom: new Date("2026-08-15"), effectiveTo: null },
  ];

  it("resolves work dated before the change to the old rate", () => {
    const resolved = resolveRateAsOf(history, new Date("2026-08-10"));
    expect(resolved?.id).toBe("old");
    expect(resolved?.value).toBe(300);
  });

  it("resolves work dated on/after the change to the new rate", () => {
    const resolved = resolveRateAsOf(history, new Date("2026-08-20"));
    expect(resolved?.id).toBe("new");
    expect(resolved?.value).toBe(350);
  });

  it("is exactly this session's original ask: changing the rate today never moves yesterday's already-rendered number", () => {
    // Simulates: work happened Aug 10 under the old rate. Admin raises the
    // rate on Aug 15. Re-resolving the SAME Aug 10 work must still return
    // the old rate, no matter when the lookup runs.
    const workDate = new Date("2026-08-10");
    const beforeChange = resolveRateAsOf([history[0]], workDate);
    const afterChangeExists = resolveRateAsOf(history, workDate);
    expect(beforeChange?.value).toBe(afterChangeExists?.value);
    expect(afterChangeExists?.value).toBe(300);
  });

  it("returns undefined when no rate was effective yet on that date", () => {
    const resolved = resolveRateAsOf(history, new Date("2025-12-01"));
    expect(resolved).toBeUndefined();
  });

  it("picks the most-recently-started row when ranges overlap at a boundary", () => {
    const overlapping = [
      { effectiveFrom: new Date("2026-01-01"), effectiveTo: null, value: 1 },
      { effectiveFrom: new Date("2026-06-01"), effectiveTo: null, value: 2 },
    ];
    const resolved = resolveRateAsOf(overlapping, new Date("2026-07-01"));
    expect(resolved?.value).toBe(2);
  });
});

describe("resolveTierSetAsOf", () => {
  const tierHistory = [
    { id: "a-old", songsFrom: 11, songsTo: 15, sortOrder: 1, amountPerSong: 50, effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2026-08-15") },
    { id: "a-new", songsFrom: 11, songsTo: 15, sortOrder: 1, amountPerSong: 60, effectiveFrom: new Date("2026-08-15"), effectiveTo: null },
    { id: "b", songsFrom: 16, songsTo: 20, sortOrder: 2, amountPerSong: 75, effectiveFrom: new Date("2026-01-01"), effectiveTo: null },
  ];

  it("returns the full bracket set active on a given date, sorted by sortOrder", () => {
    const asOfBeforeChange = resolveTierSetAsOf(tierHistory, new Date("2026-08-10"));
    expect(asOfBeforeChange.map((t) => t.id)).toEqual(["a-old", "b"]);

    const asOfAfterChange = resolveTierSetAsOf(tierHistory, new Date("2026-08-20"));
    expect(asOfAfterChange.map((t) => t.id)).toEqual(["a-new", "b"]);
  });

  it("never includes both an old and new version of the same bracket at once", () => {
    for (const date of [new Date("2026-08-10"), new Date("2026-08-20"), new Date("2026-01-01")]) {
      const set = resolveTierSetAsOf(tierHistory, date);
      const bracket11to15 = set.filter((t) => t.songsFrom === 11);
      expect(bracket11to15.length).toBeLessThanOrEqual(1);
    }
  });
});
