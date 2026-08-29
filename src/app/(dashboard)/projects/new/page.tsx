import { prisma } from "@/lib/db";
import { listAllArtists } from "@/lib/queries/clients";
import { listServices } from "@/lib/queries/services";
import { listActiveEmployees } from "@/lib/queries/employees";
import { ProjectForm } from "@/components/projects/project-form";
import { toPlainService, toPlainEmployee } from "@/lib/serialize";

export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  const params = await searchParams;
  const clientIdParam = typeof params?.clientId === "string" ? params.clientId : undefined;

  const [clients, artists, services, employees] = await Promise.all([
    prisma.client.findMany({ where: { active: true }, orderBy: { displayName: "asc" } }),
    listAllArtists(),
    listServices({ activeOnly: true }),
    listActiveEmployees(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Project</h1>
        <p className="text-sm text-muted-foreground">
          For multi-song albums, set the track count — each track gets its own progress row.
        </p>
      </div>
      <ProjectForm
        clients={clients}
        artists={artists}
        services={services.map(toPlainService)}
        employees={employees.map((e) => ({ ...toPlainEmployee(e), role: e.role }))}
        defaultClientId={clientIdParam}
        cancelHref={clientIdParam ? `/clients/${clientIdParam}` : "/projects"}
      />
    </div>
  );
}
