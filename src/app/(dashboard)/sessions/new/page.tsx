import { prisma } from "@/lib/db";
import { listAllArtists } from "@/lib/queries/clients";
import { listServices } from "@/lib/queries/services";
import { listActiveEmployees } from "@/lib/queries/employees";
import { SessionForm } from "@/components/sessions/session-form";
import { toPlainService, toPlainEmployee } from "@/lib/serialize";

export default async function NewSessionPage({ searchParams }: PageProps<"/sessions/new">) {
  const params = await searchParams;
  const clientIdParam = typeof params?.clientId === "string" ? params.clientId : undefined;
  const projectIdParam = typeof params?.projectId === "string" ? params.projectId : undefined;
  const dateParam = typeof params?.date === "string" ? params.date : undefined;
  // Clicked a day on the Calendar — pre-fill a sensible default slot instead
  // of making them retype the date they were just looking at.
  const defaultStartsAt = dateParam ? `${dateParam}T12:00` : undefined;
  const defaultEndsAt = dateParam ? `${dateParam}T14:00` : undefined;

  const [clients, artists, services, employees, projects] = await Promise.all([
    prisma.client.findMany({ where: { active: true }, orderBy: { displayName: "asc" } }),
    listAllArtists(),
    listServices({ activeOnly: true }),
    listActiveEmployees(),
    prisma.project.findMany({ select: { id: true, title: true, clientId: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Session</h1>
        <p className="text-sm text-muted-foreground">Book a studio session.</p>
      </div>
      <SessionForm
        clients={clients}
        artists={artists}
        services={services.map(toPlainService)}
        employees={employees.map((e) => ({ ...toPlainEmployee(e), role: e.role }))}
        projects={projects}
        defaultClientId={clientIdParam}
        defaultProjectId={projectIdParam}
        defaultStartsAt={defaultStartsAt}
        defaultEndsAt={defaultEndsAt}
        cancelHref={
          projectIdParam ? `/projects/${projectIdParam}` : clientIdParam ? `/clients/${clientIdParam}` : "/sessions"
        }
      />
    </div>
  );
}
