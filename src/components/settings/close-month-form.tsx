"use client";

import { useActionState } from "react";
import { closeCurrentMonth, type CloseMonthState } from "@/lib/actions/month-end-close";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function CloseMonthForm() {
  const [state, formAction, pending] = useActionState<CloseMonthState, FormData>(closeCurrentMonth, undefined);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Anything worth remembering about this month's close..." />
      </div>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Closing..." : "Close This Month"}
      </Button>
    </form>
  );
}
