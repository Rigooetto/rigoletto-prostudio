import { prisma } from "@/lib/db";
import { listAllArtists } from "@/lib/queries/clients";
import { listServices } from "@/lib/queries/services";
import { listActiveEmployees } from "@/lib/queries/employees";
import { SessionForm } from "@/components/sessions/session-form";
import { toPlainService, toPlainEmployee } from "@/lib/serialize";

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function NewSessionPage({ searchParams }: PageProps<"/sessions/new">) {
  const params = await searchParams;
  const clientIdParam = typeof params?.clientId === "string" ? params.clientId : undefined;
  const projectIdParam = typeof params?.projectId === "string" ? params.projectId : undefined;
  const dateParam = typeof params?.date === "string" ? params.date : undefined;
  const timeParam = typeof params?.time === "string" ? params.time : undefined;
  // Clicked a day (or a specific time slot, from the Calendar's week/day
  // grid) — pre-fill a sensible default slot instead of making them retype
  // what they were just looking at. Computed via Date math (not string
  // concatenation) so a slot clicked late in the day still rolls over to the
  // correct next-day end time instead of producing an invalid "25:00".
  let defaultStartsAt: string | undefined;
  let defaultEndsAt: string | undefined;
  if (dateParam) {
    const start = new Date(`${dateParam}T${timeParam ?? "12:00"}`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    defaultStartsAt = toDatetimeLocalValue(start);
    defaultEndsAt = toDatetimeLocalValue(end);
  }

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
