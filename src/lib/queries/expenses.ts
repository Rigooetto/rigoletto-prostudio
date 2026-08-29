import "server-only";
import { prisma } from "@/lib/db";

export async function listExpenses() {
  return prisma.expense.findMany({
    include: { createdByEmployee: true },
    orderBy: { date: "desc" },
  });
}

export async function getExpenseTotals(since: Date, until?: Date) {
  const result = await prisma.expense.aggregate({
    where: { date: until ? { gte: since, lte: until } : { gte: since } },
    _sum: { amountBase: true },
  });
  return Number(result._sum.amountBase ?? 0);
}

export async function getExpenseTotalsByCategory(since: Date, until?: Date) {
  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: { date: until ? { gte: since, lte: until } : { gte: since } },
    _sum: { amountBase: true },
  });
  return rows.map((r) => ({ category: r.category, total: Number(r._sum.amountBase ?? 0) }));
}
