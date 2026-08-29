import { requireRole } from "@/lib/auth/session";
import { listAuditLogEntries } from "@/lib/queries/audit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export default async function AuditLogPage() {
  await requireRole("ADMIN");
  const entries = await listAuditLogEntries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Financial and compensation mutations. Admin-only.</p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No audit entries yet.
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">{formatDateTime(entry.createdAt)}</TableCell>
                <TableCell>{entry.employee?.displayName ?? entry.employee?.fullName ?? "System"}</TableCell>
                <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.entityType} · {entry.entityId.slice(0, 8)}
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {entry.newValue ? JSON.stringify(entry.newValue) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
