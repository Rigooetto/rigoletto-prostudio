"use client";

import { useActionState } from "react";
import { updateCompensationAdjustment, type AdjustmentFormState } from "@/lib/actions/compensation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdjustmentForm({
  periodId,
  adjustments,
  adjustmentNotes,
}: {
  periodId: string;
  adjustments: number;
  adjustmentNotes: string | null;
}) {
  const action = updateCompensationAdjustment.bind(null, periodId);
  const [state, formAction, pending] = useActionState<AdjustmentFormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium">Manual Adjustment</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="adjustments" className="text-xs">Amount (+/-)</Label>
          <Input id="adjustments" name="adjustments" type="number" step="0.01" defaultValue={adjustments} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="adjustmentNotes" className="text-xs">Reason</Label>
          <Textarea id="adjustmentNotes" name="adjustmentNotes" rows={1} defaultValue={adjustmentNotes ?? ""} />
        </div>
      </div>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save Adjustment"}
      </Button>
    </form>
  );
}
