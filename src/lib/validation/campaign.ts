import { z } from "zod";

export const CampaignSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  month: z.string().min(1, "Month is required."),
  spend: z.coerce.number().min(0, "Spend must be zero or more."),
  notes: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().optional()),
});
