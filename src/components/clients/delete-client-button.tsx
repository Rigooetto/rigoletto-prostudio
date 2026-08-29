"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteClient } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteClientButton({
  clientId,
  projectCount,
  sessionCount,
}: {
  clientId: string;
  projectCount: number;
  sessionCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const linkedParts = [
    projectCount > 0 ? `${projectCount} project${projectCount === 1 ? "" : "s"}` : null,
    sessionCount > 0 ? `${sessionCount} session${sessionCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

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
          <DialogTitle>Delete this client?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This can&apos;t be undone
          {linkedParts.length > 0 ? `, along with ${linkedParts.join(" and ")} still linked to it` : ""}. Blocked
          automatically if any of that has a paid session, a paid invoice, or logged production work — that gets
          protected instead of deleted.
        </p>
        <DialogFooter showCloseButton>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await deleteClient(clientId);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't delete client.");
                }
              });
            }}
          >
            {pending ? "Deleting..." : "Delete Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
