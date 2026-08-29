import "server-only";
import { prisma } from "@/lib/db";
import { startOfMonth } from "@/lib/dates";

export async function getCurrentMonthCloseStatus() {
  const month = startOfMonth();
  return prisma.monthlyClose.findUnique({ where: { month }, include: { closedByEmployee: true } });
}

export async function listClosedMonths() {
  return prisma.monthlyClose.findMany({
    include: { closedByEmployee: true },
    orderBy: { month: "desc" },
    take: 12,
  });
}
