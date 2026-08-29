"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateProjectStatus } from "@/lib/actions/projects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectStatusValues } from "@/lib/validation/project";
import { PROJECT_STATUS_LABELS } from "@/lib/track-status";
import type { ProjectStatus } from "@/generated/prisma/enums";

export function ProjectStatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(next) => {
        startTransition(async () => {
          try {
            await updateProjectStatus(projectId, next as ProjectStatus);
          } catch {
            toast.error("Couldn't update status.");
          }
        });
      }}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ProjectStatusValues.map((val) => (
          <SelectItem key={val} value={val}>
            {PROJECT_STATUS_LABELS[val]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
