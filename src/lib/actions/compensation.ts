"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { gatherCompensationInputs } from "@/lib/services/compensation/gather";
import { computeCompensationBreakdown } from "@/lib/services/compensation/breakdown";
import { logAudit } from "@/lib/services/audit";

export type CompensationActionState = { error?: string } | undefined;

function monthRange(periodStart: string) {
  const [year, month] = periodStart.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

// `periodStart`/`periodEnd` are @db.Date columns — only the calendar date
// matters. Anchoring at UTC noon (not local midnight, and not local
// end-of-day) means no timezone offset can push the stored value across a
// day boundary in either direction before Prisma extracts the date part.
// (This is what turned Aug 31 into Sep 1 in the DB before this fix.)
function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
}

export async function generateCompensationPeriod(
  employeeId: string,
  periodStartInput: string
): Promise<CompensationActionState> {
  await requireRole("ADMIN");

  const { start, end } = monthRange(periodStartInput);
  const periodStartDate = toDateOnly(start);
  const periodEndDate = toDateOnly(end);

  const existing = await prisma.compensationPeriod.findUnique({
    where: { employeeId_periodStart: { employeeId, periodStart: periodStartDate } },
  });
  if (existing?.status === "PAID") {
    return { error: "This period has already been marked paid and can't be recalculated." };
  }

  const inputs = await gatherCompensationInputs(employeeId, start, end);

  const adjustments = existing ? Number(existing.adjustments) : 0;
  const { basePay, productionVariable, mixMasterVariable, acquisitionCommission, revenueBonus, total } =
    computeCompensationBreakdown({
      basePay: inputs.basePay,
      productionVariable: inputs.productionVariable,
      mixMasterVariable: inputs.mixMasterVariable,
      timeBasedVariable: inputs.timeBasedVariable,
      acquisitionCommission: inputs.acquisitionCommission,
      monthlyStudioRevenue: inputs.monthlyStudioRevenue,
      revenueBonusTiers: inputs.revenueBonusTiersAsOfPeriodEnd,
      adjustments,
    });

  await prisma.compensationPeriod.upsert({
    where: { employeeId_periodStart: { employeeId, periodStart: periodStartDate } },
    create: {
      employeeId,
      periodStart: periodStartDate,
      periodEnd: periodEndDate,
      basePay,
      productionVariable,
      mixMasterVariable,
      timeBasedVariable: inputs.timeBasedVariable,
      acquisitionCommission,
      revenueBonus,
      adjustments,
      total,
      monthlyRevenueSnapshot: inputs.monthlyStudioRevenue,
      deliveredSongsSnapshot: inputs.deliveredSongCount,
      mixMasterCountSnapshot: inputs.deliveredMixMasterCount,
    },
    update: {
      status: existing?.status === "APPROVED" ? "DRAFT" : existing?.status ?? "DRAFT",
      periodEnd: periodEndDate,
      basePay,
      productionVariable,
      mixMasterVariable,
      timeBasedVariable: inputs.timeBasedVariable,
      acquisitionCommission,
      revenueBonus,
      total,
      monthlyRevenueSnapshot: inputs.monthlyStudioRevenue,
      deliveredSongsSnapshot: inputs.deliveredSongCount,
      mixMasterCountSnapshot: inputs.deliveredMixMasterCount,
      approvedByEmployeeId: existing?.status === "APPROVED" ? null : existing?.approvedByEmployeeId,
      approvedAt: existing?.status === "APPROVED" ? null : existing?.approvedAt,
    },
  });

  revalidatePath("/compensation");
}

export async function approveCompensationPeriod(periodId: string): Promise<CompensationActionState> {
  const admin = await requireRole("ADMIN");

  await prisma.compensationPeriod.update({
    where: { id: periodId },
    data: { status: "APPROVED", approvedByEmployeeId: admin.id, approvedAt: new Date() },
  });
  await logAudit({
    employeeId: admin.id,
    action: "compensation_period.approved",
    entityType: "CompensationPeriod",
    entityId: periodId,
  });

  revalidatePath("/compensation");
  return undefined;
}

export async function markCompensationPeriodPaid(periodId: string): Promise<CompensationActionState> {
  const admin = await requireRole("ADMIN");

  const period = await prisma.compensationPeriod.findUniqueOrThrow({ where: { id: periodId } });
  if (period.status !== "APPROVED") {
    return { error: "Approve the period before marking it paid." };
  }

  await prisma.compensationPeriod.update({ where: { id: periodId }, data: { status: "PAID" } });
  await logAudit({
    employeeId: admin.id,
    action: "compensation_period.paid",
    entityType: "CompensationPeriod",
    entityId: periodId,
    newValue: { total: Number(period.total) },
  });

  revalidatePath("/compensation");
  return undefined;
}

export type AdjustmentFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function updateCompensationAdjustment(
  periodId: string,
  _prevState: AdjustmentFormState,
  formData: FormData
): Promise<AdjustmentFormState> {
  const admin = await requireRole("ADMIN");

  const adjustments = Number(formData.get("adjustments") || "0");
  const adjustmentNotes = String(formData.get("adjustmentNotes") || "") || null;

  if (Number.isNaN(adjustments)) {
    return { error: "Enter a valid number." };
  }

  const period = await prisma.compensationPeriod.findUniqueOrThrow({ where: { id: periodId } });
  const total =
    Number(period.basePay) +
    Number(period.productionVariable) +
    Number(period.mixMasterVariable) +
    Number(period.timeBasedVariable) +
    Number(period.acquisitionCommission) +
    Number(period.revenueBonus) +
    adjustments;

  await prisma.compensationPeriod.update({
    where: { id: periodId },
    data: { adjustments, adjustmentNotes, total },
  });
  await logAudit({
    employeeId: admin.id,
    action: "compensation_period.adjusted",
    entityType: "CompensationPeriod",
    entityId: periodId,
    oldValue: { adjustments: Number(period.adjustments) },
    newValue: { adjustments, adjustmentNotes },
  });

  revalidatePath("/compensation");
  revalidatePath(`/compensation/${periodId}`);
  return undefined;
}
