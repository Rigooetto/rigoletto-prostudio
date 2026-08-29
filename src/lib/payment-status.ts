import type { PaymentStatus } from "@/generated/prisma/enums";

/**
 * Derives a Session's payment status purely from its dated payment records
 * — never set directly, so the status always reflects real money collected
 * instead of a manually-flipped flag. A refund is just a negative-amount
 * payment, so a full refund (totalPaid back to 0, but payments did happen)
 * is distinguishable from a session nobody has ever paid on at all.
 */
export function deriveSessionPaymentStatus(
  totalPaid: number,
  sessionAmount: number,
  paymentCount: number
): PaymentStatus {
  if (paymentCount === 0) return "UNPAID";
  if (totalPaid <= 0) return "REFUNDED";
  if (totalPaid >= sessionAmount) return "PAID";
  return "PARTIAL";
}

export type BookingPaymentChoice = "UNPAID" | "DEPOSIT" | "PAID";

/**
 * Translates the booking-time choice into an actual payment to record.
 * "Deposit" isn't a real PaymentStatus — it's shorthand for "collect half
 * now," which resolves to a genuine PARTIAL-status payment, identical in
 * shape to one entered later via recordSessionPayment.
 */
export function resolveBookingPayment(
  amount: number,
  choice: BookingPaymentChoice
): { paidAmount: number; storedPaymentStatus: "UNPAID" | "PARTIAL" | "PAID" } {
  if (choice === "PAID") return { paidAmount: amount, storedPaymentStatus: "PAID" };
  if (choice === "DEPOSIT") return { paidAmount: Math.round(amount * 50) / 100, storedPaymentStatus: "PARTIAL" };
  return { paidAmount: 0, storedPaymentStatus: "UNPAID" };
}
