import { z } from "zod";

export const BillingTypeValues = ["PER_SONG", "PER_HOUR", "PER_DAY", "FIXED_PROJECT", "CUSTOM"] as const;
export const CompensationTypeValues = [
  "NONE",
  "FIXED_AMOUNT",
  "PERCENT_REVENUE",
  "TIERED_PRODUCTION",
  "CUSTOM",
] as const;

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().min(0).optional()
);

export const ServiceSchema = z.object({
  serviceName: z.string().trim().min(1, "Service name is required."),
  serviceCategory: z.string().trim().optional().or(z.literal("")),
  billingType: z.enum(BillingTypeValues),
  defaultPrice: z.coerce.number().min(0, "Price must be zero or more."),
  defaultDurationMinutes: optionalNumber,
  compensationType: z.enum(CompensationTypeValues),
  compensationValue: optionalNumber,
});
