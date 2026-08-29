import Link from "next/link";
import { Plus } from "lucide-react";
import { listSessions } from "@/lib/queries/sessions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default async function SessionsPage() {
  const sessions = await listSessions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">{sessions.length} sessions</p>
        </div>
        <Button render={<Link href="/sessions/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Engineers</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No sessions yet.
                </TableCell>
              </TableRow>
            )}
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">
                  <Link href={`/sessions/${session.id}`} className="hover:underline">
                    {formatDateTime(session.startsAt)}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{session.client.displayName}</TableCell>
                <TableCell className="text-muted-foreground">{session.service.serviceName}</TableCell>
                <TableCell className="text-muted-foreground">{session.studioRoom}</TableCell>
                <TableCell className="text-muted-foreground">
                  {session.engineers.map((e) => e.employee.displayName ?? e.employee.fullName).join(", ") || "—"}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(session.amount)}</TableCell>
                <TableCell>
                  <PaymentStatusBadge status={session.paymentStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
