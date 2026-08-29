"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { CampaignSchema } from "@/lib/validation/campaign";

export type CampaignFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function createCampaign(_prevState: CampaignFormState, formData: FormData): Promise<CampaignFormState> {
  await requireRole("ADMIN");

  const validated = CampaignSchema.safeParse({
    name: formData.get("name"),
    month: formData.get("month"),
    spend: formData.get("spend"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;
  const [year, month] = data.month.split("-").map(Number);

  await prisma.campaign.create({
    data: {
      name: data.name,
      month: new Date(year, month - 1, 1),
      spend: data.spend,
      spendBase: data.spend,
      notes: data.notes,
    },
  });

  revalidatePath("/marketing");
}
