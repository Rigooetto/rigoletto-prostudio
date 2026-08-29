import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuoteDetail } from "@/lib/queries/quotes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuoteStatusSelect } from "@/components/quotes/quote-status-select";
import { ConvertQuoteForm } from "@/components/quotes/convert-quote-form";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function QuoteDetailPage({ params }: PageProps<"/quotes/[quoteId]">) {
  const { quoteId } = await params;
  const quote = await getQuoteDetail(quoteId);
  if (!quote) notFound();

  const forName = quote.client?.displayName ?? quote.lead?.artistName ?? quote.lead?.name ?? "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{quote.service.serviceName}</h1>
          <p className="text-sm text-muted-foreground">
            For {forName}
            {quote.lead && (
              <>
                {" · "}
                <Link href={`/leads/${quote.lead.id}`} className="hover:underline">
                  View lead
                </Link>
              </>
            )}
          </p>
        </div>
        <QuoteStatusSelect quoteId={quote.id} status={quote.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Amount" value={formatCurrency(quote.amount)} />
          <Row label="Valid Until" value={formatDate(quote.validUntil)} />
          <Row label="Sent" value={formatDate(quote.sentAt)} />
          <Row label="Responded" value={formatDate(quote.respondedAt)} />
          {quote.notes && <Row label="Notes" value={quote.notes} />}
        </CardContent>
      </Card>

      {quote.status === "ACCEPTED" &&
        (quote.project ? (
          <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
            Already converted to project{" "}
            <Link href={`/projects/${quote.project.id}`} className="font-medium underline">
              {quote.project.title}
            </Link>
          </div>
        ) : (
          <ConvertQuoteForm quoteId={quote.id} defaultTitle={`${forName} — ${quote.service.serviceName}`} />
        ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
