import "server-only";
import { prisma } from "@/lib/db";

export async function listLeadSources(options: { activeOnly?: boolean } = {}) {
  const { activeOnly = true } = options;
  return prisma.leadSource.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { sortOrder: "asc" },
  });
}
