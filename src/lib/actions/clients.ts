"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { ClientSchema, ArtistSchema } from "@/lib/validation/client";
import { computeClientPhoneE164 } from "@/lib/phone";

export type ClientFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

function emptyToUndefined(value: string) {
  return value === "" ? undefined : value;
}

export async function createClient(_prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  // Both Admin and Studio Manager can create clients — clients are shared
  // operational data (Turi originates and manages clients too, per spec).
  await requireEmployee();

  const validated = ClientSchema.safeParse({
    displayName: formData.get("displayName"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    instagramHandle: formData.get("instagramHandle"),
    leadSourceId: formData.get("leadSourceId"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }

  const employee = await requireEmployee();
  const data = validated.data;

  const client = await prisma.client.create({
    data: {
      displayName: data.displayName,
      contactName: emptyToUndefined(data.contactName ?? ""),
      phone: emptyToUndefined(data.phone ?? ""),
      phoneE164: computeClientPhoneE164(data.phone),
      email: emptyToUndefined(data.email ?? ""),
      instagramHandle: emptyToUndefined(data.instagramHandle ?? ""),
      leadSourceId: emptyToUndefined(data.leadSourceId ?? ""),
      notes: emptyToUndefined(data.notes ?? ""),
      originatedByEmployeeId: employee.id,
      firstVisitAt: new Date(),
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  await requireEmployee();

  const validated = ClientSchema.safeParse({
    displayName: formData.get("displayName"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    instagramHandle: formData.get("instagramHandle"),
    leadSourceId: formData.get("leadSourceId"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      displayName: data.displayName,
      contactName: emptyToUndefined(data.contactName ?? ""),
      phone: emptyToUndefined(data.phone ?? ""),
      phoneE164: computeClientPhoneE164(data.phone),
      email: emptyToUndefined(data.email ?? ""),
      instagramHandle: emptyToUndefined(data.instagramHandle ?? ""),
      leadSourceId: emptyToUndefined(data.leadSourceId ?? ""),
      notes: emptyToUndefined(data.notes ?? ""),
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function deleteClient(clientId: string) {
  await requireEmployee();

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: {
      projects: { include: { tracks: true } },
      sessions: true,
      invoices: { include: { payments: true } },
      quotes: true,
      tasks: true,
    },
  });

  // Same bar as deleteProject: real production work or real money changing
  // hands is a record worth protecting, not something to lose as a side
  // effect of cleaning up a mis-added client.
  const hasTrackProgress = client.projects.some((p) =>
    p.tracks.some((t) => t.status !== "PENDING" || t.editedAt || t.mixedAt || t.masteredAt || t.deliveredAt)
  );
  if (hasTrackProgress) {
    throw new Error(
      "Can't delete a client with production work logged on a project — reset the tracks to Pending first if you're sure, or leave the client as-is."
    );
  }

  const hasSessionActivity = client.sessions.some((s) => s.paymentStatus !== "UNPAID");
  if (hasSessionActivity) {
    throw new Error(
      "Can't delete a client with a paid, partially-paid, or refunded session — that's real collected revenue. Handle those sessions individually first."
    );
  }

  const hasInvoicePayments = client.invoices.some((inv) => inv.payments.length > 0);
  if (hasInvoicePayments) {
    throw new Error("Can't delete a client with a paid or partially-paid invoice — handle that invoice first.");
  }

  const projectIds = client.projects.map((p) => p.id);

  await prisma.$transaction([
    // Tasks reference clients/projects directly (Task -> Client/Project FK), must go first.
    prisma.task.deleteMany({
      where: { OR: [{ relatedClientId: clientId }, { relatedProjectId: { in: projectIds } }] },
    }),
    // Whatever sessions remain are plain UNPAID (verified above) — safe to remove.
    prisma.session.deleteMany({ where: { clientId } }),
    // Projects reference Quote/Invoice by id, so they must go before those —
    // ProjectTrack rows cascade automatically.
    prisma.project.deleteMany({ where: { clientId } }),
    prisma.quote.deleteMany({ where: { clientId } }),
    // Verified above to have zero payments.
    prisma.invoice.deleteMany({ where: { clientId } }),
    // Preserve the lead's own history — just decouple it instead of deleting it.
    prisma.lead.updateMany({ where: { convertedClientId: clientId }, data: { convertedClientId: null } }),
    // Artist rows cascade automatically (Client -> Artist is onDelete: Cascade).
    prisma.client.delete({ where: { id: clientId } }),
  ]);

  revalidatePath("/clients");
  redirect("/clients");
}

export type ArtistFormState = { error?: string } | undefined;

export async function createArtist(_prevState: ArtistFormState, formData: FormData): Promise<ArtistFormState> {
  await requireEmployee();

  const validated = ArtistSchema.safeParse({
    clientId: formData.get("clientId"),
    stageName: formData.get("stageName"),
    genre: formData.get("genre"),
  });

  if (!validated.success) {
    return { error: "Enter a stage name." };
  }

  const data = validated.data;

  await prisma.artist.create({
    data: {
      clientId: data.clientId,
      stageName: data.stageName,
      genre: emptyToUndefined(data.genre ?? ""),
    },
  });

  revalidatePath(`/clients/${data.clientId}`);
}
