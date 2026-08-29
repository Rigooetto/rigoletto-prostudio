"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { TaskSchema } from "@/lib/validation/task";
import type { TaskStatus } from "@/generated/prisma/enums";

export type TaskFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function createTask(_prevState: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const employee = await requireEmployee();

  const validated = TaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dueAt: formData.get("dueAt"),
    assignedToEmployeeId: formData.get("assignedToEmployeeId"),
    relatedProjectId: formData.get("relatedProjectId"),
    relatedLeadId: formData.get("relatedLeadId"),
    relatedClientId: formData.get("relatedClientId"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      assignedToEmployeeId: data.assignedToEmployeeId,
      relatedProjectId: data.relatedProjectId,
      relatedLeadId: data.relatedLeadId,
      relatedClientId: data.relatedClientId,
      createdByEmployeeId: employee.id,
    },
  });

  revalidatePath("/tasks");
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  await requireEmployee();

  await prisma.task.update({
    where: { id: taskId },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });

  revalidatePath("/tasks");
}
