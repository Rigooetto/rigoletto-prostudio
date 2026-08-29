"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { updateProjectStatus } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import type { ProjectStatus } from "@/generated/prisma/enums";

export function ProjectStatusSuggestionBanner({
  projectId,
  suggestedStatus,
  suggestedLabel,
}: {
  projectId: string;
  suggestedStatus: ProjectStatus;
  suggestedLabel: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (dismissed) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
      <p className="text-primary">
        All tracks have reached the next stage — advance this project to <span className="font-medium">{suggestedLabel}</span>?
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              try {
                await updateProjectStatus(projectId, suggestedStatus);
                toast.success(`Project advanced to ${suggestedLabel}.`);
              } catch {
                toast.error("Couldn't update project status.");
              }
            });
          }}
        >
          {pending ? "Advancing..." : `Advance to ${suggestedLabel}`}
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => setDismissed(true)} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
