import { describe, it, expect } from "vitest";
import { LeadSourceSchema } from "@/lib/validation/lead-source";

describe("LeadSourceSchema", () => {
  it("accepts a well-formed code", () => {
    const result = LeadSourceSchema.safeParse({ code: "META_ADS", label: "Meta Ads" });
    expect(result.success).toBe(true);
  });

  it("rejects a lowercase or spaced code", () => {
    expect(LeadSourceSchema.safeParse({ code: "meta ads", label: "Meta Ads" }).success).toBe(false);
    expect(LeadSourceSchema.safeParse({ code: "Meta-Ads", label: "Meta Ads" }).success).toBe(false);
  });

  it("rejects a missing label", () => {
    const result = LeadSourceSchema.safeParse({ code: "TIKTOK", label: "" });
    expect(result.success).toBe(false);
  });
});
