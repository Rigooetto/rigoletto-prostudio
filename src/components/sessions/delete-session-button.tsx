"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSession } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type OrphanableProject = { id: string; title: string } | null;
type OrphanableInvoice = { id: string; invoiceNumber: string } | null;
type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";

export function DeleteSessionButton({
  sessionId,
  orphanableProject,
  orphanableInvoice,
  paymentStatus,
  isAdmin,
}: {
  sessionId: string;
  orphanableProject: OrphanableProject;
  orphanableInvoice: OrphanableInvoice;
  paymentStatus: PaymentStatus;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleteProject, setDeleteProject] = useState(false);
  const [deleteInvoice, setDeleteInvoice] = useState(false);

  const isPaid = paymentStatus === "PAID";
  const blockedForNonAdmin = isPaid && !isAdmin;

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
          <DialogTitle>Delete this session?</DialogTitle>
        </DialogHeader>

        {blockedForNonAdmin ? (
          <p className="text-sm text-muted-foreground">
            This session is marked Paid — that&apos;s real collected revenue. Only an Admin can delete a paid
            session. Mark it Refunded first if you need to reverse the payment yourself, or ask an Admin.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              This can&apos;t be undone. The session and its engineer assignments will be permanently removed.
            </p>
            {isPaid && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
                This session is marked Paid — deleting it removes that revenue from the books. Any already-generated
                compensation for the affected month will be automatically recalculated.
              </p>
            )}
          </>
        )}

        {!blockedForNonAdmin && (orphanableProject || orphanableInvoice) && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">
              Nothing else is attached to these — safe to remove along with the session:
            </p>
            {orphanableProject && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deleteProject}
                  onChange={(e) => setDeleteProject(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Also delete the now-empty project &ldquo;{orphanableProject.title}&rdquo;
              </label>
            )}
            {orphanableInvoice && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deleteInvoice}
                  onChange={(e) => setDeleteInvoice(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Also delete the now-orphaned invoice {orphanableInvoice.invoiceNumber}
              </label>
            )}
          </div>
        )}

        <DialogFooter showCloseButton>
          {!blockedForNonAdmin && (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await deleteSession(sessionId, {
                      alsoDeleteProjectId: deleteProject ? (orphanableProject?.id ?? undefined) : undefined,
                      alsoDeleteInvoiceId: deleteInvoice ? (orphanableInvoice?.id ?? undefined) : undefined,
                    });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Couldn't delete session.");
                  }
                });
              }}
            >
              {pending ? "Deleting..." : "Delete Session"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
