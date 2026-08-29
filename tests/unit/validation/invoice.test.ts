import { describe, it, expect } from "vitest";
import { InvoiceSchema, PaymentSchema } from "@/lib/validation/invoice";

describe("InvoiceSchema", () => {
  it("accepts a valid invoice", () => {
    expect(InvoiceSchema.safeParse({ clientId: "c1", total: "3500" }).success).toBe(true);
  });

  it("rejects a zero or negative total", () => {
    expect(InvoiceSchema.safeParse({ clientId: "c1", total: "0" }).success).toBe(false);
    expect(InvoiceSchema.safeParse({ clientId: "c1", total: "-5" }).success).toBe(false);
  });
});

describe("PaymentSchema", () => {
  it("accepts a valid payment and defaults method to CASH", () => {
    const result = PaymentSchema.safeParse({ amount: "500" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.method).toBe("CASH");
  });

  it("rejects a zero amount", () => {
    expect(PaymentSchema.safeParse({ amount: "0" }).success).toBe(false);
  });
});
