import "server-only";
import { prisma } from "@/lib/db";
import { gatherCompensationInputs } from "@/lib/services/compensation/gather";
import { calculateRevenueBonus, getNextRevenueBonusTier } from "@/lib/services/compensation/calculate";
import { computeCompensationBreakdown } from "@/lib/services/compensation/breakdown";
import { startOfMonth } from "@/lib/dates";

export async function listCompensationPeriods() {
  return prisma.compensationPeriod.findMany({
    include: { employee: true, approvedByEmployee: true },
    orderBy: [{ periodStart: "desc" }, { employee: { fullName: "asc" } }],
  });
}

export async function getCompensationPeriodDetail(periodId: string) {
  return prisma.compensationPeriod.findUnique({
    where: { id: periodId },
    include: { employee: true, approvedByEmployee: true },
  });
}

// "Currently in effect" = effectiveTo still null (the newest version of each
// bracket) — the source of truth for what's active is the effective-dating
// on these rows now, not the older `active` boolean flag.
export async function getActiveTiers() {
  const [productionTiers, revenueBonusTiers] = await Promise.all([
    prisma.productionTier.findMany({ where: { effectiveTo: null }, orderBy: { sortOrder: "asc" } }),
    prisma.revenueBonusTier.findMany({ where: { effectiveTo: null }, orderBy: { sortOrder: "asc" } }),
  ]);
  return { productionTiers, revenueBonusTiers };
}

/**
 * Live, unsaved forecast for "how am I doing this month" — computed the same
 * way generateCompensationPeriod persists it, but without writing anything,
 * so the dashboard can show real-time numbers before month-end close.
 */
export async function getLiveCompensationForecast(employeeId: string) {
  const start = startOfMonth();
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

  const [employee, inputs, unpaidSessions, openInvoices] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    gatherCompensationInputs(employeeId, start, end),
    // Booked but not yet collected — this month's "confirmed upcoming revenue".
    prisma.session.aggregate({
      where: { paymentStatus: { in: ["UNPAID", "PARTIAL"] }, startsAt: { gte: start, lte: end } },
      _sum: { amountBase: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["UNPAID", "PARTIAL"] }, issueDate: { gte: start, lte: end } },
      include: { payments: true },
    }),
  ]);
  if (!employee) return null;

  const { basePay, productionVariable, mixMasterVariable, acquisitionCommission, revenueBonus, total } =
    computeCompensationBreakdown({
      basePay: inputs.basePay,
      productionVariable: inputs.productionVariable,
      mixMasterVariable: inputs.mixMasterVariable,
      timeBasedVariable: inputs.timeBasedVariable,
      acquisitionCommission: inputs.acquisitionCommission,
      monthlyStudioRevenue: inputs.monthlyStudioRevenue,
      revenueBonusTiers: inputs.revenueBonusTiersAsOfPeriodEnd,
      adjustments: 0,
    });

  const nextBonus = getNextRevenueBonusTier(inputs.monthlyStudioRevenue, inputs.revenueBonusTiersAsOfPeriodEnd);

  // Confirmed Upcoming Revenue — booked sessions and open invoices this
  // month that haven't been collected yet. Sessions have no partial-amount
  // tracking beyond their status, so a PARTIAL session's full amount counts
  // as still-pending, same as UNPAID (matches the all-or-nothing PAID gate
  // used everywhere else in this engine).
  const unpaidSessionRevenue = Number(unpaidSessions._sum.amountBase ?? 0);
  const openInvoiceRevenue = openInvoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((s, p) => s + Number(p.amountBase ?? p.amount), 0);
    const total = Number(invoice.totalBase ?? invoice.total);
    return sum + Math.max(0, total - paid);
  }, 0);
  const confirmedUpcomingRevenue = unpaidSessionRevenue + openInvoiceRevenue;
  const projectedMonthEndRevenue = inputs.monthlyStudioRevenue + confirmedUpcomingRevenue;
  const projectedMonthEndBonus = calculateRevenueBonus(projectedMonthEndRevenue, inputs.revenueBonusTiersAsOfPeriodEnd);

  return {
    basePay,
    productionVariable,
    mixMasterVariable,
    timeBasedVariable: inputs.timeBasedVariable,
    acquisitionCommission,
    revenueBonus,
    total,
    monthlyStudioRevenue: inputs.monthlyStudioRevenue,
    deliveredSongCount: inputs.deliveredSongCount,
    deliveredMixMasterCount: inputs.deliveredMixMasterCount,
    nextBonus,
    confirmedUpcomingRevenue,
    projectedMonthEndRevenue,
    projectedMonthEndBonus,
  };
}
