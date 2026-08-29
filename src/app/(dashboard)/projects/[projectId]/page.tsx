import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth/session";
import { getProjectDetail } from "@/lib/queries/projects";
import { listAllArtists } from "@/lib/queries/clients";
import { listServices } from "@/lib/queries/services";
import { listActiveEmployees } from "@/lib/queries/employees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { ProjectStatusSelect } from "@/components/projects/project-status-select";
import { TrackStatusSelect } from "@/components/projects/track-status-select";
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog";
import { BulkTrackStatusControl } from "@/components/projects/bulk-track-status-control";
import { ProjectStatusSuggestionBanner } from "@/components/projects/project-status-suggestion-banner";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { toPlainService, toPlainEmployee } from "@/lib/serialize";
import { suggestNextProjectStatus, hasStartedProduction } from "@/lib/track-status";

const lifecycleSteps: Array<{ label: string; field: string }> = [
  { label: "Created", field: "createdAt" },
  { label: "Scheduled Recording", field: "scheduledRecordingAt" },
  { label: "Recording Started", field: "recordingStartedAt" },
  { label: "Recording Completed", field: "recordingCompletedAt" },
  { label: "Editing Started", field: "editingStartedAt" },
  { label: "Editing Completed", field: "editingCompletedAt" },
  { label: "Mix Started", field: "mixStartedAt" },
  { label: "Mix Completed", field: "mixCompletedAt" },
  { label: "Master Started", field: "masterStartedAt" },
  { label: "Master Completed", field: "masterCompletedAt" },
  { label: "First Delivery", field: "firstDeliveredAt" },
  { label: "Revision Requested", field: "revisionRequestedAt" },
  { label: "Revision Delivered", field: "revisionDeliveredAt" },
  { label: "Final Delivery", field: "finalDeliveredAt" },
];

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const [viewer, project, artists, services, employees] = await Promise.all([
    requireEmployee(),
    getProjectDetail(projectId),
    listAllArtists(),
    listServices({ activeOnly: true }),
    listActiveEmployees(),
  ]);
  if (!project) notFound();

  const deliveredCount = project.tracks.filter((t) => t.status === "DELIVERED").length;
  const mixedCount = project.tracks.filter((t) =>
    ["MIXED", "MASTERING", "MASTERED", "DELIVERED"].includes(t.status)
  ).length;
  const editedCount = project.tracks.filter((t) =>
    ["EDITED", "MIXING", "MIXED", "MASTERING", "MASTERED", "DELIVERED"].includes(t.status)
  ).length;
  const statusSuggestion = suggestNextProjectStatus(project.tracks, project.status);

  const outstandingBalance = project.sessions.reduce((sum, session) => {
    const paid = session.payments.reduce((pSum, p) => pSum + Number(p.amountBase ?? p.amount), 0);
    const balance = Number(session.amountBase ?? session.amount) - paid;
    return sum + Math.max(balance, 0);
  }, 0);
  const showBalanceWarning = outstandingBalance > 0.01 && hasStartedProduction(project.status);

  return (
    <div className="space-y-6">
      {statusSuggestion && (
        <ProjectStatusSuggestionBanner
          projectId={project.id}
          suggestedStatus={statusSuggestion.status}
          suggestedLabel={statusSuggestion.label}
        />
      )}
      {showBalanceWarning && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Outstanding balance: <span className="font-medium">{formatCurrency(outstandingBalance)}</span> across this
          project&apos;s session(s) — typically collected in full before starting Editing, Mixing, or Mastering.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${project.clientId}`} className="hover:underline">
              {project.client.displayName}
            </Link>
            {project.artist && ` · ${project.artist.stageName}`} · {project.primaryService.serviceName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ProjectStatusSelect projectId={project.id} status={project.status} />
          <ProjectEditDialog
            project={{
              id: project.id,
              title: project.title,
              artistId: project.artistId,
              primaryServiceId: project.primaryServiceId,
              leadEngineerId: project.leadEngineerId,
              trackCount: project.trackCount,
              quotedPrice: project.quotedPrice === null ? null : Number(project.quotedPrice),
              scheduledRecordingAt: project.scheduledRecordingAt,
              notes: project.notes,
              updatedAt: project.updatedAt,
            }}
            tracks={project.tracks.map((t) => ({
              trackNumber: t.trackNumber,
              hasProgress: t.status !== "PENDING" || Boolean(t.editedAt || t.mixedAt || t.masteredAt || t.deliveredAt),
            }))}
            isAdmin={viewer.role.code === "ADMIN"}
            artists={artists}
            services={services.map(toPlainService)}
            employees={employees.map((e) => ({ ...toPlainEmployee(e), role: e.role }))}
          />
          <DeleteProjectButton
            projectId={project.id}
            unpaidSessionCount={project.sessions.filter((s) => s.paymentStatus === "UNPAID").length}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBlock label="Tracks Edited" value={`${editedCount}/${project.trackCount}`} />
        <StatBlock label="Tracks Mixed" value={`${mixedCount}/${project.trackCount}`} />
        <StatBlock label="Tracks Delivered" value={`${deliveredCount}/${project.trackCount}`} />
        <StatBlock label="Quoted Price" value={project.quotedPrice ? formatCurrency(project.quotedPrice) : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {lifecycleSteps.map((step) => {
                const value = project[step.field as keyof typeof project] as Date | null;
                return (
                  <li key={step.field} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
                    <span className={value ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                    <span className={value ? "font-medium" : "text-muted-foreground"}>
                      {value ? formatDate(value) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Tracks</CardTitle>
            <BulkTrackStatusControl projectId={project.id} tracks={project.tracks} />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.tracks.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell className="text-muted-foreground">{track.trackNumber}</TableCell>
                    <TableCell>{track.trackTitle ?? `Track ${track.trackNumber}`}</TableCell>
                    <TableCell>
                      <TrackStatusSelect trackId={track.id} status={track.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(track.deliveredAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
              {project.sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No sessions linked yet.
                  </TableCell>
                </TableRow>
              )}
              {project.sessions.map((session) => (
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

      {project.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{project.notes}</p>
          </CardContent>
        </Card>
      )}
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
