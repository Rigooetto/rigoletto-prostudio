import Link from "next/link";
import { Plus } from "lucide-react";
import { listQuotes } from "@/lib/queries/quotes";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function QuotesPage() {
  const quotes = await listQuotes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotes</h1>
          <p className="text-sm text-muted-foreground">{quotes.length} quotes</p>
        </div>
        <Button render={<Link href="/quotes/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" />
          New Quote
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>For</TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No quotes yet.
                </TableCell>
              </TableRow>
            )}
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">
                  <Link href={`/quotes/${quote.id}`} className="hover:underline">
                    {quote.client?.displayName ?? quote.lead?.artistName ?? quote.lead?.name ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{quote.service.serviceName}</TableCell>
                <TableCell className="text-right">{formatCurrency(quote.amount)}</TableCell>
                <TableCell>
                  <Badge variant={quote.status === "ACCEPTED" ? "default" : "outline"}>{quote.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(quote.validUntil)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
