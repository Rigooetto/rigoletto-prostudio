import "server-only";
import { prisma } from "@/lib/db";

export async function listTasks() {
  return prisma.task.findMany({
    include: { assignedToEmployee: true, relatedProject: true, relatedLead: true, relatedClient: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });
}

export async function listOpenTasksForEmployee(employeeId: string) {
  return prisma.task.findMany({
    where: { assignedToEmployeeId: employeeId, status: { not: "DONE" } },
    orderBy: { dueAt: "asc" },
  });
}

export async function countOverdueTasks() {
  return prisma.task.count({
    where: { status: { not: "DONE" }, dueAt: { lt: new Date() } },
  });
}
