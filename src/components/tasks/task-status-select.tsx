"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskStatusValues } from "@/lib/validation/task";
import type { TaskStatus } from "@/generated/prisma/enums";

const labels: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(next) => {
        startTransition(async () => {
          try {
            await updateTaskStatus(taskId, next as TaskStatus);
          } catch {
            toast.error("Couldn't update task.");
          }
        });
      }}
    >
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TaskStatusValues.map((val) => (
          <SelectItem key={val} value={val}>
            {labels[val]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
