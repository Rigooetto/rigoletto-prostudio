import { describe, it, expect } from "vitest";
import { QuoteSchema } from "@/lib/validation/quote";

describe("QuoteSchema", () => {
  it("accepts a valid quote", () => {
    expect(QuoteSchema.safeParse({ serviceId: "svc-1", amount: "350" }).success).toBe(true);
  });

  it("rejects a missing service", () => {
    expect(QuoteSchema.safeParse({ serviceId: "", amount: "350" }).success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(QuoteSchema.safeParse({ serviceId: "svc-1", amount: "-1" }).success).toBe(false);
  });
});
