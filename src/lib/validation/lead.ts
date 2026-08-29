import { z } from "zod";

export const LeadStageValues = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTED",
  "FOLLOW_UP",
  "BOOKED",
  "WON",
  "LOST",
] as const;

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

export const LeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  artistName: emptyToUndefined,
  phone: emptyToUndefined,
  email: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email("Enter a valid email.").optional()
  ),
  instagramHandle: emptyToUndefined,
  leadSourceId: emptyToUndefined,
  interestedServiceId: emptyToUndefined,
  estimatedValue: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional()
  ),
  probability: z.coerce.number().int().min(0).max(100).default(50),
  nextFollowUpAt: emptyToUndefined,
  ownerEmployeeId: emptyToUndefined,
  notes: emptyToUndefined,
});
