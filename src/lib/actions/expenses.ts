"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { ExpenseSchema } from "@/lib/validation/expense";
import { logAudit } from "@/lib/services/audit";

export type ExpenseFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function createExpense(_prevState: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const employee = await requireRole("ADMIN");

  const validated = ExpenseSchema.safeParse({
    date: formData.get("date"),
    vendor: formData.get("vendor"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    recurring: formData.get("recurring") === "on",
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  const expense = await prisma.expense.create({
    data: {
      date: new Date(data.date),
      vendor: data.vendor,
      description: data.description,
      category: data.category,
      amount: data.amount,
      amountBase: data.amount,
      recurring: Boolean(data.recurring),
      notes: data.notes,
      createdByEmployeeId: employee.id,
    },
  });
  await logAudit({
    employeeId: employee.id,
    action: "expense.created",
    entityType: "Expense",
    entityId: expense.id,
    newValue: { vendor: data.vendor, category: data.category, amount: data.amount },
  });

  revalidatePath("/expenses");
}

export async function updateExpense(
  expenseId: string,
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const employee = await requireRole("ADMIN");

  const validated = ExpenseSchema.safeParse({
    date: formData.get("date"),
    vendor: formData.get("vendor"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    recurring: formData.get("recurring") === "on",
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  const before = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });

  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      date: new Date(data.date),
      vendor: data.vendor,
      description: data.description,
      category: data.category,
      amount: data.amount,
      amountBase: data.amount,
      recurring: Boolean(data.recurring),
      notes: data.notes,
    },
  });
  await logAudit({
    employeeId: employee.id,
    action: "expense.updated",
    entityType: "Expense",
    entityId: expenseId,
    oldValue: { vendor: before.vendor, category: before.category, amount: Number(before.amount) },
    newValue: { vendor: data.vendor, category: data.category, amount: data.amount },
  });

  revalidatePath("/expenses");
}

export async function deleteExpense(expenseId: string) {
  const employee = await requireRole("ADMIN");

  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
  await prisma.expense.delete({ where: { id: expenseId } });

  await logAudit({
    employeeId: employee.id,
    action: "expense.deleted",
    entityType: "Expense",
    entityId: expenseId,
    oldValue: { vendor: expense.vendor, category: expense.category, amount: Number(expense.amount) },
  });

  revalidatePath("/expenses");
}
