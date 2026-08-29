import { describe, it, expect } from "vitest";
import {
  calculateProductionTierBonus,
  calculateRevenueBonus,
  calculateMixMasterVariable,
  calculateTimeBasedVariable,
  calculateAcquisitionCommission,
  calculateTotalCompensation,
  getNextRevenueBonusTier,
  countPayrollWeeksInPeriod,
  type ProductionTierInput,
  type RevenueBonusTierInput,
} from "@/lib/services/compensation/calculate";

// Derives "the Monday on/before this date" without hardcoding any specific
// calendar year's weekday facts, so these tests stay correct forever.
function mostRecentMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// The exact tiers from the business spec — every test below is anchored to
// these real-world numbers, not arbitrary fixtures.
const productionTiers: ProductionTierInput[] = [
  { songsFrom: 1, songsTo: 10, amountPerSong: 0 },
  { songsFrom: 11, songsTo: 15, amountPerSong: 50 },
  { songsFrom: 16, songsTo: 20, amountPerSong: 75 },
  { songsFrom: 21, songsTo: 25, amountPerSong: 100 },
  { songsFrom: 26, songsTo: null, amountPerSong: 125 },
];

const revenueBonusTiers: RevenueBonusTierInput[] = [
  { revenueFrom: 0, revenueTo: 5999.99, bonusAmount: 0 },
  { revenueFrom: 6000, revenueTo: 7499.99, bonusAmount: 150 },
  { revenueFrom: 7500, revenueTo: 8499.99, bonusAmount: 250 },
  { revenueFrom: 8500, revenueTo: 9999.99, bonusAmount: 400 },
  { revenueFrom: 10000, revenueTo: 11999.99, bonusAmount: 600 },
  { revenueFrom: 12000, revenueTo: 14999.99, bonusAmount: 800 },
  { revenueFrom: 15000, revenueTo: null, bonusAmount: 1000 },
];

describe("calculateProductionTierBonus", () => {
  it("pays $0 for 0 songs", () => {
    expect(calculateProductionTierBonus(0, productionTiers)).toBe(0);
  });

  it("pays $0 for songs 1-10 (base tier, included in weekly pay)", () => {
    expect(calculateProductionTierBonus(1, productionTiers)).toBe(0);
    expect(calculateProductionTierBonus(10, productionTiers)).toBe(0);
  });

  it("pays $50/song starting exactly at song 11", () => {
    expect(calculateProductionTierBonus(11, productionTiers)).toBe(50);
  });

  it("matches the spec's worked example: 12 songs -> $100", () => {
    expect(calculateProductionTierBonus(12, productionTiers)).toBe(100);
  });

  it("caps the 11-15 band at song 15 ($250) before the 16-20 band kicks in", () => {
    expect(calculateProductionTierBonus(15, productionTiers)).toBe(250);
    expect(calculateProductionTierBonus(16, productionTiers)).toBe(250 + 75);
  });

  it("caps the 16-20 band at song 20 ($625) before the 21-25 band kicks in", () => {
    expect(calculateProductionTierBonus(20, productionTiers)).toBe(625);
    expect(calculateProductionTierBonus(21, productionTiers)).toBe(625 + 100);
  });

  it("caps the 21-25 band at song 25 ($1125) before the 26+ band kicks in", () => {
    expect(calculateProductionTierBonus(25, productionTiers)).toBe(1125);
    expect(calculateProductionTierBonus(26, productionTiers)).toBe(1125 + 125);
  });

  it("keeps accruing $125/song indefinitely past 26", () => {
    expect(calculateProductionTierBonus(30, productionTiers)).toBe(1125 + 5 * 125);
  });

  it("treats negative input as zero songs", () => {
    expect(calculateProductionTierBonus(-3, productionTiers)).toBe(0);
  });
});

describe("calculateRevenueBonus", () => {
  it("pays $0 under $6,000", () => {
    expect(calculateRevenueBonus(0, revenueBonusTiers)).toBe(0);
    expect(calculateRevenueBonus(5999.99, revenueBonusTiers)).toBe(0);
  });

  it("crosses into $150 exactly at $6,000 and stays there up to $7,499.99", () => {
    expect(calculateRevenueBonus(6000, revenueBonusTiers)).toBe(150);
    expect(calculateRevenueBonus(7499.99, revenueBonusTiers)).toBe(150);
  });

  it("crosses into $250 exactly at $7,500", () => {
    expect(calculateRevenueBonus(7500, revenueBonusTiers)).toBe(250);
  });

  it("matches the spec's worked example: $7,800 -> $250", () => {
    expect(calculateRevenueBonus(7800, revenueBonusTiers)).toBe(250);
  });

  it("crosses into $400 exactly at $8,500", () => {
    expect(calculateRevenueBonus(8500, revenueBonusTiers)).toBe(400);
  });

  it("crosses into $600 exactly at $10,000", () => {
    expect(calculateRevenueBonus(10000, revenueBonusTiers)).toBe(600);
  });

  it("crosses into $800 exactly at $12,000", () => {
    expect(calculateRevenueBonus(12000, revenueBonusTiers)).toBe(800);
  });

  it("crosses into the flat $1,000 top tier exactly at $15,000 and stays flat beyond it", () => {
    expect(calculateRevenueBonus(15000, revenueBonusTiers)).toBe(1000);
    expect(calculateRevenueBonus(50000, revenueBonusTiers)).toBe(1000);
  });

  it("returns 0 when tiers are empty (misconfiguration, not a crash)", () => {
    expect(calculateRevenueBonus(9000, [])).toBe(0);
  });
});

describe("calculateMixMasterVariable", () => {
  it("pays $25 per delivered Mix & Master (spec default)", () => {
    expect(calculateMixMasterVariable(4, 25)).toBe(100);
  });

  it("pays $0 for zero delivered", () => {
    expect(calculateMixMasterVariable(0, 25)).toBe(0);
  });
});

describe("calculateTimeBasedVariable", () => {
  it("pays 10% of revenue by default", () => {
    expect(calculateTimeBasedVariable(350, 10)).toBe(35);
  });

  it("matches the spec's worked example: $800 tracking revenue -> $80", () => {
    expect(calculateTimeBasedVariable(800, 10)).toBe(80);
  });
});

describe("calculateAcquisitionCommission", () => {
  it("pays 10% of the first order when the lead source is eligible", () => {
    expect(calculateAcquisitionCommission(500, 10, true)).toBe(50);
  });

  it("pays $0 when the lead source is not eligible (e.g. Meta Ads)", () => {
    expect(calculateAcquisitionCommission(500, 10, false)).toBe(0);
  });
});

describe("calculateTotalCompensation", () => {
  it("matches the spec's full worked example: $1,930 total", () => {
    const total = calculateTotalCompensation({
      basePay: 1200,
      productionVariable: 100,
      mixMasterVariable: 100,
      timeBasedVariable: 140 + 80 + 60, // recording day + tracking + live
      acquisitionCommission: 0,
      revenueBonus: 250,
      adjustments: 0,
    });
    expect(total).toBe(1930);
  });

  it("adjustments can be negative (Admin correction)", () => {
    const total = calculateTotalCompensation({
      basePay: 1200,
      productionVariable: 0,
      mixMasterVariable: 0,
      timeBasedVariable: 0,
      acquisitionCommission: 0,
      revenueBonus: 0,
      adjustments: -50,
    });
    expect(total).toBe(1150);
  });
});

describe("getNextRevenueBonusTier", () => {
  it("matches the spec's worked forecast: $7,800 -> $700 needed for +$150", () => {
    const forecast = getNextRevenueBonusTier(7800, revenueBonusTiers);
    expect(forecast).not.toBeNull();
    expect(forecast!.nextTier.bonusAmount).toBe(400);
    expect(forecast!.revenueNeeded).toBeCloseTo(700, 2);
    expect(forecast!.additionalBonus).toBe(150);
  });

  it("returns null once in the top tier — nothing further to unlock", () => {
    expect(getNextRevenueBonusTier(20000, revenueBonusTiers)).toBeNull();
  });

  it("reports the full next-tier gap from zero revenue", () => {
    const forecast = getNextRevenueBonusTier(0, revenueBonusTiers);
    expect(forecast!.revenueNeeded).toBeCloseTo(6000, 2);
    expect(forecast!.additionalBonus).toBe(150);
  });
});

describe("countPayrollWeeksInPeriod", () => {
  it("counts a single Monday-start week as 1", () => {
    const monday = mostRecentMonday(new Date());
    const sunday = addDays(monday, 6);
    expect(countPayrollWeeksInPeriod(monday, endOfDay(sunday))).toBe(1);
  });

  it("counts 4 full weeks as 4 — the common case", () => {
    const monday = mostRecentMonday(new Date());
    const end = endOfDay(addDays(monday, 27)); // 4 weeks, stops one day short of the 5th Monday
    expect(countPayrollWeeksInPeriod(monday, end)).toBe(4);
  });

  it("counts 5 Mondays when the period spans a 5th one — the case the old hardcoded '4' always missed", () => {
    // Mirrors the real Aug 2026 case: Aug 31 is a Monday, but Tue-Sun of
    // that week actually falls in September. Real weekly pay is attributed
    // to whichever period the week *starts* in, so it still counts as a
    // full week of this period, not just the 4 fully-contained weeks.
    const monday = mostRecentMonday(new Date());
    const end = endOfDay(addDays(monday, 28)); // the 5th Monday, not its Sunday
    expect(countPayrollWeeksInPeriod(monday, end)).toBe(5);
  });

  it("still finds the Monday even when the period starts mid-week", () => {
    const monday = mostRecentMonday(new Date());
    const wednesday = addDays(monday, 2);
    const nextTuesday = addDays(monday, 8); // one full week later, still mid-week
    expect(countPayrollWeeksInPeriod(wednesday, endOfDay(nextTuesday))).toBe(1);
  });

  it("returns 0 for a period with no Monday in it", () => {
    const monday = mostRecentMonday(new Date());
    const tuesday = addDays(monday, 1);
    const thursday = addDays(monday, 3);
    expect(countPayrollWeeksInPeriod(tuesday, endOfDay(thursday))).toBe(0);
  });
});
