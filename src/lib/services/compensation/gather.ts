// No "server-only" guard here (unlike most files under lib/queries): this
// module is now shared business logic imported by both page queries and
// action files (via refresh.ts), and action files need to stay loadable by
// unit tests outside Next's bundler. It never gets near client code either
// way — `prisma` itself isn't browser-bundleable.
import { prisma } from "@/lib/db";
import { calculateProductionTierBonus, getPayrollMondaysInPeriod } from "./calculate";
import { resolveRateAsOf, resolveTierSetAsOf } from "./rates";

/**
 * Pulls the real inputs a compensation period's calculation needs out of the
 * database for one employee over one period, resolving every dollar amount
 * using whichever rate was actually in effect on the date the work
 * happened — never "whatever the rate table currently says". This is what
 * makes a rate change (Production Tiers, Revenue Bonus Tiers, a Service's
 * $/% rate, or an employee's base pay/commission) apply only to work from
 * that point forward: already-delivered tracks, already-collected payments,
 * and already-passed payroll weeks keep the rate that was live when they
 * happened, forever, regardless of what the rate table looks like later or
 * how many times this period gets regenerated.
 *
 * Kept separate from calculate.ts (which stays pure/framework-free) so the
 * marginal-tier arithmetic itself is unit-testable without a database, while
 * this file is the (untested-by-unit-test, integration-level) glue that
 * decides *what counts* and *which rate applies*.
 *
 * Attribution rule: production/mix-master/time-based variables are scoped to
 * work this employee personally led (Project.leadEngineerId) or was assigned
 * to (SessionEngineer) — not studio-wide. Revenue bonus is studio-wide by
 * design (spec: Turi's bonus is driven by total studio revenue, which is why
 * training a Junior Engineer benefits him even though their production
 * variable wouldn't).
 *
 * Revenue recognition: only actual dated payments count (spec §10) — for
 * Sessions that's SessionPayment.paidAt, for Invoices that's Payment.paidAt.
 * Neither key off the session's booking date or a manually-set status flag,
 * so a deposit collected in one month and a balance collected the next each
 * land in the period they were actually paid in, not wherever the booking
 * date happens to fall or whenever someone last hit "Generate/Recalculate."
 */
export async function gatherCompensationInputs(employeeId: string, periodStart: Date, periodEnd: Date) {
  const [
    deliveredProductionTracks,
    deliveredMixMasterTracks,
    timeBasedPayments,
    studioSessionPayments,
    studioInvoicePayments,
    acquisitionClients,
    allProductionTiers,
    allRevenueBonusTiers,
    allServiceCompensationRates,
    employeePayRateHistory,
  ] = await Promise.all([
    prisma.projectTrack.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: { gte: periodStart, lte: periodEnd },
        project: { leadEngineerId: employeeId, primaryService: { compensationType: "TIERED_PRODUCTION" } },
      },
      select: { deliveredAt: true },
    }),
    prisma.projectTrack.findMany({
      where: {
        status: "DELIVERED",
        deliveredAt: { gte: periodStart, lte: periodEnd },
        project: { leadEngineerId: employeeId, primaryService: { compensationType: "FIXED_AMOUNT" } },
      },
      select: { deliveredAt: true, project: { select: { primaryServiceId: true } } },
    }),
    prisma.sessionPayment.findMany({
      where: {
        paidAt: { gte: periodStart, lte: periodEnd },
        session: {
          service: { compensationType: "PERCENT_REVENUE" },
          engineers: { some: { employeeId } },
        },
      },
      select: { paidAt: true, amount: true, amountBase: true, session: { select: { serviceId: true } } },
    }),
    prisma.sessionPayment.aggregate({
      where: { paidAt: { gte: periodStart, lte: periodEnd } },
      _sum: { amountBase: true },
    }),
    // Larger engagements get formally invoiced instead of paid directly on
    // the session — that collected revenue must still count as studio
    // revenue (spec §10/§11), even though it can't be attributed to a
    // specific service-type variable without per-line-item invoice detail.
    prisma.payment.findMany({
      where: { paidAt: { gte: periodStart, lte: periodEnd } },
      select: { amount: true, amountBase: true },
    }),
    prisma.client.findMany({
      where: {
        originatedByEmployeeId: employeeId,
        firstVisitAt: { gte: periodStart, lte: periodEnd },
        leadSource: { eligibleForAcquisitionCommission: true },
      },
      select: {
        firstVisitAt: true,
        // Bounded to this period — a new client's FIRST order only. Once
        // firstVisitAt no longer falls inside a later period's range, this
        // client simply won't be picked up again, so recurring purchases
        // never generate a second acquisition commission.
        sessions: { select: { payments: { where: { paidAt: { gte: periodStart, lte: periodEnd } } } } },
        invoices: {
          select: { payments: { where: { paidAt: { gte: periodStart, lte: periodEnd } }, select: { amount: true, amountBase: true } } },
        },
      },
    }),
    prisma.productionTier.findMany(),
    prisma.revenueBonusTier.findMany(),
    prisma.serviceCompensationRate.findMany(),
    prisma.employeePayRate.findMany({ where: { employeeId } }),
  ]);

  // --- Production Variable: marginal bonus per track, priced at whatever
  // tier rate was active on THAT track's delivery date. Rank is by delivery
  // order (cumulative count), so track #13 this month is still "the 13th
  // song" regardless of which rate table version was active when it landed.
  const sortedProductionTracks = [...deliveredProductionTracks].sort(
    (a, b) => a.deliveredAt!.getTime() - b.deliveredAt!.getTime()
  );
  let productionVariable = 0;
  sortedProductionTracks.forEach((track, index) => {
    const rank = index + 1;
    const tiersAsOfTrack = resolveTierSetAsOf(allProductionTiers, track.deliveredAt!).map((t) => ({
      songsFrom: t.songsFrom,
      songsTo: t.songsTo,
      amountPerSong: Number(t.amountPerSong),
    }));
    const marginal =
      calculateProductionTierBonus(rank, tiersAsOfTrack) - calculateProductionTierBonus(rank - 1, tiersAsOfTrack);
    productionVariable += marginal;
  });

  // --- Mix/Master Variable: per delivered track, priced at that track's
  // project's service rate as of the track's delivery date.
  const mixMasterVariable = deliveredMixMasterTracks.reduce((sum, track) => {
    const rate = resolveRateAsOf(
      allServiceCompensationRates.filter((r) => r.serviceId === track.project.primaryServiceId),
      track.deliveredAt!
    );
    return sum + Number(rate?.compensationValue ?? 0);
  }, 0);

  // --- Time-Based Variable: per payment, priced at that session's service
  // percent-of-revenue rate as of the payment's date.
  const timeBasedRevenue = timeBasedPayments.reduce((sum, p) => sum + Number(p.amountBase ?? p.amount), 0);
  const timeBasedVariable = timeBasedPayments.reduce((sum, p) => {
    const rate = resolveRateAsOf(
      allServiceCompensationRates.filter((r) => r.serviceId === p.session.serviceId),
      p.paidAt
    );
    const pct = Number(rate?.compensationValue ?? 0);
    return sum + Number(p.amountBase ?? p.amount) * (pct / 100);
  }, 0);

  const invoiceRevenue = studioInvoicePayments.reduce((sum, p) => sum + Number(p.amountBase ?? p.amount), 0);

  // --- Base Pay: per payroll Monday, priced at whatever base pay was
  // effective on that specific Monday — a mid-month raise only applies to
  // the weeks from then on.
  const basePay = getPayrollMondaysInPeriod(periodStart, periodEnd).reduce((sum, monday) => {
    const rate = resolveRateAsOf(employeePayRateHistory, monday);
    return sum + Number(rate?.basePayWeekly ?? 0);
  }, 0);

  // --- New Client Acquisition Commission: per qualifying client, priced at
  // whatever commission % was effective on that client's first-visit date.
  const acquisitionCommission = acquisitionClients.reduce((sum, client) => {
    const sessionRevenue = client.sessions.reduce(
      (s, sess) => s + sess.payments.reduce((p, payment) => p + Number(payment.amountBase ?? payment.amount), 0),
      0
    );
    const clientInvoiceRevenue = client.invoices.reduce(
      (s, invoice) => s + invoice.payments.reduce((p, payment) => p + Number(payment.amountBase ?? payment.amount), 0),
      0
    );
    const clientRevenue = sessionRevenue + clientInvoiceRevenue;
    if (clientRevenue <= 0 || !client.firstVisitAt) return sum;
    const rate = resolveRateAsOf(employeePayRateHistory, client.firstVisitAt);
    const pct = Number(rate?.acquisitionCommissionPercent ?? 10);
    return sum + clientRevenue * (pct / 100);
  }, 0);

  // --- Revenue Bonus: evaluated once per month (not per-transaction), so
  // "the rate" is whichever tier table version was active at period end —
  // for a past/closed month that's frozen in history; for the current
  // ongoing month it naturally resolves to whatever's active right now.
  const revenueBonusTiersAsOfPeriodEnd = resolveTierSetAsOf(allRevenueBonusTiers, periodEnd).map((t) => ({
    revenueFrom: Number(t.revenueFrom),
    revenueTo: t.revenueTo === null ? null : Number(t.revenueTo),
    bonusAmount: Number(t.bonusAmount),
  }));

  return {
    deliveredSongCount: deliveredProductionTracks.length,
    deliveredMixMasterCount: deliveredMixMasterTracks.length,
    basePay,
    productionVariable,
    mixMasterVariable,
    timeBasedRevenue,
    timeBasedVariable,
    acquisitionCommission,
    monthlyStudioRevenue: Number(studioSessionPayments._sum.amountBase ?? 0) + invoiceRevenue,
    revenueBonusTiersAsOfPeriodEnd,
  };
}
