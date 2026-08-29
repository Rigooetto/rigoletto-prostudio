import "server-only";
import { prisma } from "@/lib/db";
import { calculateBillableHours } from "@/lib/billable-hours";
import { getDailyStudioHours } from "@/lib/queries/dashboard";

function monthBounds(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59, 999);
  const weeksInMonth = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7);
  return { start, end, weeksInMonth };
}

async function getWeeklyAvailableHours() {
  const goal = await prisma.goal.findUnique({ where: { code: "WEEKLY_AVAILABLE_HOURS" } });
  return goal ? Number(goal.amount) : 40;
}

async function getMonthMetrics(start: Date, end: Date, weeksInMonth: number, weeklyAvailableHours: number) {
  const [sessionRevenue, invoiceRevenue, expenses, compensation, sessions, deliveredProjects, newLeads, wonLeads, campaigns, dailyStudioHours] =
    await Promise.all([
      prisma.session.aggregate({
        where: { paymentStatus: "PAID", startsAt: { gte: start, lte: end } },
        _sum: { amountBase: true },
      }),
      prisma.payment.aggregate({ where: { paidAt: { gte: start, lte: end } }, _sum: { amountBase: true } }),
      prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amountBase: true } }),
      prisma.compensationPeriod.aggregate({ where: { periodStart: start }, _sum: { total: true } }),
      // Overlap, not just startsAt within the month: catches sessions still
      // running into this month from a prior day.
      prisma.session.findMany({
        where: { startsAt: { lte: end }, endsAt: { gte: start } },
        select: { startsAt: true, endsAt: true },
      }),
      prisma.project.findMany({
        where: { finalDeliveredAt: { gte: start, lte: end } },
        select: { recordingStartedAt: true, finalDeliveredAt: true },
      }),
      prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.lead.count({ where: { stage: "WON", createdAt: { gte: start, lte: end } } }),
      prisma.campaign.aggregate({ where: { month: start }, _sum: { spendBase: true } }),
      getDailyStudioHours(),
    ]);

  const revenue = Number(sessionRevenue._sum.amountBase ?? 0) + Number(invoiceRevenue._sum.amountBase ?? 0);
  const expensesTotal = Number(expenses._sum.amountBase ?? 0);
  const billableHours = calculateBillableHours(sessions, dailyStudioHours, start, end);
  const availableHours = weeklyAvailableHours * weeksInMonth;
  const turnaroundSamples = deliveredProjects
    .filter((p) => p.recordingStartedAt)
    .map((p) => (p.finalDeliveredAt!.getTime() - p.recordingStartedAt!.getTime()) / (1000 * 60 * 60 * 24));
  const avgTurnaroundDays =
    turnaroundSamples.length > 0 ? turnaroundSamples.reduce((a, b) => a + b, 0) / turnaroundSamples.length : null;
  const marketingSpend = Number(campaigns._sum.spendBase ?? 0);

  return {
    month: start,
    revenue,
    expenses: expensesTotal,
    profit: revenue - expensesTotal,
    compensationTotal: Number(compensation._sum.total ?? 0),
    billableHours: Math.round(billableHours * 10) / 10,
    availableHours: Math.round(availableHours),
    utilizationPct: availableHours > 0 ? Math.round((billableHours / availableHours) * 1000) / 10 : 0,
    projectsDelivered: deliveredProjects.length,
    avgTurnaroundDays: avgTurnaroundDays === null ? null : Math.round(avgTurnaroundDays * 10) / 10,
    newLeads,
    wonLeads,
    conversionRatePct: newLeads > 0 ? Math.round((wonLeads / newLeads) * 1000) / 10 : 0,
    marketingSpend,
  };
}

export async function getMonthlySeries(monthsBack = 6) {
  const weeklyAvailableHours = await getWeeklyAvailableHours();
  const months = Array.from({ length: monthsBack }, (_, i) => monthsBack - 1 - i);

  return Promise.all(
    months.map(async (monthsAgo) => {
      const { start, end, weeksInMonth } = monthBounds(monthsAgo);
      return getMonthMetrics(start, end, weeksInMonth, weeklyAvailableHours);
    })
  );
}
