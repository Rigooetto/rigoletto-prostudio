import "server-only";
import { prisma } from "@/lib/db";

export async function listSessions() {
  return prisma.session.findMany({
    include: {
      client: true,
      artist: true,
      service: true,
      project: { select: { id: true, title: true } },
      engineers: { include: { employee: true } },
    },
    orderBy: { startsAt: "desc" },
  });
}

export async function listUpcomingSessions(days = 7) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return prisma.session.findMany({
    where: { startsAt: { gte: now, lte: end } },
    include: { client: true, service: true, engineers: { include: { employee: true } } },
    orderBy: { startsAt: "asc" },
  });
}

export async function getSessionDetail(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      client: true,
      artist: true,
      service: true,
      project: { select: { id: true, title: true } },
      engineers: { include: { employee: true } },
      createdByEmployee: true,
      payments: { include: { recordedByEmployee: true }, orderBy: { paidAt: "desc" } },
    },
  });
  if (!session) return null;

  const paidAmount = session.payments.reduce((sum, p) => sum + Number(p.amountBase ?? p.amount), 0);
  return { ...session, paidAmount, balance: Number(session.amountBase ?? session.amount) - paidAmount };
}
