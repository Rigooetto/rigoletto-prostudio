/**
 * Pure, framework-free helpers for picking "whichever rate was in effect on
 * date D" out of an already-fetched list of effective-dated rows. No DB
 * access here (like calculate.ts) — callers fetch the full history once,
 * then resolve per-item in memory, avoiding an N+1 query per track/payment.
 */

export type EffectiveDated = { effectiveFrom: Date; effectiveTo: Date | null };

function isActiveAt<T extends EffectiveDated>(row: T, date: Date): boolean {
  return row.effectiveFrom <= date && (row.effectiveTo === null || date < row.effectiveTo);
}

/** Single-row lookup (Service/Employee rate history — one active row at a time per entity). */
export function resolveRateAsOf<T extends EffectiveDated>(rows: T[], date: Date): T | undefined {
  // Multiple rows could technically match at an exact boundary instant; the
  // most-recently-started one wins.
  return rows.filter((r) => isActiveAt(r, date)).sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
}

/** Whole-set lookup (Production/Revenue Bonus Tiers — a full bracket table active at once). */
export function resolveTierSetAsOf<T extends EffectiveDated & { sortOrder: number }>(rows: T[], date: Date): T[] {
  return rows.filter((r) => isActiveAt(r, date)).sort((a, b) => a.sortOrder - b.sortOrder);
}
