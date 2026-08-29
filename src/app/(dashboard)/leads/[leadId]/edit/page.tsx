import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { listLeadSources } from "@/lib/queries/lead-sources";
import { listServices } from "@/lib/queries/services";
import { listActiveEmployees } from "@/lib/queries/employees";
import { LeadForm } from "@/components/leads/lead-form";
import { toPlainLead, toPlainService, toPlainEmployee } from "@/lib/serialize";

export default async function EditLeadPage({ params }: PageProps<"/leads/[leadId]/edit">) {
  const { leadId } = await params;
  // Bare lead row (no relations) — LeadForm only needs scalar fields, and
  // relations here would carry their own Decimal fields the serialize
  // helper doesn't know to touch (see CLAUDE.md's Decimal-serialization note).
  const [lead, leadSources, services, employees] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    listLeadSources(),
    listServices({ activeOnly: true }),
    listActiveEmployees(),
  ]);
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Lead</h1>
        <p className="text-sm text-muted-foreground">{lead.artistName || lead.name}</p>
      </div>
      <LeadForm
        leadSources={leadSources}
        services={services.map(toPlainService)}
        employees={employees.map((e) => ({ ...toPlainEmployee(e), role: e.role }))}
        lead={toPlainLead(lead)}
        cancelHref={`/leads/${lead.id}`}
      />
    </div>
  );
}
