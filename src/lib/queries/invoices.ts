import "server-only";
import { prisma } from "@/lib/db";

export async function listInvoices() {
  const invoices = await prisma.invoice.findMany({
    include: { client: true, payments: true },
    orderBy: { issueDate: "desc" },
  });

  return invoices.map((invoice) => {
    const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amountBase ?? p.amount), 0);
    return { ...invoice, paidAmount: paid, balance: Number(invoice.total) - paid };
  });
}

export async function getInvoiceDetail(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      projects: true,
      sessions: true,
      payments: { include: { recordedByEmployee: true }, orderBy: { paidAt: "desc" } },
    },
  });
  if (!invoice) return null;

  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amountBase ?? p.amount), 0);
  return { ...invoice, paidAmount: paid, balance: Number(invoice.total) - paid };
}
