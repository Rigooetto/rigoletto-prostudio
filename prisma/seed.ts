import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { code: "ADMIN" },
    update: {},
    create: {
      code: "ADMIN",
      label: "Owner / Admin",
      description: "Full access to all studio operations and financials.",
      isConfidentialFinancials: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { code: "STUDIO_MANAGER" },
    update: {},
    create: {
      code: "STUDIO_MANAGER",
      label: "Studio Manager & Lead Engineer",
      description: "Runs day-to-day studio operations; sees all sessions, clients, and his own compensation progress.",
      isConfidentialFinancials: false,
    },
  });

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const turiPassword = process.env.SEED_TURI_PASSWORD ?? "ChangeMe123!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const turiPasswordHash = await bcrypt.hash(turiPassword, 10);

  await prisma.employee.upsert({
    where: { email: "admin@rigolettoprostudio.com" },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: "admin@rigolettoprostudio.com",
      passwordHash: adminPasswordHash,
      roleId: adminRole.id,
      fullName: "Owner",
      displayName: "Owner",
      active: true,
    },
  });

  const turi = await prisma.employee.upsert({
    where: { email: "turi@rigolettoprostudio.com" },
    update: { passwordHash: turiPasswordHash },
    create: {
      email: "turi@rigolettoprostudio.com",
      passwordHash: turiPasswordHash,
      roleId: managerRole.id,
      fullName: "Turi",
      displayName: "Turi",
      active: true,
      basePayWeekly: 300,
      acquisitionCommissionPercent: 10,
    },
  });

  // Employee.basePayWeekly/acquisitionCommissionPercent above are just a
  // denormalized "current value" for display — the compensation engine
  // (gather.ts) reads exclusively from this effective-dated history table,
  // which normally only gets a row via Settings > Compensation Tiers.
  // Without one, Turi's base pay always resolves to $0 no matter what.
  const hasActiveTuriRate = await prisma.employeePayRate.findFirst({ where: { employeeId: turi.id, effectiveTo: null } });
  if (!hasActiveTuriRate) {
    await prisma.employeePayRate.create({
      data: { employeeId: turi.id, basePayWeekly: 300, acquisitionCommissionPercent: 10, effectiveFrom: turi.createdAt },
    });
  }

  const leadSources: Array<{
    code: string;
    label: string;
    isMarketingChannel: boolean;
    eligibleForAcquisitionCommission: boolean;
    sortOrder: number;
  }> = [
    { code: "META_ADS", label: "Meta Ads", isMarketingChannel: true, eligibleForAcquisitionCommission: false, sortOrder: 1 },
    { code: "INSTAGRAM", label: "Instagram", isMarketingChannel: true, eligibleForAcquisitionCommission: false, sortOrder: 2 },
    { code: "FACEBOOK", label: "Facebook", isMarketingChannel: true, eligibleForAcquisitionCommission: false, sortOrder: 3 },
    { code: "GOOGLE", label: "Google", isMarketingChannel: true, eligibleForAcquisitionCommission: false, sortOrder: 4 },
    { code: "OWNER", label: "Owner", isMarketingChannel: false, eligibleForAcquisitionCommission: false, sortOrder: 5 },
    { code: "TURI", label: "Turi (personally originated)", isMarketingChannel: false, eligibleForAcquisitionCommission: true, sortOrder: 6 },
    { code: "REFERRAL", label: "Referral", isMarketingChannel: false, eligibleForAcquisitionCommission: false, sortOrder: 7 },
    { code: "EXISTING_CLIENT", label: "Existing Client", isMarketingChannel: false, eligibleForAcquisitionCommission: false, sortOrder: 8 },
    { code: "AFINARTE", label: "Afinarte", isMarketingChannel: false, eligibleForAcquisitionCommission: false, sortOrder: 9 },
    { code: "WALK_IN", label: "Walk In", isMarketingChannel: false, eligibleForAcquisitionCommission: true, sortOrder: 10 },
    { code: "OTHER", label: "Other", isMarketingChannel: false, eligibleForAcquisitionCommission: false, sortOrder: 11 },
  ];

  for (const source of leadSources) {
    await prisma.leadSource.upsert({
      where: { code: source.code },
      update: {},
      create: source,
    });
  }

  const services: Array<{
    serviceName: string;
    serviceCategory: string;
    billingType: "PER_SONG" | "PER_HOUR" | "PER_DAY" | "FIXED_PROJECT" | "CUSTOM";
    defaultPrice: number;
    defaultDurationMinutes: number | null;
    compensationType: "NONE" | "FIXED_AMOUNT" | "PERCENT_REVENUE" | "TIERED_PRODUCTION" | "CUSTOM";
    compensationValue: number | null;
    sortOrder: number;
  }> = [
    {
      serviceName: "Full Production",
      serviceCategory: "Production",
      billingType: "PER_SONG",
      defaultPrice: 350,
      defaultDurationMinutes: null,
      compensationType: "TIERED_PRODUCTION",
      compensationValue: null,
      sortOrder: 1,
    },
    {
      serviceName: "Mix & Master",
      serviceCategory: "Production",
      billingType: "PER_SONG",
      defaultPrice: 200,
      defaultDurationMinutes: null,
      compensationType: "FIXED_AMOUNT",
      compensationValue: 25,
      sortOrder: 2,
    },
    {
      serviceName: "Full Recording Day",
      serviceCategory: "Recording",
      billingType: "PER_DAY",
      defaultPrice: 350,
      defaultDurationMinutes: 8 * 60,
      compensationType: "PERCENT_REVENUE",
      compensationValue: 10,
      sortOrder: 3,
    },
    {
      serviceName: "Tracking / Overdub Session",
      serviceCategory: "Recording",
      billingType: "PER_HOUR",
      defaultPrice: 50,
      defaultDurationMinutes: 60,
      compensationType: "PERCENT_REVENUE",
      compensationValue: 10,
      sortOrder: 4,
    },
    {
      serviceName: "Live Session / Full Band Recording",
      serviceCategory: "Recording",
      billingType: "PER_HOUR",
      defaultPrice: 75,
      defaultDurationMinutes: 60,
      compensationType: "PERCENT_REVENUE",
      compensationValue: 10,
      sortOrder: 5,
    },
  ];

  for (const service of services) {
    const existing = await prisma.service.findFirst({ where: { serviceName: service.serviceName } });
    const record = existing ?? (await prisma.service.create({ data: service }));

    // Service.compensationValue above is just a denormalized "current value"
    // for display — the compensation engine (gather.ts) reads FIXED_AMOUNT
    // and PERCENT_REVENUE rates exclusively from this history table (not
    // used by TIERED_PRODUCTION, which prices off ProductionTier instead).
    // Without a row here, Mix/Master and revenue-percent variables always
    // resolve to $0 no matter how much work gets delivered/paid.
    if (record.compensationValue !== null && (service.compensationType === "FIXED_AMOUNT" || service.compensationType === "PERCENT_REVENUE")) {
      const hasActiveRate = await prisma.serviceCompensationRate.findFirst({ where: { serviceId: record.id, effectiveTo: null } });
      if (!hasActiveRate) {
        await prisma.serviceCompensationRate.create({
          data: { serviceId: record.id, compensationValue: record.compensationValue, effectiveFrom: record.createdAt },
        });
      }
    }
  }

  const goals: Array<{ code: string; label: string; amount: number }> = [
    { code: "MONTHLY_OPERATING", label: "Monthly Operating Goal", amount: 10000 },
    { code: "MONTHLY_STRETCH", label: "Monthly Stretch Goal", amount: 12000 },
    { code: "LONG_TERM_MONTHLY", label: "Long-Term Monthly Goal", amount: 15000 },
    { code: "ANNUAL", label: "Annual Goal", amount: 100000 },
    // Not a revenue goal — reuses this config table's shape for a single
    // studio-capacity number (spec's utilization formula denominator).
    { code: "WEEKLY_AVAILABLE_HOURS", label: "Weekly Available Studio Hours", amount: 40 },
    // Fixed hours credited per calendar day for multi-day sessions, which store
    // one startsAt/endsAt pair spanning several days with no per-day breakdown.
    { code: "DAILY_STUDIO_HOURS", label: "Daily Studio Hours (multi-day sessions)", amount: 8 },
  ];

  for (const goal of goals) {
    await prisma.goal.upsert({
      where: { code: goal.code },
      update: {},
      create: goal,
    });
  }

  const productionTiers: Array<{ songsFrom: number; songsTo: number | null; amountPerSong: number; sortOrder: number }> = [
    { songsFrom: 1, songsTo: 10, amountPerSong: 0, sortOrder: 1 },
    { songsFrom: 11, songsTo: 15, amountPerSong: 50, sortOrder: 2 },
    { songsFrom: 16, songsTo: 20, amountPerSong: 75, sortOrder: 3 },
    { songsFrom: 21, songsTo: 25, amountPerSong: 100, sortOrder: 4 },
    { songsFrom: 26, songsTo: null, amountPerSong: 125, sortOrder: 5 },
  ];
  for (const tier of productionTiers) {
    const existing = await prisma.productionTier.findFirst({ where: { songsFrom: tier.songsFrom } });
    if (!existing) await prisma.productionTier.create({ data: tier });
  }

  const revenueBonusTiers: Array<{ revenueFrom: number; revenueTo: number | null; bonusAmount: number; sortOrder: number }> = [
    { revenueFrom: 0, revenueTo: 5999.99, bonusAmount: 0, sortOrder: 1 },
    { revenueFrom: 6000, revenueTo: 7499.99, bonusAmount: 150, sortOrder: 2 },
    { revenueFrom: 7500, revenueTo: 8499.99, bonusAmount: 250, sortOrder: 3 },
    { revenueFrom: 8500, revenueTo: 9999.99, bonusAmount: 400, sortOrder: 4 },
    { revenueFrom: 10000, revenueTo: 11999.99, bonusAmount: 600, sortOrder: 5 },
    { revenueFrom: 12000, revenueTo: 14999.99, bonusAmount: 800, sortOrder: 6 },
    { revenueFrom: 15000, revenueTo: null, bonusAmount: 1000, sortOrder: 7 },
  ];
  for (const tier of revenueBonusTiers) {
    const existing = await prisma.revenueBonusTier.findFirst({ where: { revenueFrom: tier.revenueFrom } });
    if (!existing) await prisma.revenueBonusTier.create({ data: tier });
  }

  console.log("Seed complete.");
  console.log(`Admin login: admin@rigolettoprostudio.com / ${adminPassword}`);
  console.log(`Turi login:  turi@rigolettoprostudio.com / ${turiPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
