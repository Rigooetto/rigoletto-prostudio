"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";
import { startOfMonth } from "@/lib/dates";

export type CloseMonthState = { error?: string } | undefined;

export async function closeCurrentMonth(_prevState: CloseMonthState, formData: FormData): Promise<CloseMonthState> {
  const admin = await requireRole("ADMIN");
  const month = startOfMonth();

  const existing = await prisma.monthlyClose.findUnique({ where: { month } });
  if (existing) {
    return { error: "This month is already closed." };
  }

  const notes = String(formData.get("notes") || "") || null;

  const close = await prisma.monthlyClose.create({
    data: { month, closedByEmployeeId: admin.id, notes },
  });
  await logAudit({
    employeeId: admin.id,
    action: "month.closed",
    entityType: "MonthlyClose",
    entityId: close.id,
    newValue: { month: month.toISOString() },
  });

  revalidatePath("/settings/month-end-close");
}
