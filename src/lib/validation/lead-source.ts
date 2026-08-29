import { z } from "zod";

export const LeadSourceSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores only."),
  label: z.string().trim().min(1, "Label is required."),
});
