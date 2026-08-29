"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { LeadSchema } from "@/lib/validation/lead";
import type { LeadStage } from "@/generated/prisma/enums";

export type LeadFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function createLead(_prevState: LeadFormState, formData: FormData): Promise<LeadFormState> {
  await requireEmployee();

  const validated = LeadSchema.safeParse({
    name: formData.get("name"),
    artistName: formData.get("artistName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    instagramHandle: formData.get("instagramHandle"),
    leadSourceId: formData.get("leadSourceId"),
    interestedServiceId: formData.get("interestedServiceId"),
    estimatedValue: formData.get("estimatedValue"),
    probability: formData.get("probability") || "50",
    nextFollowUpAt: formData.get("nextFollowUpAt"),
    ownerEmployeeId: formData.get("ownerEmployeeId"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      artistName: data.artistName,
      phone: data.phone,
      email: data.email,
      instagramHandle: data.instagramHandle,
      leadSourceId: data.leadSourceId,
      interestedServiceId: data.interestedServiceId,
      estimatedValue: data.estimatedValue,
      probability: data.probability,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
      ownerEmployeeId: data.ownerEmployeeId,
      notes: data.notes,
    },
  });

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadStage(leadId: string, stage: LeadStage) {
  await requireEmployee();

  const now = new Date();
  const data: { stage: LeadStage; firstContactedAt?: Date; lastContactedAt?: Date } = { stage };
  if (stage !== "NEW") {
    data.lastContactedAt = now;
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { firstContactedAt: true } });
    if (!lead?.firstContactedAt) data.firstContactedAt = now;
  }

  await prisma.lead.update({ where: { id: leadId }, data });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function updateLead(leadId: string, _prevState: LeadFormState, formData: FormData): Promise<LeadFormState> {
  await requireEmployee();

  const validated = LeadSchema.safeParse({
    name: formData.get("name"),
    artistName: formData.get("artistName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    instagramHandle: formData.get("instagramHandle"),
    leadSourceId: formData.get("leadSourceId"),
    interestedServiceId: formData.get("interestedServiceId"),
    estimatedValue: formData.get("estimatedValue"),
    probability: formData.get("probability") || "50",
    nextFollowUpAt: formData.get("nextFollowUpAt"),
    ownerEmployeeId: formData.get("ownerEmployeeId"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      name: data.name,
      artistName: data.artistName,
      phone: data.phone,
      email: data.email,
      instagramHandle: data.instagramHandle,
      leadSourceId: data.leadSourceId,
      interestedServiceId: data.interestedServiceId,
      estimatedValue: data.estimatedValue,
      probability: data.probability,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      ownerEmployeeId: data.ownerEmployeeId,
      notes: data.notes,
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function convertLeadToClient(leadId: string) {
  await requireEmployee();

  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (lead.convertedClientId) {
    redirect(`/clients/${lead.convertedClientId}`);
  }

  const client = await prisma.client.create({
    data: {
      displayName: lead.artistName || lead.name,
      contactName: lead.name,
      phone: lead.phone,
      email: lead.email,
      instagramHandle: lead.instagramHandle,
      leadSourceId: lead.leadSourceId,
      originatedByEmployeeId: lead.ownerEmployeeId,
      firstVisitAt: new Date(),
      notes: lead.notes,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { stage: "WON", convertedClientId: client.id },
  });

  revalidatePath("/leads");
  redirect(`/clients/${client.id}`);
}
