import { z } from "zod";

export const QuoteStatusValues = ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"] as const;

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

export const QuoteSchema = z.object({
  leadId: emptyToUndefined,
  clientId: emptyToUndefined,
  serviceId: z.string().min(1, "Select a service."),
  amount: z.coerce.number().min(0, "Amount must be zero or more."),
  validUntil: emptyToUndefined,
  notes: emptyToUndefined,
});
