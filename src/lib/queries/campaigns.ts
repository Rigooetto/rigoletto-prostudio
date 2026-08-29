import "server-only";
import { prisma } from "@/lib/db";

export async function listCampaignsWithMetrics() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      leads: {
        include: { convertedClient: { include: { sessions: { where: { paymentStatus: "PAID" } } } } },
      },
    },
    orderBy: { month: "desc" },
  });

  return campaigns.map((campaign) => {
    const leadsCount = campaign.leads.length;
    const bookingsCount = campaign.leads.filter((l) => l.stage === "BOOKED" || l.stage === "WON").length;
    const revenueGenerated = campaign.leads.reduce((sum, lead) => {
      if (!lead.convertedClient) return sum;
      const clientRevenue = lead.convertedClient.sessions.reduce(
        (s, sess) => s + Number(sess.amountBase ?? sess.amount),
        0
      );
      return sum + clientRevenue;
    }, 0);

    const spend = Number(campaign.spendBase ?? campaign.spend);
    const costPerLead = leadsCount > 0 ? spend / leadsCount : 0;
    const cac = bookingsCount > 0 ? spend / bookingsCount : 0;
    const roas = spend > 0 ? revenueGenerated / spend : 0;

    return {
      id: campaign.id,
      name: campaign.name,
      month: campaign.month,
      spend,
      leadsCount,
      bookingsCount,
      revenueGenerated,
      costPerLead,
      cac,
      roas,
    };
  });
}
