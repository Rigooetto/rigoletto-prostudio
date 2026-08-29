import "server-only";
import { prisma } from "@/lib/db";
import { startOfMonth, startOfYear } from "@/lib/dates";

// invoiceId: null excludes sessions billed through an Invoice instead of
// paid on the spot — that revenue is counted once, via invoicePaymentsSince,
// not again here off the session's own (usually $0) amount.
async function sessionRevenueSince(since: Date) {
  const result = await prisma.session.aggregate({
    where: { paymentStatus: "PAID", invoiceId: null, startsAt: { gte: since } },
    _sum: { amountBase: true },
  });
  return Number(result._sum.amountBase ?? 0);
}

async function invoicePaymentsSince(since: Date) {
  const result = await prisma.payment.aggregate({
    where: { paidAt: { gte: since } },
    _sum: { amountBase: true },
  });
  return Number(result._sum.amountBase ?? 0);
}

async function expensesSince(since: Date) {
  const result = await prisma.expense.aggregate({
    where: { date: { gte: since } },
    _sum: { amountBase: true },
  });
  return Number(result._sum.amountBase ?? 0);
}

async function expensesByCategorySince(since: Date, category: string) {
  const result = await prisma.expense.aggregate({
    where: { date: { gte: since }, category: category as never },
    _sum: { amountBase: true },
  });
  return Number(result._sum.amountBase ?? 0);
}

export async function getFinancialSummary() {
  const monthStart = startOfMonth();
  const yearStart = startOfYear();

  const [
    monthSessionRevenue,
    monthInvoiceRevenue,
    yearSessionRevenue,
    yearInvoiceRevenue,
    monthExpenses,
    yearExpenses,
    monthPayroll,
    monthMarketing,
  ] = await Promise.all([
    sessionRevenueSince(monthStart),
    invoicePaymentsSince(monthStart),
    sessionRevenueSince(yearStart),
    invoicePaymentsSince(yearStart),
    expensesSince(monthStart),
    expensesSince(yearStart),
    expensesByCategorySince(monthStart, "PAYROLL"),
    expensesByCategorySince(monthStart, "ADVERTISING"),
  ]);

  const monthRevenue = monthSessionRevenue + monthInvoiceRevenue;
  const yearRevenue = yearSessionRevenue + yearInvoiceRevenue;

  return {
    monthRevenue,
    yearRevenue,
    monthExpenses,
    yearExpenses,
    monthPayroll,
    monthMarketing,
    monthOperatingProfit: monthRevenue - monthExpenses,
    yearOperatingProfit: yearRevenue - yearExpenses,
  };
}

export async function getOutstandingInvoicesTotal() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] } },
    include: { payments: true },
  });
  return invoices.reduce((sum, invoice) => {
    const paid = invoice.payments.reduce((s, p) => s + Number(p.amountBase ?? p.amount), 0);
    return sum + (Number(invoice.total) - paid);
  }, 0);
}
