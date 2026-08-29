import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RoleCode } from "@/generated/prisma/enums";

/**
 * The single authorization boundary for every Server Action and query.
 * There is no Postgres RLS in this app — every read/write that needs to be
 * scoped by role or ownership must go through these helpers.
 */
export const getCurrentEmployee = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });
  if (!employee || !employee.active) return null;

  return employee;
});

export async function requireEmployee() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login");
  return employee;
}

export async function requireRole(role: RoleCode) {
  const employee = await requireEmployee();
  if (employee.role.code !== role) {
    throw new Error("Not authorized to perform this action.");
  }
  return employee;
}

export function isAdmin(roleCode: RoleCode) {
  return roleCode === "ADMIN";
}
