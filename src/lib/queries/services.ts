import "server-only";
import { prisma } from "@/lib/db";

export async function listServices(options: { activeOnly?: boolean } = {}) {
  const { activeOnly = false } = options;
  return prisma.service.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { sortOrder: "asc" },
  });
}
