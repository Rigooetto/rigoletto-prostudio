/**
 * Single source of truth for turning gather.ts's already-rate-resolved
 * inputs into the six compensation line items + total. Previously this
 * arithmetic was copy-pasted across generateCompensationPeriod,
 * getLiveCompensationForecast, and refreshDraftCompensationPeriod — three
 * places that could drift out of sync with each other. Pure/framework-free
 * like calculate.ts, so it's unit-testable without a database.
 *
 * gather.ts now does all the date-aware rate resolution itself (each
 * delivered track, payment, and payroll week priced at whatever rate was
 * effective when it happened) — the only thing left to resolve here is the
 * Revenue Bonus tier lookup, since gather.ts hands over the tier set already
 * filtered to "as of period end", not a monthly revenue number times a
 * config object.
 */
import { calculateRevenueBonus, calculateTotalCompensation, type RevenueBonusTierInput } from "./calculate";

export type CompensationBreakdown = {
  basePay: number;
  productionVariable: number;
  mixMasterVariable: number;
  timeBasedVariable: number;
  acquisitionCommission: number;
  revenueBonus: number;
  total: number;
};

export function computeCompensationBreakdown(params: {
  basePay: number;
  productionVariable: number;
  mixMasterVariable: number;
  timeBasedVariable: number;
  acquisitionCommission: number;
  monthlyStudioRevenue: number;
  revenueBonusTiers: RevenueBonusTierInput[];
  adjustments: number;
}): CompensationBreakdown {
  const revenueBonus = calculateRevenueBonus(params.monthlyStudioRevenue, params.revenueBonusTiers);

  const total = calculateTotalCompensation({
    basePay: params.basePay,
    productionVariable: params.productionVariable,
    mixMasterVariable: params.mixMasterVariable,
    timeBasedVariable: params.timeBasedVariable,
    acquisitionCommission: params.acquisitionCommission,
    revenueBonus,
    adjustments: params.adjustments,
  });

  return {
    basePay: params.basePay,
    productionVariable: params.productionVariable,
    mixMasterVariable: params.mixMasterVariable,
    timeBasedVariable: params.timeBasedVariable,
    acquisitionCommission: params.acquisitionCommission,
    revenueBonus,
    total,
  };
}
