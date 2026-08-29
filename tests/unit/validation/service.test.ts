import { describe, it, expect } from "vitest";
import { ServiceSchema } from "@/lib/validation/service";

describe("ServiceSchema", () => {
  it("accepts the seeded Full Production shape", () => {
    const result = ServiceSchema.safeParse({
      serviceName: "Full Production",
      serviceCategory: "Production",
      billingType: "PER_SONG",
      defaultPrice: "350",
      defaultDurationMinutes: "",
      compensationType: "TIERED_PRODUCTION",
      compensationValue: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative price", () => {
    const result = ServiceSchema.safeParse({
      serviceName: "Bad Service",
      billingType: "PER_SONG",
      defaultPrice: "-10",
      compensationType: "NONE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown billing type", () => {
    const result = ServiceSchema.safeParse({
      serviceName: "X",
      billingType: "PER_MOON_CYCLE",
      defaultPrice: "10",
      compensationType: "NONE",
    });
    expect(result.success).toBe(false);
  });

  it("treats an empty compensationValue as absent, not an error", () => {
    const result = ServiceSchema.safeParse({
      serviceName: "Mix & Master",
      billingType: "PER_SONG",
      defaultPrice: "200",
      compensationType: "FIXED_AMOUNT",
      compensationValue: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.compensationValue).toBeUndefined();
  });
});
