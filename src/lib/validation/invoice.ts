import { z } from "zod";

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

export const InvoiceSchema = z.object({
  clientId: z.string().min(1, "Select a client."),
  projectId: emptyToUndefined,
  total: z.coerce.number().min(0.01, "Total must be greater than zero."),
  depositAmount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  dueDate: emptyToUndefined,
  notes: emptyToUndefined,
});

export const PaymentMethodValues = ["CASH", "CARD", "TRANSFER", "OTHER"] as const;

export const PaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero."),
  method: z.enum(PaymentMethodValues).default("CASH"),
  paidAt: emptyToUndefined,
  notes: emptyToUndefined,
});
