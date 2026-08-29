import { describe, it, expect } from "vitest";
import { tracksNeedingAdvance, suggestNextProjectStatus, hasStartedProduction } from "@/lib/track-status";

function track(status: Parameters<typeof tracksNeedingAdvance>[0][number]["status"]) {
  return { status };
}

describe("tracksNeedingAdvance", () => {
  it("includes only tracks earlier than the target status", () => {
    const tracks = [track("PENDING"), track("EDITED"), track("MIXED")];
    const result = tracksNeedingAdvance(tracks, "EDITED");
    expect(result).toEqual([{ status: "PENDING" }]);
  });

  it("returns an empty list when every track is already at or past the target", () => {
    const tracks = [track("MIXED"), track("MASTERED"), track("DELIVERED")];
    expect(tracksNeedingAdvance(tracks, "EDITED")).toEqual([]);
  });

  it("returns every track when the target is the furthest step, DELIVERED", () => {
    const tracks = [track("PENDING"), track("RECORDING"), track("MASTERED")];
    expect(tracksNeedingAdvance(tracks, "DELIVERED")).toHaveLength(3);
  });

  it("excludes REVISION_REQUESTED tracks — a flagged redo is never silently bulk-advanced", () => {
    const tracks = [track("PENDING"), track("REVISION_REQUESTED")];
    const result = tracksNeedingAdvance(tracks, "DELIVERED");
    expect(result).toEqual([{ status: "PENDING" }]);
  });

  it("returns an empty list for an unrecognized/non-progression target", () => {
    const tracks = [track("PENDING")];
    // REVISION_REQUESTED itself is not a step on the ladder, so it can't be
    // a bulk-advance target either.
    expect(tracksNeedingAdvance(tracks, "REVISION_REQUESTED")).toEqual([]);
  });
});

describe("suggestNextProjectStatus", () => {
  it("suggests MIXING once every track has reached EDITED", () => {
    const tracks = [track("EDITED"), track("EDITED")];
    const suggestion = suggestNextProjectStatus(tracks, "RECORDING");
    expect(suggestion?.status).toBe("MIXING");
  });

  it("suggests the furthest applicable milestone, not just the nearest one", () => {
    // Every track already DELIVERED but the project is still sitting at LEAD —
    // should jump straight to DELIVERED, not stop at MIXING.
    const tracks = [track("DELIVERED"), track("DELIVERED")];
    const suggestion = suggestNextProjectStatus(tracks, "LEAD");
    expect(suggestion?.status).toBe("DELIVERED");
  });

  it("suggests nothing when not every track has reached the milestone", () => {
    // One track hasn't even started editing yet — "all tracks EDITED+" isn't
    // true, so nothing should be suggested despite the other track being
    // further along (MIXING is past EDITED on its own).
    const tracks = [track("PENDING"), track("MIXING")];
    expect(suggestNextProjectStatus(tracks, "RECORDING")).toBeNull();
  });

  it("suggests nothing when the project status is already ahead of its tracks", () => {
    const tracks = [track("EDITED"), track("EDITED")];
    expect(suggestNextProjectStatus(tracks, "MASTERING")).toBeNull();
  });

  it("suggests nothing for a project that is CANCELLED or ON_HOLD", () => {
    const tracks = [track("DELIVERED")];
    expect(suggestNextProjectStatus(tracks, "CANCELLED")).toBeNull();
    expect(suggestNextProjectStatus(tracks, "ON_HOLD")).toBeNull();
  });

  it("suggests nothing for a project with no tracks", () => {
    expect(suggestNextProjectStatus([], "RECORDING")).toBeNull();
  });
});

describe("hasStartedProduction", () => {
  it("is false before recording begins", () => {
    expect(hasStartedProduction("LEAD")).toBe(false);
    expect(hasStartedProduction("QUOTED")).toBe(false);
    expect(hasStartedProduction("BOOKED")).toBe(false);
  });

  it("is true from RECORDING onward — the point the deposit-vs-balance split matters", () => {
    expect(hasStartedProduction("RECORDING")).toBe(true);
    expect(hasStartedProduction("EDITING")).toBe(true);
    expect(hasStartedProduction("MASTERING")).toBe(true);
    expect(hasStartedProduction("DELIVERED")).toBe(true);
  });

  it("is false for statuses outside the forward progression", () => {
    expect(hasStartedProduction("CANCELLED")).toBe(false);
    expect(hasStartedProduction("ON_HOLD")).toBe(false);
  });
});
