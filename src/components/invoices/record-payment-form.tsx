"use client";

import { useActionState, useRef, useEffect } from "react";
import { recordPayment, type PaymentFormState } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentMethodValues } from "@/lib/validation/invoice";

export function RecordPaymentForm({ invoiceId, suggestedAmount }: { invoiceId: string; suggestedAmount: number }) {
  const action = recordPayment.bind(null, invoiceId);
  const [state, formAction, pending] = useActionState<PaymentFormState, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium">Record Payment</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="amount" className="text-xs">Amount</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0.01" defaultValue={suggestedAmount > 0 ? suggestedAmount : undefined} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="method" className="text-xs">Method</Label>
          <Select name="method" defaultValue="CASH">
            <SelectTrigger id="method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PaymentMethodValues.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="paidAt" className="text-xs">Date</Label>
          <Input id="paidAt" name="paidAt" type="date" />
        </div>
      </div>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Recording..." : "Record Payment"}
      </Button>
    </form>
  );
}
