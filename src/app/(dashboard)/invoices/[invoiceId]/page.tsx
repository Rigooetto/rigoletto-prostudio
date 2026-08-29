import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceDetail } from "@/lib/queries/invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { RecordPaymentForm } from "@/components/invoices/record-payment-form";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export default async function InvoiceDetailPage({ params }: PageProps<"/invoices/[invoiceId]">) {
  const { invoiceId } = await params;
  const invoice = await getInvoiceDetail(invoiceId);
  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${invoice.clientId}`} className="hover:underline">
              {invoice.client.displayName}
            </Link>
          </p>
        </div>
        <PaymentStatusBadge status={invoice.status} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total" value={formatCurrency(invoice.total)} />
        <Stat label="Paid" value={formatCurrency(invoice.paidAmount)} />
        <Stat label="Balance" value={formatCurrency(invoice.balance)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Issue Date" value={formatDate(invoice.issueDate)} />
          <Row label="Due Date" value={formatDate(invoice.dueDate)} />
          {invoice.projects.length > 0 && (
            <Row
              label="Projects"
              value={invoice.projects.map((p) => p.title).join(", ")}
            />
          )}
          {invoice.notes && <Row label="Notes" value={invoice.notes} />}
        </CardContent>
      </Card>

      {invoice.balance > 0 && <RecordPaymentForm invoiceId={invoice.id} suggestedAmount={invoice.balance} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoice.payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
          {invoice.payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between border-b border-border/60 pb-2 text-sm last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{formatCurrency(payment.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {payment.method} · {formatDateTime(payment.paidAt)}
                  {payment.recordedByEmployee && ` · ${payment.recordedByEmployee.displayName ?? payment.recordedByEmployee.fullName}`}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
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
