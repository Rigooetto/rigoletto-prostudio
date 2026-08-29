import { z } from "zod";

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().min(0).optional()
);

export const EmployeeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  fullName: z.string().trim().min(1, "Full name is required."),
  displayName: z.string().trim().optional().or(z.literal("")),
  roleId: z.string().min(1, "Select a role."),
  basePayWeekly: optionalNumber,
  acquisitionCommissionPercent: optionalNumber,
  password: z.string().min(8, "Password must be at least 8 characters.").optional().or(z.literal("")),
});
