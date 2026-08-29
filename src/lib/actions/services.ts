"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { ServiceSchema } from "@/lib/validation/service";

export type ServiceFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

function parseServiceForm(formData: FormData) {
  return ServiceSchema.safeParse({
    serviceName: formData.get("serviceName"),
    serviceCategory: formData.get("serviceCategory"),
    billingType: formData.get("billingType"),
    defaultPrice: formData.get("defaultPrice"),
    defaultDurationMinutes: formData.get("defaultDurationMinutes"),
    compensationType: formData.get("compensationType"),
    compensationValue: formData.get("compensationValue"),
  });
}

export async function createService(_prevState: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  await requireRole("ADMIN");

  const validated = parseServiceForm(formData);
  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  await prisma.service.create({
    data: {
      serviceName: data.serviceName,
      serviceCategory: data.serviceCategory || undefined,
      billingType: data.billingType,
      defaultPrice: data.defaultPrice,
      defaultDurationMinutes: data.defaultDurationMinutes ?? undefined,
      compensationType: data.compensationType,
      compensationValue: data.compensationValue ?? undefined,
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/settings/services");
}

export async function updateService(
  serviceId: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  await requireRole("ADMIN");

  const validated = parseServiceForm(formData);
  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      serviceName: data.serviceName,
      serviceCategory: data.serviceCategory || undefined,
      billingType: data.billingType,
      defaultPrice: data.defaultPrice,
      defaultDurationMinutes: data.defaultDurationMinutes ?? null,
      compensationType: data.compensationType,
      compensationValue: data.compensationValue ?? null,
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/settings/services");
}

export async function toggleServiceActive(serviceId: string, active: boolean) {
  await requireRole("ADMIN");
  await prisma.service.update({ where: { id: serviceId }, data: { active } });
  revalidatePath("/settings/services");
}
