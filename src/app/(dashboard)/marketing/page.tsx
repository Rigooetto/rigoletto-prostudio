import { requireRole } from "@/lib/auth/session";
import { listCampaignsWithMetrics } from "@/lib/queries/campaigns";
import { CampaignDialog } from "@/components/marketing/campaign-dialog";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export default async function MarketingPage() {
  await requireRole("ADMIN");
  const campaigns = await listCampaignsWithMetrics();

  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenueGenerated, 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
          <p className="text-sm text-muted-foreground">Campaign spend, CAC, and ROAS. Admin-only.</p>
        </div>
        <CampaignDialog />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile label="Total Spend" value={formatCurrency(totalSpend)} />
        <StatTile label="Revenue Attributed" value={formatCurrency(totalRevenue)} />
        <StatTile label="Overall ROAS" value={`${overallRoas.toFixed(1)}x`} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Bookings</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost/Lead</TableHead>
              <TableHead className="text-right">CAC</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No campaigns logged yet.
                </TableCell>
              </TableRow>
            )}
            {campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(campaign.spend)}</TableCell>
                <TableCell className="text-right">{campaign.leadsCount}</TableCell>
                <TableCell className="text-right">{campaign.bookingsCount}</TableCell>
                <TableCell className="text-right">{formatCurrency(campaign.revenueGenerated)}</TableCell>
                <TableCell className="text-right">{formatCurrency(campaign.costPerLead)}</TableCell>
                <TableCell className="text-right">{formatCurrency(campaign.cac)}</TableCell>
                <TableCell className="text-right">{campaign.roas.toFixed(1)}x</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
