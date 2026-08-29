"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteProjectButton({ projectId, unpaidSessionCount }: { projectId: string; unpaidSessionCount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="destructive">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this project?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This can&apos;t be undone. All tracks will be removed
          {unpaidSessionCount > 0
            ? `, along with ${unpaidSessionCount} unpaid session${unpaidSessionCount === 1 ? "" : "s"} still linked to it`
            : ""}
          .
        </p>
        <DialogFooter showCloseButton>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await deleteProject(projectId);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't delete project.");
                }
              });
            }}
          >
            {pending ? "Deleting..." : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
