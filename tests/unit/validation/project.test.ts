import { describe, it, expect } from "vitest";
import { ProjectSchema } from "@/lib/validation/project";

describe("ProjectSchema", () => {
  const base = {
    clientId: "client-1",
    primaryServiceId: "service-1",
    title: "10-song album",
    trackCount: "10",
  };

  it("accepts a minimal valid project", () => {
    expect(ProjectSchema.safeParse(base).success).toBe(true);
  });

  it("requires at least 1 track", () => {
    expect(ProjectSchema.safeParse({ ...base, trackCount: "0" }).success).toBe(false);
  });

  it("caps track count at 100", () => {
    expect(ProjectSchema.safeParse({ ...base, trackCount: "101" }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...base, trackCount: "100" }).success).toBe(true);
  });

  it("requires a client and a service", () => {
    expect(ProjectSchema.safeParse({ ...base, clientId: "" }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...base, primaryServiceId: "" }).success).toBe(false);
  });
});
