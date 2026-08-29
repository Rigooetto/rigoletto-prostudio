import { describe, it, expect } from "vitest";
import { deriveSessionPaymentStatus, resolveBookingPayment } from "@/lib/payment-status";

describe("deriveSessionPaymentStatus", () => {
  it("is UNPAID when no payments exist at all", () => {
    expect(deriveSessionPaymentStatus(0, 500, 0)).toBe("UNPAID");
  });

  it("is PARTIAL when a deposit has been paid but not the full amount", () => {
    // The exact scenario this whole feature was built for: 50% deposit.
    expect(deriveSessionPaymentStatus(250, 500, 1)).toBe("PARTIAL");
  });

  it("is PAID once total payments reach the full amount", () => {
    expect(deriveSessionPaymentStatus(500, 500, 2)).toBe("PAID");
  });

  it("is PAID when total payments exceed the amount (overpayment)", () => {
    expect(deriveSessionPaymentStatus(550, 500, 1)).toBe("PAID");
  });

  it("is REFUNDED when payments happened but net back to zero", () => {
    // One payment of 500, one refund of -500 -> 2 payment records, net $0.
    expect(deriveSessionPaymentStatus(0, 500, 2)).toBe("REFUNDED");
  });

  it("is REFUNDED when a refund exceeds what was paid (net negative)", () => {
    expect(deriveSessionPaymentStatus(-50, 500, 2)).toBe("REFUNDED");
  });
});

describe("resolveBookingPayment", () => {
  it("records nothing for Unpaid", () => {
    expect(resolveBookingPayment(500, "UNPAID")).toEqual({ paidAmount: 0, storedPaymentStatus: "UNPAID" });
  });

  it("records half the amount as PARTIAL for Deposit", () => {
    expect(resolveBookingPayment(500, "DEPOSIT")).toEqual({ paidAmount: 250, storedPaymentStatus: "PARTIAL" });
  });

  it("rounds an odd-cent deposit to the nearest cent", () => {
    expect(resolveBookingPayment(333.33, "DEPOSIT").paidAmount).toBe(166.67);
  });

  it("records the full amount as PAID for Paid on the spot", () => {
    expect(resolveBookingPayment(500, "PAID")).toEqual({ paidAmount: 500, storedPaymentStatus: "PAID" });
  });
});
