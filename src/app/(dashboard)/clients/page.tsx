import Link from "next/link";
import { Plus } from "lucide-react";
import { listClients } from "@/lib/queries/clients";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} active clients</p>
        </div>
        <Button render={<Link href="/clients/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Lead Source</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Projects</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Lifetime Revenue</TableHead>
              <TableHead>Last Visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No clients yet. Create your first client to get started.
                </TableCell>
              </TableRow>
            )}
            {clients.map((client) => (
              <TableRow key={client.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/clients/${client.id}`} className="hover:underline">
                    {client.displayName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{client.leadSource?.label ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{client.phone || client.email || "—"}</TableCell>
                <TableCell className="text-right">{client.projectCount}</TableCell>
                <TableCell className="text-right">{client.sessionCount}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(client.lifetimeRevenue)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(client.lastVisitAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
