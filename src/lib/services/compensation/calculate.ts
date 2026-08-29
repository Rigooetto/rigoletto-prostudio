/**
 * Pure compensation calculation functions — no Prisma, no Next.js, no I/O.
 * Every function takes plain numbers/objects and returns a number, so it can
 * be unit-tested in isolation (see tests/unit/services/compensation) and
 * reused by both the period-generation Server Action and any future
 * forecasting UI without duplicating the arithmetic.
 *
 * Tier thresholds are never hardcoded here — callers pass in the current
 * ProductionTier/RevenueBonusTier rows from the database.
 */

export type ProductionTierInput = {
  songsFrom: number;
  songsTo: number | null;
  amountPerSong: number;
};

export type RevenueBonusTierInput = {
  revenueFrom: number;
  revenueTo: number | null;
  bonusAmount: number;
};

/**
 * Marginal (tax-bracket-style) calculation: each tier only pays out for the
 * songs that actually fall within its range. E.g. with the default tiers,
 * 12 delivered songs = 2 songs in the 11-15 band = 2 * $50 = $100.
 */
export function calculateProductionTierBonus(deliveredSongCount: number, tiers: ProductionTierInput[]): number {
  if (deliveredSongCount <= 0) return 0;

  let total = 0;
  for (const tier of tiers) {
    const tierTo = tier.songsTo ?? Infinity;
    const overlapStart = Math.max(tier.songsFrom, 1);
    const overlapEnd = Math.min(tierTo, deliveredSongCount);
    if (overlapEnd >= overlapStart) {
      const songsInTier = overlapEnd - overlapStart + 1;
      total += songsInTier * tier.amountPerSong;
    }
  }
  return total;
}

/**
 * Flat bracket lookup (NOT marginal) — the spec's revenue bonus is a single
 * flat amount for whichever band the month's revenue falls into, not a sum
 * across bands. Returns 0 if no tier matches (e.g. tiers misconfigured).
 */
export function calculateRevenueBonus(monthlyRevenue: number, tiers: RevenueBonusTierInput[]): number {
  const tier = tiers.find(
    (t) => monthlyRevenue >= t.revenueFrom && (t.revenueTo === null || monthlyRevenue <= t.revenueTo)
  );
  return tier ? tier.bonusAmount : 0;
}

export function calculateMixMasterVariable(deliveredCount: number, perUnitAmount: number): number {
  return deliveredCount * perUnitAmount;
}

export function calculateTimeBasedVariable(revenue: number, percent: number): number {
  return revenue * (percent / 100);
}

export function calculateAcquisitionCommission(firstOrderRevenue: number, percent: number, eligible: boolean): number {
  return eligible ? firstOrderRevenue * (percent / 100) : 0;
}

export function calculateTotalCompensation(parts: {
  basePay: number;
  productionVariable: number;
  mixMasterVariable: number;
  timeBasedVariable: number;
  acquisitionCommission: number;
  revenueBonus: number;
  adjustments: number;
}): number {
  return (
    parts.basePay +
    parts.productionVariable +
    parts.mixMasterVariable +
    parts.timeBasedVariable +
    parts.acquisitionCommission +
    parts.revenueBonus +
    parts.adjustments
  );
}

export type NextBonusForecast = {
  nextTier: RevenueBonusTierInput;
  revenueNeeded: number;
  additionalBonus: number;
};

/**
 * Powers the "$X more revenue unlocks +$Y bonus" motivational UI (spec §39).
 * Returns null when already in the top tier — there's nothing further to unlock.
 */
export function getNextRevenueBonusTier(
  monthlyRevenue: number,
  tiers: RevenueBonusTierInput[]
): NextBonusForecast | null {
  const sorted = [...tiers].sort((a, b) => a.revenueFrom - b.revenueFrom);
  const currentTier = sorted.find(
    (t) => monthlyRevenue >= t.revenueFrom && (t.revenueTo === null || monthlyRevenue <= t.revenueTo)
  );
  const currentIndex = currentTier ? sorted.indexOf(currentTier) : -1;
  const nextTier = sorted[currentIndex + 1];
  if (!nextTier) return null;

  return {
    nextTier,
    revenueNeeded: Math.max(0, nextTier.revenueFrom - monthlyRevenue),
    additionalBonus: nextTier.bonusAmount - (currentTier?.bonusAmount ?? 0),
  };
}

/**
 * Counts actual Monday-start payroll weeks falling inside [periodStart,
 * periodEnd] (inclusive), rather than assuming every period is exactly 4
 * weeks. A calendar month usually contains 4 Mondays, but any month whose
 * 1st falls on a Mon/Tue/Wed/Thu can contain a 5th, and base pay must
 * reflect that — real weekly pay is attributed to whichever period a week
 * starts in, even if the rest of that week spills into the next month.
 */
export function countPayrollWeeksInPeriod(periodStart: Date, periodEnd: Date): number {
  let count = 0;
  const cursor = new Date(periodStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    if (cursor.getDay() === 1) count++; // 1 = Monday
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Same walk as countPayrollWeeksInPeriod, but returns the actual Monday
 * dates rather than just a count — needed so each week's base pay can be
 * resolved against whatever rate was effective on that specific Monday
 * (a mid-month raise only applies to the weeks from then on).
 */
export function getPayrollMondaysInPeriod(periodStart: Date, periodEnd: Date): Date[] {
  const mondays: Date[] = [];
  const cursor = new Date(periodStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    if (cursor.getDay() === 1) mondays.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return mondays;
}
