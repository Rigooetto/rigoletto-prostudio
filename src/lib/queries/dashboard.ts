import "server-only";
import { prisma } from "@/lib/db";
import { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, startOfYear, daysFromNow } from "@/lib/dates";
import { calculateBillableHours } from "@/lib/billable-hours";
import type { ProjectStatus } from "@/generated/prisma/enums";

// Not a revenue goal — reuses the Goal table's shape for a single studio-capacity
// number (see WEEKLY_AVAILABLE_HOURS), per the schema's rule that thresholds are
// DB rows, never hardcoded.
export async function getDailyStudioHours() {
  const goal = await prisma.goal.findUnique({ where: { code: "DAILY_STUDIO_HOURS" } });
  return goal ? Number(goal.amount) : 8;
}

// invoiceId: null excludes sessions billed through an Invoice instead of
// paid on the spot — that revenue is counted once, via invoicePaymentsSince,
// not again here off the session's own (usually $0) amount.
async function paidRevenueSince(since: Date, until?: Date) {
  const result = await prisma.session.aggregate({
    where: {
      paymentStatus: "PAID",
      invoiceId: null,
      startsAt: until ? { gte: since, lte: until } : { gte: since },
    },
    _sum: { amountBase: true },
  });
  return Number(result._sum.amountBase ?? 0);
}

async function invoicePaymentsSince(since: Date, until?: Date) {
  const result = await prisma.payment.aggregate({
    where: { paidAt: until ? { gte: since, lte: until } : { gte: since } },
    _sum: { amountBase: true },
  });
  return Number(result._sum.amountBase ?? 0);
}

export async function getRevenueStats() {
  const [
    todaySessions,
    weekSessions,
    monthSessions,
    ytdSessions,
    todayInvoices,
    weekInvoices,
    monthInvoices,
    ytdInvoices,
  ] = await Promise.all([
    paidRevenueSince(startOfToday(), endOfToday()),
    paidRevenueSince(startOfWeek()),
    paidRevenueSince(startOfMonth()),
    paidRevenueSince(startOfYear()),
    invoicePaymentsSince(startOfToday(), endOfToday()),
    invoicePaymentsSince(startOfWeek()),
    invoicePaymentsSince(startOfMonth()),
    invoicePaymentsSince(startOfYear()),
  ]);
  return {
    today: todaySessions + todayInvoices,
    week: weekSessions + weekInvoices,
    month: monthSessions + monthInvoices,
    ytd: ytdSessions + ytdInvoices,
  };
}

export async function getGoals() {
  const goals = await prisma.goal.findMany({ where: { active: true } });
  const byCode = Object.fromEntries(goals.map((g) => [g.code, Number(g.amount)]));
  return {
    monthlyOperating: byCode.MONTHLY_OPERATING ?? 10000,
    monthlyStretch: byCode.MONTHLY_STRETCH ?? 12000,
    longTermMonthly: byCode.LONG_TERM_MONTHLY ?? 15000,
    annual: byCode.ANNUAL ?? 100000,
  };
}

export async function getProjectStatusCounts() {
  const counts = await prisma.project.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: { status: { notIn: ["DELIVERED", "PAID", "CANCELLED"] } },
  });
  return counts as { status: ProjectStatus; _count: { _all: number } }[];
}

export async function getActiveProjectCount() {
  return prisma.project.count({ where: { status: { notIn: ["DELIVERED", "PAID", "CANCELLED"] } } });
}

/**
 * A project is only "overdue" if its scheduled recording date has passed
 * AND no session has actually started yet. The Project.status dropdown is
 * manually set and easy to forget to advance mid-session, so a session that
 * has already begun is a more reliable "work is happening" signal than the
 * status field alone — otherwise a project sitting in an active multi-day
 * session shows up as overdue just because nobody flipped the status.
 */
export function overdueProjectsWhere() {
  return {
    status: { in: ["LEAD", "QUOTED", "BOOKED"] as ProjectStatus[] },
    scheduledRecordingAt: { lt: startOfToday() },
    sessions: { none: { startsAt: { lte: new Date() } } },
  };
}

export async function getOverdueProjects() {
  return prisma.project.findMany({
    where: overdueProjectsWhere(),
    include: { client: true },
    orderBy: { scheduledRecordingAt: "asc" },
    take: 10,
  });
}

export async function getTodaysSessions() {
  return prisma.session.findMany({
    where: { startsAt: { gte: startOfToday(), lte: endOfToday() } },
    include: { client: true, service: true, engineers: { include: { employee: true } } },
    orderBy: { startsAt: "asc" },
  });
}

export async function getUpcomingSessions(days = 14) {
  return prisma.session.findMany({
    where: { startsAt: { gte: startOfToday(), lte: daysFromNow(days) } },
    include: { client: true, service: true, engineers: { include: { employee: true } } },
    orderBy: { startsAt: "asc" },
    take: 20,
  });
}

export async function getWeekScorecard() {
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  const [sessions, dailyStudioHours, invoiceRevenue] = await Promise.all([
    prisma.session.findMany({
      // Overlap, not just startsAt >= weekStart: catches sessions still running
      // into this week and excludes sessions that only start in a future week.
      where: { startsAt: { lte: weekEnd }, endsAt: { gte: weekStart } },
      select: { startsAt: true, endsAt: true, amountBase: true, paymentStatus: true, invoiceId: true },
    }),
    getDailyStudioHours(),
    invoicePaymentsSince(weekStart, weekEnd),
  ]);

  const billableHours = calculateBillableHours(sessions, dailyStudioHours, weekStart, weekEnd);

  const revenue =
    sessions
      .filter((s) => s.paymentStatus === "PAID" && !s.invoiceId)
      .reduce((sum, s) => sum + Number(s.amountBase ?? 0), 0) + invoiceRevenue;

  const projectsDelivered = await prisma.project.count({
    where: { finalDeliveredAt: { gte: weekStart } },
  });

  return { revenue, billableHours: Math.round(billableHours * 10) / 10, projectsDelivered, sessionCount: sessions.length };
}

export async function getRecentClientsNeedingFollowUp() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  return prisma.client.findMany({
    where: { active: true, lastVisitAt: { lt: cutoff } },
    orderBy: { lastVisitAt: "asc" },
    take: 5,
  });
}
