import { prisma } from "@/lib/db";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default async function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  const params = await searchParams;
  const clientIdParam = typeof params?.clientId === "string" ? params.clientId : undefined;

  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ where: { active: true }, orderBy: { displayName: "asc" } }),
    prisma.project.findMany({
      select: { id: true, title: true, clientId: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Invoice</h1>
        <p className="text-sm text-muted-foreground">Bill a client for a project or engagement.</p>
      </div>
      <InvoiceForm
        clients={clients}
        projects={projects}
        defaultClientId={clientIdParam}
        cancelHref={clientIdParam ? `/clients/${clientIdParam}` : "/invoices"}
      />
    </div>
  );
}
