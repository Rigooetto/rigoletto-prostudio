import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { Project, Client } from "@/generated/prisma/client";

export function OverdueProjectsCard({ projects }: { projects: (Project & { client: Client })[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Overdue Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing overdue. Nice work.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between text-sm">
                <Link href={`/projects/${project.id}`} className="hover:underline">
                  {project.title} — {project.client.displayName}
                </Link>
                <span className="text-destructive">{formatDate(project.scheduledRecordingAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function FollowUpClientsCard({ clients }: { clients: { id: string; displayName: string; lastVisitAt: Date | null }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clients to Reactivate</CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clients need follow-up right now.</p>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => (
              <li key={client.id} className="flex items-center justify-between text-sm">
                <Link href={`/clients/${client.id}`} className="hover:underline">
                  {client.displayName}
                </Link>
                <span className="text-muted-foreground">Last visit {formatDate(client.lastVisitAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
