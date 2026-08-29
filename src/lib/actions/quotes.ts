"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { QuoteSchema } from "@/lib/validation/quote";
import type { QuoteStatus } from "@/generated/prisma/enums";

export type QuoteFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function createQuote(_prevState: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  await requireEmployee();

  const validated = QuoteSchema.safeParse({
    leadId: formData.get("leadId"),
    clientId: formData.get("clientId"),
    serviceId: formData.get("serviceId"),
    amount: formData.get("amount"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  if (!data.leadId && !data.clientId) {
    return { error: "A quote needs either a lead or a client." };
  }

  const quote = await prisma.quote.create({
    data: {
      leadId: data.leadId,
      clientId: data.clientId,
      serviceId: data.serviceId,
      amount: data.amount,
      amountBase: data.amount,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      notes: data.notes,
    },
  });

  if (data.leadId) {
    await prisma.lead.update({ where: { id: data.leadId }, data: { stage: "QUOTED" } });
  }

  revalidatePath("/quotes");
  if (data.leadId) revalidatePath(`/leads/${data.leadId}`);
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
  await requireEmployee();

  const data: { status: QuoteStatus; sentAt?: Date; respondedAt?: Date } = { status };
  if (status === "SENT") data.sentAt = new Date();
  if (status === "ACCEPTED" || status === "DECLINED") data.respondedAt = new Date();

  const quote = await prisma.quote.update({ where: { id: quoteId }, data });

  if (status === "ACCEPTED" && quote.leadId) {
    await prisma.lead.update({ where: { id: quote.leadId }, data: { stage: "BOOKED" } });
  }

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
}

export type ConvertQuoteState = { error?: string } | undefined;

export async function convertQuoteToProject(
  quoteId: string,
  _prevState: ConvertQuoteState,
  formData: FormData
): Promise<ConvertQuoteState> {
  await requireEmployee();

  const quote = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { lead: true } });

  let clientId = quote.clientId;
  if (!clientId && quote.lead?.convertedClientId) clientId = quote.lead.convertedClientId;
  if (!clientId) {
    return { error: "Convert the lead to a client first." };
  }

  const trackCount = Number(formData.get("trackCount") || "1");
  const title = String(formData.get("title") || "New Project");

  const project = await prisma.project.create({
    data: {
      clientId,
      primaryServiceId: quote.serviceId,
      title,
      status: "BOOKED",
      trackCount,
      quotedPrice: quote.amount,
      quotedPriceBase: quote.amountBase,
      quoteId: quote.id,
      tracks: {
        create: Array.from({ length: trackCount }, (_, i) => ({ trackNumber: i + 1 })),
      },
    },
  });

  revalidatePath("/quotes");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}
