import "server-only";
import { prisma } from "@/lib/db";

export async function listEmployees() {
  return prisma.employee.findMany({
    include: { role: true },
    orderBy: { fullName: "asc" },
  });
}

export async function listActiveEmployees() {
  return prisma.employee.findMany({
    where: { active: true },
    include: { role: true },
    orderBy: { fullName: "asc" },
  });
}

// Powers the Owner Dashboard's "keep track of his pay" section. Picks the
// first active Studio Manager — this app currently has exactly one (Turi).
export async function getPrimaryStudioManager() {
  return prisma.employee.findFirst({
    where: { active: true, role: { code: "STUDIO_MANAGER" } },
    orderBy: { createdAt: "asc" },
  });
}
