import { listLeadSources } from "@/lib/queries/lead-sources";
import { ClientForm } from "@/components/clients/client-form";

export default async function NewClientPage() {
  const leadSources = await listLeadSources();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Client</h1>
        <p className="text-sm text-muted-foreground">Add a new client or artist contact.</p>
      </div>
      <ClientForm leadSources={leadSources} cancelHref="/clients" />
    </div>
  );
}
