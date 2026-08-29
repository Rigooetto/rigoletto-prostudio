import { describe, it, expect } from "vitest";
import { computeCompensationBreakdown } from "@/lib/services/compensation/breakdown";

const revenueBonusTiers = [
  { revenueFrom: 0, revenueTo: 5999.99, bonusAmount: 0 },
  { revenueFrom: 6000, revenueTo: 7499.99, bonusAmount: 150 },
];

function baseParams(overrides: Partial<Parameters<typeof computeCompensationBreakdown>[0]> = {}) {
  return {
    basePay: 1500,
    productionVariable: 0,
    mixMasterVariable: 0,
    timeBasedVariable: 0,
    acquisitionCommission: 0,
    monthlyStudioRevenue: 0,
    revenueBonusTiers,
    adjustments: 0,
    ...overrides,
  };
}

describe("computeCompensationBreakdown", () => {
  it("passes already-resolved line items straight through unchanged", () => {
    const result = computeCompensationBreakdown(
      baseParams({ basePay: 1500, productionVariable: 100, mixMasterVariable: 50, timeBasedVariable: 105, acquisitionCommission: 100 })
    );
    expect(result.basePay).toBe(1500);
    expect(result.productionVariable).toBe(100);
    expect(result.mixMasterVariable).toBe(50);
    expect(result.timeBasedVariable).toBe(105);
    expect(result.acquisitionCommission).toBe(100);
  });

  it("applies the flat (non-marginal) revenue bonus tier for the given monthly revenue", () => {
    const result = computeCompensationBreakdown(baseParams({ monthlyStudioRevenue: 6500 }));
    expect(result.revenueBonus).toBe(150);
  });

  it("falls back to 0 revenue bonus when revenue matches no tier", () => {
    const result = computeCompensationBreakdown(baseParams({ monthlyStudioRevenue: 6500, revenueBonusTiers: [] }));
    expect(result.revenueBonus).toBe(0);
  });

  it("rolls every line item plus adjustments into the total", () => {
    const result = computeCompensationBreakdown(
      baseParams({
        basePay: 1500,
        productionVariable: 100,
        mixMasterVariable: 50,
        timeBasedVariable: 105,
        acquisitionCommission: 100,
        monthlyStudioRevenue: 6500,
        adjustments: -50,
      })
    );
    // basePay 1500 + production 100 + mixMaster 50 + timeBased 105 + acquisition 100 + revenueBonus 150 - 50
    expect(result.total).toBe(1500 + 100 + 50 + 105 + 100 + 150 - 50);
  });
});
