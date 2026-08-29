import "server-only";
import { prisma } from "@/lib/db";

export async function listAuditLogEntries(take = 100) {
  return prisma.auditLog.findMany({
    include: { employee: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}
