import "server-only";
import { prisma } from "@/lib/db";

export async function listLeads() {
  return prisma.lead.findMany({
    include: { leadSource: true, interestedService: true, ownerEmployee: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLeadDetail(leadId: string) {
  return prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      leadSource: true,
      interestedService: true,
      ownerEmployee: true,
      convertedClient: true,
      quotes: { include: { service: true }, orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getPipelineSummary() {
  const leads = await prisma.lead.findMany({
    where: { stage: { notIn: ["WON", "LOST"] } },
    select: { estimatedValue: true, probability: true },
  });

  const openPipeline = leads.reduce((sum, l) => sum + Number(l.estimatedValue ?? 0), 0);
  const weightedPipeline = leads.reduce(
    (sum, l) => sum + (Number(l.estimatedValue ?? 0) * l.probability) / 100,
    0
  );

  return { openPipeline, weightedPipeline, openLeadCount: leads.length };
}

export async function listLeadsNeedingFollowUp() {
  return prisma.lead.findMany({
    where: {
      stage: { notIn: ["WON", "LOST"] },
      nextFollowUpAt: { lte: new Date() },
    },
    orderBy: { nextFollowUpAt: "asc" },
    take: 10,
  });
}
