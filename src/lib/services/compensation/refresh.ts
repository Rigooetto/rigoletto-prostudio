import { prisma } from "@/lib/db";
import { gatherCompensationInputs } from "./gather";
import { computeCompensationBreakdown } from "./breakdown";

function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
}

function monthBoundsFor(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Keeps an already-generated compensation period in sync with reality
 * whenever something that feeds its numbers changes elsewhere in the app —
 * a payment recorded or refunded, a session or project deleted, a track
 * delivered or reverted. Without this, "sections don't talk to each other":
 * you'd fix a mistake in Sessions or Projects and Turi's already-generated
 * period would silently keep showing the old numbers until someone
 * remembered to click Generate/Recalculate.
 *
 * Deliberately narrow: does nothing if no period has been generated yet for
 * that employee/month (nothing to keep in sync — the live forecast already
 * covers that case), and does nothing if the period is APPROVED or PAID
 * (those are locked financial records; only an explicit admin action may
 * touch them).
 */
export async function refreshDraftCompensationPeriod(employeeId: string, forDate: Date) {
  const { start, end } = monthBoundsFor(forDate);
  const periodStartDate = toDateOnly(start);
  const periodEndDate = toDateOnly(end);

  const existing = await prisma.compensationPeriod.findUnique({
    where: { employeeId_periodStart: { employeeId, periodStart: periodStartDate } },
  });
  if (!existing || existing.status !== "DRAFT") return;

  const inputs = await gatherCompensationInputs(employeeId, start, end);

  const { basePay, productionVariable, mixMasterVariable, acquisitionCommission, revenueBonus, total } =
    computeCompensationBreakdown({
      basePay: inputs.basePay,
      productionVariable: inputs.productionVariable,
      mixMasterVariable: inputs.mixMasterVariable,
      timeBasedVariable: inputs.timeBasedVariable,
      acquisitionCommission: inputs.acquisitionCommission,
      monthlyStudioRevenue: inputs.monthlyStudioRevenue,
      revenueBonusTiers: inputs.revenueBonusTiersAsOfPeriodEnd,
      adjustments: Number(existing.adjustments),
    });

  await prisma.compensationPeriod.update({
    where: { id: existing.id },
    data: {
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
    },
  });
}

/** Refreshes for every employee in the list, each against their own month. Failures are isolated per-employee. */
export async function refreshDraftCompensationPeriods(employeeIds: string[], forDate: Date) {
  const unique = [...new Set(employeeIds)];
  await Promise.all(unique.map((id) => refreshDraftCompensationPeriod(id, forDate).catch(() => {})));
}
