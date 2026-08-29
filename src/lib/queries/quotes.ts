import "server-only";
import { prisma } from "@/lib/db";

export async function listQuotes() {
  return prisma.quote.findMany({
    include: { lead: true, client: true, service: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getQuoteDetail(quoteId: string) {
  return prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lead: true, client: true, service: true, project: true },
  });
}
