"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { approveCompensationPeriod, markCompensationPeriodPaid } from "@/lib/actions/compensation";
import { Button } from "@/components/ui/button";
import type { CompensationPeriodStatus } from "@/generated/prisma/enums";

export function PeriodActions({ periodId, status }: { periodId: string; status: CompensationPeriodStatus }) {
  const [pending, startTransition] = useTransition();

  if (status === "PAID") {
    return <span className="text-xs text-muted-foreground">Paid</span>;
  }

  if (status === "DRAFT") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await approveCompensationPeriod(periodId);
              toast.success("Period approved.");
            } catch {
              toast.error("Couldn't approve this period.");
            }
          })
        }
      >
        {pending ? "Approving..." : "Approve"}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await markCompensationPeriodPaid(periodId);
            if (result?.error) toast.error(result.error);
            else toast.success("Marked as paid.");
          } catch {
            toast.error("Couldn't update this period.");
          }
        })
      }
    >
      {pending ? "Saving..." : "Mark Paid"}
    </Button>
  );
}
