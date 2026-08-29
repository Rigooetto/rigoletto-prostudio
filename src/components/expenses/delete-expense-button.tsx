"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteExpenseButton({ expenseId, vendor }: { expenseId: string; vendor: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this expense?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This removes the &quot;{vendor}&quot; expense record. This can&apos;t be undone.
        </p>
        <DialogFooter showCloseButton>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await deleteExpense(expenseId);
                  setOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't delete expense.");
                }
              });
            }}
          >
            {pending ? "Deleting..." : "Delete Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
