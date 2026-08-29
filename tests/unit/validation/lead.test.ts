import { describe, it, expect } from "vitest";
import { LeadSchema } from "@/lib/validation/lead";

describe("LeadSchema", () => {
  it("accepts a minimal valid lead", () => {
    expect(LeadSchema.safeParse({ name: "Juan Perez" }).success).toBe(true);
  });

  it("defaults probability to 50", () => {
    const result = LeadSchema.safeParse({ name: "Juan Perez" });
    if (result.success) expect(result.data.probability).toBe(50);
  });

  it("rejects a probability outside 0-100", () => {
    expect(LeadSchema.safeParse({ name: "X", probability: "150" }).success).toBe(false);
    expect(LeadSchema.safeParse({ name: "X", probability: "-1" }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(LeadSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
