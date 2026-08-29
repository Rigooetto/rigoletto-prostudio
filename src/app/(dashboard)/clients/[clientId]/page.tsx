import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, AtSign, Mail, Phone } from "lucide-react";
import { getClientDetail, getClientWhatsappMessages } from "@/lib/queries/clients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectStatusBadge, PaymentStatusBadge, WhatsappStatusBadge } from "@/components/shared/status-badge";
import { AddArtistForm } from "@/components/clients/add-artist-form";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function ClientDetailPage({ params }: PageProps<"/clients/[clientId]">) {
  const { clientId } = await params;
  const [client, whatsappMessages] = await Promise.all([getClientDetail(clientId), getClientWhatsappMessages(clientId)]);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {client.leadSource?.label ?? "No lead source"}
            {client.originatedByEmployee && ` · originated by ${client.originatedByEmployee.displayName ?? client.originatedByEmployee.fullName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href={`/clients/${client.id}/edit`} />} nativeButton={false}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <DeleteClientButton
            clientId={client.id}
            projectCount={client.projects.length}
            sessionCount={client.sessions.length}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBlock label="Lifetime Revenue" value={formatCurrency(client.lifetimeRevenue)} />
        <StatBlock label="Projects" value={String(client.projects.length)} />
        <StatBlock label="Sessions" value={String(client.sessions.length)} />
        <StatBlock label="Last Visit" value={formatDate(client.lastVisitAt)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.contactName && <p className="text-muted-foreground">{client.contactName}</p>}
            {client.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {client.phone}
              </p>
            )}
            {client.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {client.email}
              </p>
            )}
            {client.instagramHandle && (
              <p className="flex items-center gap-2">
                <AtSign className="h-3.5 w-3.5 text-muted-foreground" /> {client.instagramHandle}
              </p>
            )}
            {client.notes && (
              <div className="border-t border-border pt-3">
                <p className="whitespace-pre-wrap text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Artists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.artists.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {client.artists.map((artist) => (
                  <li key={artist.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="font-medium">{artist.stageName}</span>
                    {artist.genre && <span className="text-xs text-muted-foreground">{artist.genre}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No artists linked yet.</p>
            )}
            <AddArtistForm clientId={client.id} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lead Engineer</TableHead>
                <TableHead className="text-right">Tracks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No projects yet.
                  </TableCell>
                </TableRow>
              )}
              {client.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                      {project.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{project.primaryService.serviceName}</TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={project.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.leadEngineer?.displayName ?? project.leadEngineer?.fullName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{project.trackCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No sessions yet.
                  </TableCell>
                </TableRow>
              )}
              {client.sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{formatDateTime(session.startsAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{session.service.serviceName}</TableCell>
                  <TableCell className="text-muted-foreground">{session.studioRoom}</TableCell>
                  <TableCell className="text-right">{formatCurrency(session.amount)}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={session.paymentStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          {whatsappMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No WhatsApp messages yet.</p>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {whatsappMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex flex-col gap-1 text-sm", message.direction === "OUTBOUND" ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2",
                      message.direction === "OUTBOUND" ? "bg-primary/15 text-primary" : "bg-muted text-foreground"
                    )}
                  >
                    {message.body}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateTime(message.createdAt)}</span>
                    {message.direction === "OUTBOUND" && <WhatsappStatusBadge status={message.status} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
