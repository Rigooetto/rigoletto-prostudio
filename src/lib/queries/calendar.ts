import "server-only";
import { prisma } from "@/lib/db";

export async function getSessionsInRange(start: Date, end: Date) {
  // Overlap check, not a start-time-only check — a session that began before
  // `start` but is still ongoing (multi-day sessions) must still show up.
  return prisma.session.findMany({
    where: { startsAt: { lte: end }, endsAt: { gte: start } },
    include: { client: true, service: true, engineers: { include: { employee: true } } },
    orderBy: { startsAt: "asc" },
  });
}
