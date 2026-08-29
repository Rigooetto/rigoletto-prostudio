import { notFound } from "next/navigation";
import { getClientDetail } from "@/lib/queries/clients";
import { listLeadSources } from "@/lib/queries/lead-sources";
import { ClientForm } from "@/components/clients/client-form";

export default async function EditClientPage({ params }: PageProps<"/clients/[clientId]/edit">) {
  const { clientId } = await params;
  const [client, leadSources] = await Promise.all([getClientDetail(clientId), listLeadSources()]);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Client</h1>
        <p className="text-sm text-muted-foreground">{client.displayName}</p>
      </div>
      <ClientForm
        leadSources={leadSources}
        client={{
          id: client.id,
          displayName: client.displayName,
          contactName: client.contactName,
          leadSourceId: client.leadSourceId,
          phone: client.phone,
          email: client.email,
          instagramHandle: client.instagramHandle,
          notes: client.notes,
        }}
        cancelHref={`/clients/${client.id}`}
      />
    </div>
  );
}
