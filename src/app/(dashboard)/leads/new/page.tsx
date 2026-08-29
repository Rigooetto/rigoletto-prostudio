import { listLeadSources } from "@/lib/queries/lead-sources";
import { listServices } from "@/lib/queries/services";
import { listActiveEmployees } from "@/lib/queries/employees";
import { LeadForm } from "@/components/leads/lead-form";
import { toPlainService, toPlainEmployee } from "@/lib/serialize";

export default async function NewLeadPage() {
  const [leadSources, services, employees] = await Promise.all([
    listLeadSources(),
    listServices({ activeOnly: true }),
    listActiveEmployees(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Lead</h1>
        <p className="text-sm text-muted-foreground">Add a prospect to the pipeline.</p>
      </div>
      <LeadForm
        leadSources={leadSources}
        services={services.map(toPlainService)}
        employees={employees.map((e) => ({ ...toPlainEmployee(e), role: e.role }))}
        cancelHref="/leads"
      />
    </div>
  );
}
