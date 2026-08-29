"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { InvoiceSchema, PaymentSchema } from "@/lib/validation/invoice";
import { logAudit } from "@/lib/services/audit";

export type InvoiceFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

async function nextInvoiceNumber() {
  const count = await prisma.invoice.count();
  return `INV-${String(count + 1).padStart(4, "0")}`;
}

export async function createInvoice(_prevState: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const employee = await requireEmployee();

  const validated = InvoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    projectId: formData.get("projectId"),
    total: formData.get("total"),
    depositAmount: formData.get("depositAmount"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(),
      clientId: data.clientId,
      total: data.total,
      totalBase: data.total,
      depositAmount: data.depositAmount,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      notes: data.notes,
      createdByEmployeeId: employee.id,
      projects: data.projectId ? { connect: { id: data.projectId } } : undefined,
    },
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export type PaymentFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function recordPayment(
  invoiceId: string,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const employee = await requireEmployee();

  const validated = PaymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method") || "CASH",
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      amount: data.amount,
      amountBase: data.amount,
      method: data.method,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
      notes: data.notes,
      recordedByEmployeeId: employee.id,
    },
  });
  await logAudit({
    employeeId: employee.id,
    action: "payment.recorded",
    entityType: "Invoice",
    entityId: invoiceId,
    newValue: { paymentId: payment.id, amount: data.amount, method: data.method },
  });

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { payments: true },
  });
  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amountBase ?? p.amount), 0);
  const status = totalPaid <= 0 ? "UNPAID" : totalPaid >= Number(invoice.total) ? "PAID" : "PARTIAL";

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}
