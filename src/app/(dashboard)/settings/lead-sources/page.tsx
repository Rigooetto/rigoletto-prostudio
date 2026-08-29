import { requireRole } from "@/lib/auth/session";
import { listLeadSources } from "@/lib/queries/lead-sources";
import { LeadSourceDialog } from "@/components/settings/lead-source-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function LeadSourcesSettingsPage() {
  await requireRole("ADMIN");
  const leadSources = await listLeadSources({ activeOnly: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lead Sources</h1>
          <p className="text-sm text-muted-foreground">
            Controls which sources are marketing channels and which qualify for Turi&apos;s Customer
            Acquisition Commission. Admin-only.
          </p>
        </div>
        <LeadSourceDialog />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Marketing Channel</TableHead>
              <TableHead>Acquisition Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadSources.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{source.code}</TableCell>
                <TableCell className="font-medium">{source.label}</TableCell>
                <TableCell>
                  <Badge variant={source.isMarketingChannel ? "default" : "outline"}>
                    {source.isMarketingChannel ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={source.eligibleForAcquisitionCommission ? "default" : "outline"}>
                    {source.eligibleForAcquisitionCommission ? "Eligible" : "Not eligible"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={source.active ? "default" : "secondary"}>
                    {source.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <LeadSourceDialog leadSource={source} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
