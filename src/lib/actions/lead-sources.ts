"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { LeadSourceSchema } from "@/lib/validation/lead-source";

export type LeadSourceFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

function parseLeadSourceForm(formData: FormData) {
  return LeadSourceSchema.safeParse({
    code: formData.get("code"),
    label: formData.get("label"),
  });
}

export async function createLeadSource(
  _prevState: LeadSourceFormState,
  formData: FormData
): Promise<LeadSourceFormState> {
  await requireRole("ADMIN");

  const validated = parseLeadSourceForm(formData);
  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }

  await prisma.leadSource.create({
    data: {
      code: validated.data.code.toUpperCase(),
      label: validated.data.label,
      isMarketingChannel: formData.get("isMarketingChannel") === "on",
      eligibleForAcquisitionCommission: formData.get("eligibleForAcquisitionCommission") === "on",
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/settings/lead-sources");
}

export async function updateLeadSource(
  leadSourceId: string,
  _prevState: LeadSourceFormState,
  formData: FormData
): Promise<LeadSourceFormState> {
  await requireRole("ADMIN");

  const validated = parseLeadSourceForm(formData);
  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }

  await prisma.leadSource.update({
    where: { id: leadSourceId },
    data: {
      code: validated.data.code.toUpperCase(),
      label: validated.data.label,
      isMarketingChannel: formData.get("isMarketingChannel") === "on",
      eligibleForAcquisitionCommission: formData.get("eligibleForAcquisitionCommission") === "on",
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/settings/lead-sources");
}
