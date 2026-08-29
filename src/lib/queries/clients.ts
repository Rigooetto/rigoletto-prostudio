import "server-only";
import { prisma } from "@/lib/db";

export async function listClients() {
  const clients = await prisma.client.findMany({
    where: { active: true },
    include: {
      leadSource: true,
      _count: { select: { projects: true, sessions: true } },
      sessions: { where: { paymentStatus: "PAID" }, select: { amountBase: true, amount: true } },
    },
    orderBy: { displayName: "asc" },
  });

  return clients.map((client) => {
    const lifetimeRevenue = client.sessions.reduce(
      (sum, s) => sum + Number(s.amountBase ?? s.amount),
      0
    );
    return {
      id: client.id,
      displayName: client.displayName,
      contactName: client.contactName,
      phone: client.phone,
      email: client.email,
      leadSource: client.leadSource,
      lastVisitAt: client.lastVisitAt,
      projectCount: client._count.projects,
      sessionCount: client._count.sessions,
      lifetimeRevenue,
    };
  });
}

export async function listAllArtists() {
  return prisma.artist.findMany({
    include: { client: { select: { displayName: true } } },
    orderBy: { stageName: "asc" },
  });
}

export async function getClientDetail(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      leadSource: true,
      originatedByEmployee: true,
      artists: { orderBy: { stageName: "asc" } },
      projects: {
        include: { primaryService: true, leadEngineer: true },
        orderBy: { createdAt: "desc" },
      },
      sessions: {
        include: { service: true },
        orderBy: { startsAt: "desc" },
      },
    },
  });

  if (!client) return null;

  const lifetimeRevenue = client.sessions
    .filter((s) => s.paymentStatus === "PAID")
    .reduce((sum, s) => sum + Number(s.amountBase ?? s.amount), 0);

  return { ...client, lifetimeRevenue };
}

// Fetched separately from getClientDetail rather than added to its
// `include` — keeps that already-large query from growing further, and this
// is fine as its own parallel Promise.all call from the page.
export async function getClientWhatsappMessages(clientId: string) {
  return prisma.whatsappMessage.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });
}
