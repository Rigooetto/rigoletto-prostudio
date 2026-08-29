import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getLeadDetail } from "@/lib/queries/leads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStageSelect } from "@/components/leads/lead-stage-select";
import { ConvertLeadButton } from "@/components/leads/convert-lead-button";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function LeadDetailPage({ params }: PageProps<"/leads/[leadId]">) {
  const { leadId } = await params;
  const lead = await getLeadDetail(leadId);
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.artistName || lead.name}</h1>
          <p className="text-sm text-muted-foreground">
            {lead.name} · {lead.leadSource?.label ?? "No source"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LeadStageSelect leadId={lead.id} stage={lead.stage} />
          <Button variant="outline" render={<Link href={`/leads/${lead.id}/edit`} />} nativeButton={false}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {lead.convertedClient ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          Converted to client{" "}
          <Link href={`/clients/${lead.convertedClient.id}`} className="font-medium underline">
            {lead.convertedClient.displayName}
          </Link>
        </div>
      ) : (
        <ConvertLeadButton leadId={lead.id} />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Estimated Value" value={lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "—"} />
        <Stat label="Probability" value={`${lead.probability}%`} />
        <Stat label="Next Follow-Up" value={formatDate(lead.nextFollowUpAt)} />
        <Stat label="Owner" value={lead.ownerEmployee?.displayName ?? lead.ownerEmployee?.fullName ?? "Unassigned"} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {lead.phone && <p>{lead.phone}</p>}
            {lead.email && <p>{lead.email}</p>}
            {lead.instagramHandle && <p>{lead.instagramHandle}</p>}
            {lead.notes && <p className="whitespace-pre-wrap pt-2 border-t border-border">{lead.notes}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Quotes</CardTitle>
            <Button size="sm" variant="outline" render={<Link href={`/quotes/new?leadId=${lead.id}`} />} nativeButton={false}>
              New Quote
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {lead.quotes.length === 0 && <p className="text-sm text-muted-foreground">No quotes yet.</p>}
            {lead.quotes.map((quote) => (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
              >
                <span>{quote.service.serviceName}</span>
                <span className="text-muted-foreground">{formatCurrency(quote.amount)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
