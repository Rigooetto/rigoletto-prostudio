import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { getSessionDetail } from "@/lib/queries/sessions";
import { listAllArtists } from "@/lib/queries/clients";
import { listServices } from "@/lib/queries/services";
import { listActiveEmployees } from "@/lib/queries/employees";
import { getSessionDeleteImpact } from "@/lib/actions/sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatusBadge, WhatsappStatusBadge } from "@/components/shared/status-badge";
import { SessionEditDialog } from "@/components/sessions/session-edit-dialog";
import { DeleteSessionButton } from "@/components/sessions/delete-session-button";
import { RecordSessionPaymentForm } from "@/components/sessions/record-session-payment-form";
import { ResendWhatsappButton } from "@/components/sessions/resend-whatsapp-button";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toPlainService, toPlainEmployee } from "@/lib/serialize";

export default async function SessionDetailPage({ params }: PageProps<"/sessions/[sessionId]">) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();

  const [viewer, clients, artists, services, employees, projects, deleteImpact] = await Promise.all([
    requireEmployee(),
    prisma.client.findMany({ where: { active: true }, orderBy: { displayName: "asc" } }),
    listAllArtists(),
    listServices({ activeOnly: true }),
    listActiveEmployees(),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
    getSessionDeleteImpact(sessionId),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{session.service.serviceName}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${session.clientId}`} className="hover:underline">
              {session.client.displayName}
            </Link>
            {session.artist && ` · ${session.artist.stageName}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SessionEditDialog
            session={{
              id: session.id,
              clientId: session.clientId,
              artistId: session.artistId,
              serviceId: session.serviceId,
              projectId: session.projectId,
              studioRoom: session.studioRoom,
              startsAt: session.startsAt.toISOString(),
              endsAt: session.endsAt.toISOString(),
              amount: Number(session.amount),
              notes: session.notes,
              engineerIds: session.engineers.map((e) => e.employeeId),
              updatedAt: session.updatedAt.toISOString(),
            }}
            clients={clients}
            artists={artists}
            services={services.map(toPlainService)}
            employees={employees.map((e) => ({ ...toPlainEmployee(e), role: e.role }))}
            projects={projects}
          />
          <PaymentStatusBadge status={session.paymentStatus} />
          <WhatsappStatusBadge status={session.whatsappStatus} />
          {session.whatsappStatus !== "SENT" && <ResendWhatsappButton sessionId={session.id} />}
          <DeleteSessionButton
            sessionId={session.id}
            orphanableProject={deleteImpact.orphanableProject}
            orphanableInvoice={deleteImpact.orphanableInvoice}
            paymentStatus={session.paymentStatus}
            isAdmin={viewer.role.code === "ADMIN"}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Start" value={formatDateTime(session.startsAt)} />
          <Row label="End" value={formatDateTime(session.endsAt)} />
          <Row label="Room" value={session.studioRoom} />
          <Row label="Amount" value={formatCurrency(session.amount)} />
          <Row label="Paid So Far" value={formatCurrency(session.paidAmount)} />
          {session.balance > 0 && <Row label="Balance Due" value={formatCurrency(session.balance)} />}
          {session.project && (
            <Row
              label="Project"
              value={
                <Link href={`/projects/${session.project.id}`} className="hover:underline">
                  {session.project.title}
                </Link>
              }
            />
          )}
          <Row
            label="Engineers"
            value={session.engineers.map((e) => e.employee.displayName ?? e.employee.fullName).join(", ") || "—"}
          />
          {session.createdByEmployee && (
            <Row label="Booked by" value={session.createdByEmployee.displayName ?? session.createdByEmployee.fullName} />
          )}
          {session.notes && <Row label="Notes" value={session.notes} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {session.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
          {session.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between border-b border-border/60 pb-2 text-sm last:border-0 last:pb-0"
            >
              <div>
                <p className={`font-medium ${Number(payment.amount) < 0 ? "text-destructive" : ""}`}>
                  {formatCurrency(payment.amount)}
                  {Number(payment.amount) < 0 && " (refund)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.method} · {formatDateTime(payment.paidAt)}
                  {payment.recordedByEmployee &&
                    ` · ${payment.recordedByEmployee.displayName ?? payment.recordedByEmployee.fullName}`}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {session.balance > 0 && <RecordSessionPaymentForm sessionId={session.id} suggestedAmount={session.balance} />}
      {session.paidAmount > 0 && (
        <RecordSessionPaymentForm sessionId={session.id} suggestedAmount={session.paidAmount} isRefund />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
