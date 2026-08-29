"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { EmployeeSchema } from "@/lib/validation/employee";

export type EmployeeFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

function parseEmployeeForm(formData: FormData) {
  return EmployeeSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    displayName: formData.get("displayName"),
    roleId: formData.get("roleId"),
    basePayWeekly: formData.get("basePayWeekly"),
    acquisitionCommissionPercent: formData.get("acquisitionCommissionPercent"),
    password: formData.get("password"),
  });
}

export async function createEmployee(_prevState: EmployeeFormState, formData: FormData): Promise<EmployeeFormState> {
  await requireRole("ADMIN");

  const validated = parseEmployeeForm(formData);
  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;
  if (!data.password) {
    return { error: "Password is required for a new employee." };
  }

  const existing = await prisma.employee.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "An employee with this email already exists." };
  }

  await prisma.employee.create({
    data: {
      email: data.email,
      fullName: data.fullName,
      displayName: data.displayName || undefined,
      roleId: data.roleId,
      basePayWeekly: data.basePayWeekly ?? undefined,
      acquisitionCommissionPercent: data.acquisitionCommissionPercent ?? undefined,
      passwordHash: await bcrypt.hash(data.password, 10),
      active: true,
    },
  });

  revalidatePath("/settings/users");
}

export async function updateEmployee(
  employeeId: string,
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  await requireRole("ADMIN");

  const validated = parseEmployeeForm(formData);
  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      email: data.email,
      fullName: data.fullName,
      displayName: data.displayName || undefined,
      roleId: data.roleId,
      basePayWeekly: data.basePayWeekly ?? null,
      acquisitionCommissionPercent: data.acquisitionCommissionPercent ?? null,
      active: formData.get("active") === "on",
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
    },
  });

  revalidatePath("/settings/users");
}
