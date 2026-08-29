import { z } from "zod";

export const ExpenseCategoryValues = [
  "PAYROLL",
  "ADVERTISING",
  "ELECTRICITY",
  "WATER",
  "INTERNET",
  "RENT",
  "EQUIPMENT",
  "MAINTENANCE",
  "SOFTWARE",
  "CONTRACTORS",
  "SUPPLIES",
  "OTHER",
] as const;

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

export const ExpenseSchema = z.object({
  date: z.string().min(1, "Date is required."),
  vendor: z.string().trim().min(1, "Vendor is required."),
  description: emptyToUndefined,
  category: z.enum(ExpenseCategoryValues),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero."),
  recurring: z.coerce.boolean().optional(),
  notes: emptyToUndefined,
});
