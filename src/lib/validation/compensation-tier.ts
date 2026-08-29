import { z } from "zod";

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().min(0).optional()
);

export const ProductionTierSchema = z.object({
  songsFrom: z.coerce.number().int().min(1),
  songsTo: optionalNumber,
  amountPerSong: z.coerce.number().min(0),
});

export const RevenueBonusTierSchema = z.object({
  revenueFrom: z.coerce.number().min(0),
  revenueTo: optionalNumber,
  bonusAmount: z.coerce.number().min(0),
});

export const ServiceCompensationSchema = z.object({
  compensationValue: z.coerce.number().min(0),
});

export const EmployeeCompensationSchema = z.object({
  basePayWeekly: z.coerce.number().min(0),
  acquisitionCommissionPercent: z.coerce.number().min(0).max(100),
});
