import Link from "next/link";
import { Plus } from "lucide-react";
import { listLeads, getPipelineSummary } from "@/lib/queries/leads";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/dashboard/stat-tile";
import { LeadStageSelect } from "@/components/leads/lead-stage-select";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LeadStage } from "@/generated/prisma/enums";

const stages: { value: LeadStage; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "QUOTED", label: "Quoted" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "BOOKED", label: "Booked" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export default async function LeadsPage() {
  const [leads, pipeline] = await Promise.all([listLeads(), getPipelineSummary()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">Sales pipeline</p>
        </div>
        <Button render={<Link href="/leads/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" />
          New Lead
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatTile label="Open Leads" value={String(pipeline.openLeadCount)} />
        <StatTile label="Open Pipeline" value={formatCurrency(pipeline.openPipeline)} />
        <StatTile label="Weighted Pipeline" value={formatCurrency(pipeline.weightedPipeline)} sublabel="value × probability" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.value);
          return (
            <div key={stage.value} className="flex w-72 shrink-0 flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stage.label}
                </p>
                <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {stageLeads.map((lead) => (
                  <div key={lead.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.artistName || lead.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{lead.leadSource?.label ?? "No source"}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "—"} · {lead.probability}%
                      </span>
                    </div>
                    {lead.nextFollowUpAt && (
                      <p className="mt-1 text-xs text-muted-foreground">Follow up {formatDate(lead.nextFollowUpAt)}</p>
                    )}
                    <div className="mt-2">
                      <LeadStageSelect leadId={lead.id} stage={lead.stage} />
                    </div>
                  </div>
                ))}
                {stageLeads.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    Empty
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
