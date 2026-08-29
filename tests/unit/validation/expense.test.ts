import { describe, it, expect } from "vitest";
import { ExpenseSchema } from "@/lib/validation/expense";

describe("ExpenseSchema", () => {
  it("accepts a valid expense", () => {
    const result = ExpenseSchema.safeParse({
      date: "2026-08-01",
      vendor: "CFE",
      category: "ELECTRICITY",
      amount: "1200",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown category", () => {
    const result = ExpenseSchema.safeParse({
      date: "2026-08-01",
      vendor: "CFE",
      category: "BRIBES",
      amount: "1200",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = ExpenseSchema.safeParse({
      date: "2026-08-01",
      vendor: "CFE",
      category: "ELECTRICITY",
      amount: "0",
    });
    expect(result.success).toBe(false);
  });
});
