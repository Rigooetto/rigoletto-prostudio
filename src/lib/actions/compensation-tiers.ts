"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {
  ProductionTierSchema,
  RevenueBonusTierSchema,
  ServiceCompensationSchema,
  EmployeeCompensationSchema,
} from "@/lib/validation/compensation-tier";
import { refreshDraftCompensationPeriods } from "@/lib/services/compensation/refresh";

export type TierFormState = { error?: string } | undefined;

// A rate change is safe to immediately reflect in this month's already-
// generated DRAFT period, because gather.ts resolves every dollar amount
// against whichever rate was effective on the date the work actually
// happened — refreshing never re-prices anything from before the change.
async function refreshAllActiveEmployees() {
  const employees = await prisma.employee.findMany({ where: { active: true }, select: { id: true } });
  await refreshDraftCompensationPeriods(employees.map((e) => e.id), new Date());
}

// Rate edits never mutate a row in place — the old row is closed out
// (effectiveTo = now) and a new one starts from now. This is the whole
// point: work already delivered/paid/logged before this moment keeps
// resolving to the old row forever (see gather.ts + rates.ts), and only
// work from this moment on sees the new rate.
export async function updateProductionTier(tierId: string, _prevState: TierFormState, formData: FormData): Promise<TierFormState> {
  await requireRole("ADMIN");

  const validated = ProductionTierSchema.safeParse({
    songsFrom: formData.get("songsFrom"),
    songsTo: formData.get("songsTo"),
    amountPerSong: formData.get("amountPerSong"),
  });
  if (!validated.success) return { error: "Please fix the errors below." };

  const current = await prisma.productionTier.findUniqueOrThrow({ where: { id: tierId } });
  const now = new Date();

  await prisma.$transaction([
    prisma.productionTier.update({ where: { id: tierId }, data: { effectiveTo: now, active: false } }),
    prisma.productionTier.create({
      data: {
        songsFrom: validated.data.songsFrom,
        songsTo: validated.data.songsTo ?? null,
        amountPerSong: validated.data.amountPerSong,
        sortOrder: current.sortOrder,
        active: true,
        effectiveFrom: now,
        effectiveTo: null,
      },
    }),
  ]);
  await refreshAllActiveEmployees();

  revalidatePath("/settings/compensation-tiers");
}

export async function updateRevenueBonusTier(tierId: string, _prevState: TierFormState, formData: FormData): Promise<TierFormState> {
  await requireRole("ADMIN");

  const validated = RevenueBonusTierSchema.safeParse({
    revenueFrom: formData.get("revenueFrom"),
    revenueTo: formData.get("revenueTo"),
    bonusAmount: formData.get("bonusAmount"),
  });
  if (!validated.success) return { error: "Please fix the errors below." };

  const current = await prisma.revenueBonusTier.findUniqueOrThrow({ where: { id: tierId } });
  const now = new Date();

  await prisma.$transaction([
    prisma.revenueBonusTier.update({ where: { id: tierId }, data: { effectiveTo: now, active: false } }),
    prisma.revenueBonusTier.create({
      data: {
        revenueFrom: validated.data.revenueFrom,
        revenueTo: validated.data.revenueTo ?? null,
        bonusAmount: validated.data.bonusAmount,
        sortOrder: current.sortOrder,
        active: true,
        effectiveFrom: now,
        effectiveTo: null,
      },
    }),
  ]);
  await refreshAllActiveEmployees();

  revalidatePath("/settings/compensation-tiers");
}

// Mix & Master's $/track and the percent-revenue services' % rate both
// version through ServiceCompensationRate — this edits just that rate (not
// the full Service record, which also covers billing/pricing fields
// unrelated to compensation and already has its own edit path under
// Settings > Services). Service.compensationValue is kept in sync as a
// denormalized "current value" for simple display elsewhere.
export async function updateServiceCompensation(
  serviceId: string,
  _prevState: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  await requireRole("ADMIN");

  const validated = ServiceCompensationSchema.safeParse({
    compensationValue: formData.get("compensationValue"),
  });
  if (!validated.success) return { error: "Please fix the errors below." };

  const now = new Date();
  const currentRate = await prisma.serviceCompensationRate.findFirst({
    where: { serviceId, effectiveTo: null },
  });

  await prisma.$transaction([
    ...(currentRate
      ? [prisma.serviceCompensationRate.update({ where: { id: currentRate.id }, data: { effectiveTo: now } })]
      : []),
    prisma.serviceCompensationRate.create({
      data: { serviceId, compensationValue: validated.data.compensationValue, effectiveFrom: now, effectiveTo: null },
    }),
    prisma.service.update({ where: { id: serviceId }, data: { compensationValue: validated.data.compensationValue } }),
  ]);
  await refreshAllActiveEmployees();

  revalidatePath("/settings/compensation-tiers");
  revalidatePath("/settings/services");
}

export async function updateEmployeeCompensation(
  employeeId: string,
  _prevState: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  await requireRole("ADMIN");

  const validated = EmployeeCompensationSchema.safeParse({
    basePayWeekly: formData.get("basePayWeekly"),
    acquisitionCommissionPercent: formData.get("acquisitionCommissionPercent"),
  });
  if (!validated.success) return { error: "Please fix the errors below." };

  const now = new Date();
  const currentRate = await prisma.employeePayRate.findFirst({
    where: { employeeId, effectiveTo: null },
  });

  await prisma.$transaction([
    ...(currentRate
      ? [prisma.employeePayRate.update({ where: { id: currentRate.id }, data: { effectiveTo: now } })]
      : []),
    prisma.employeePayRate.create({
      data: {
        employeeId,
        basePayWeekly: validated.data.basePayWeekly,
        acquisitionCommissionPercent: validated.data.acquisitionCommissionPercent,
        effectiveFrom: now,
        effectiveTo: null,
      },
    }),
    prisma.employee.update({
      where: { id: employeeId },
      data: {
        basePayWeekly: validated.data.basePayWeekly,
        acquisitionCommissionPercent: validated.data.acquisitionCommissionPercent,
      },
    }),
  ]);
  await refreshDraftCompensationPeriods([employeeId], now);

  revalidatePath("/settings/compensation-tiers");
  revalidatePath("/settings/users");
}
