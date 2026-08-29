import { prisma } from "@/lib/db";
import { listServices } from "@/lib/queries/services";
import { QuoteForm } from "@/components/quotes/quote-form";
import { toPlainService } from "@/lib/serialize";

export default async function NewQuotePage({ searchParams }: PageProps<"/quotes/new">) {
  const params = await searchParams;
  const leadIdParam = typeof params?.leadId === "string" ? params.leadId : undefined;
  const clientIdParam = typeof params?.clientId === "string" ? params.clientId : undefined;

  const [leads, clients, services] = await Promise.all([
    prisma.lead.findMany({
      where: { stage: { notIn: ["WON", "LOST"] } },
      select: { id: true, name: true, artistName: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ where: { active: true }, orderBy: { displayName: "asc" } }),
    listServices({ activeOnly: true }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Quote</h1>
        <p className="text-sm text-muted-foreground">Send a price quote to a lead or existing client.</p>
      </div>
      <QuoteForm
        leads={leads}
        clients={clients}
        services={services.map(toPlainService)}
        defaultLeadId={leadIdParam}
        defaultClientId={clientIdParam}
        cancelHref={leadIdParam ? `/leads/${leadIdParam}` : clientIdParam ? `/clients/${clientIdParam}` : "/quotes"}
      />
    </div>
  );
}
