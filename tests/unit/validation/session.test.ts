import { describe, it, expect } from "vitest";
import { BookSessionSchema, RescheduleSessionSchema } from "@/lib/validation/session";

describe("BookSessionSchema", () => {
  const base = {
    clientMode: "existing",
    clientId: "client-1",
    projectMode: "none",
    serviceId: "service-1",
    studioRoom: "Main Room",
    startsAt: "2026-09-01T10:00",
    endsAt: "2026-09-01T14:00",
    amount: "350",
  };

  it("accepts an existing client, no project (Full Recording Day shape)", () => {
    expect(BookSessionSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an end time before the start time", () => {
    const result = BookSessionSchema.safeParse({ ...base, endsAt: "2026-09-01T09:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["endsAt"]);
    }
  });

  it("rejects a negative amount", () => {
    expect(BookSessionSchema.safeParse({ ...base, amount: "-50" }).success).toBe(false);
  });

  it("defaults payment status to UNPAID", () => {
    const result = BookSessionSchema.safeParse(base);
    if (result.success) expect(result.data.paymentStatus).toBe("UNPAID");
  });

  it("requires clientId when clientMode is existing", () => {
    const result = BookSessionSchema.safeParse({ ...base, clientId: undefined });
    expect(result.success).toBe(false);
  });

  it("accepts a new client with just a name, no existing clientId", () => {
    const result = BookSessionSchema.safeParse({
      ...base,
      clientMode: "new",
      clientId: undefined,
      newClientName: "Walk-in Client",
    });
    expect(result.success).toBe(true);
  });

  it("rejects clientMode new with no name", () => {
    const result = BookSessionSchema.safeParse({ ...base, clientMode: "new", clientId: undefined });
    expect(result.success).toBe(false);
  });

  it("requires projectId when projectMode is existing", () => {
    const result = BookSessionSchema.safeParse({ ...base, projectMode: "existing", projectId: undefined });
    expect(result.success).toBe(false);
  });

  it("accepts a new project with title and track count", () => {
    const result = BookSessionSchema.safeParse({
      ...base,
      projectMode: "new",
      newProjectTitle: "10-song album",
      newProjectTrackCount: "10",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.newProjectTrackCount).toBe(10);
  });

  it("rejects projectMode new with no title", () => {
    const result = BookSessionSchema.safeParse({ ...base, projectMode: "new", newProjectTrackCount: "10" });
    expect(result.success).toBe(false);
  });

  it("rejects projectMode new with no track count", () => {
    const result = BookSessionSchema.safeParse({ ...base, projectMode: "new", newProjectTitle: "10-song album" });
    expect(result.success).toBe(false);
  });

  it("rejects a track count above 100", () => {
    const result = BookSessionSchema.safeParse({
      ...base,
      projectMode: "new",
      newProjectTitle: "Huge album",
      newProjectTrackCount: "200",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid new-client email", () => {
    const result = BookSessionSchema.safeParse({
      ...base,
      clientMode: "new",
      clientId: undefined,
      newClientName: "Walk-in Client",
      newClientEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("RescheduleSessionSchema", () => {
  it("accepts a valid start/end pair", () => {
    const result = RescheduleSessionSchema.safeParse({
      startsAt: new Date("2026-09-01T10:00:00Z"),
      endsAt: new Date("2026-09-01T12:00:00Z"),
    });
    expect(result.success).toBe(true);
  });

  it("rejects endsAt equal to startsAt", () => {
    const same = new Date("2026-09-01T10:00:00Z");
    const result = RescheduleSessionSchema.safeParse({ startsAt: same, endsAt: same });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["endsAt"]);
  });

  it("rejects endsAt before startsAt", () => {
    const result = RescheduleSessionSchema.safeParse({
      startsAt: new Date("2026-09-01T12:00:00Z"),
      endsAt: new Date("2026-09-01T10:00:00Z"),
    });
    expect(result.success).toBe(false);
  });
});
