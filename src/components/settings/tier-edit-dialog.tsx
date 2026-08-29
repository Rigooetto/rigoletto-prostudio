"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  updateProductionTier,
  updateRevenueBonusTier,
  updateServiceCompensation,
  updateEmployeeCompensation,
  type TierFormState,
} from "@/lib/actions/compensation-tiers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PlainProductionTier, PlainRevenueBonusTier, PlainService, PlainEmployee } from "@/lib/serialize";

function useAutoClose(pending: boolean, hasError: boolean, setOpen: (v: boolean) => void) {
  const hasSubmitted = useRef(false);
  useEffect(() => {
    if (pending) hasSubmitted.current = true;
    if (!pending && hasSubmitted.current && !hasError) {
      setOpen(false);
      hasSubmitted.current = false;
    }
  }, [pending, hasError, setOpen]);
}

export function ProductionTierEditDialog({ tier }: { tier: PlainProductionTier }) {
  const [open, setOpen] = useState(false);
  const action = updateProductionTier.bind(null, tier.id);
  const [state, formAction, pending] = useActionState<TierFormState, FormData>(action, undefined);
  useAutoClose(pending, Boolean(state?.error), setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Production Tier</DialogTitle>
        </DialogHeader>
        <form key={`${tier.songsFrom}-${tier.songsTo}-${tier.amountPerSong}`} action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="songsFrom" className="text-xs">From (song #)</Label>
              <Input id="songsFrom" name="songsFrom" type="number" min="1" defaultValue={tier.songsFrom} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="songsTo" className="text-xs">To (blank = no limit)</Label>
              <Input id="songsTo" name="songsTo" type="number" min="1" defaultValue={tier.songsTo ?? undefined} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="amountPerSong" className="text-xs">Amount per song (USD)</Label>
            <Input id="amountPerSong" name="amountPerSong" type="number" step="0.01" min="0" defaultValue={Number(tier.amountPerSong)} required />
          </div>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RevenueBonusTierEditDialog({ tier }: { tier: PlainRevenueBonusTier }) {
  const [open, setOpen] = useState(false);
  const action = updateRevenueBonusTier.bind(null, tier.id);
  const [state, formAction, pending] = useActionState<TierFormState, FormData>(action, undefined);
  useAutoClose(pending, Boolean(state?.error), setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Revenue Bonus Tier</DialogTitle>
        </DialogHeader>
        <form key={`${tier.revenueFrom}-${tier.revenueTo}-${tier.bonusAmount}`} action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="revenueFrom" className="text-xs">From (USD)</Label>
              <Input id="revenueFrom" name="revenueFrom" type="number" step="0.01" min="0" defaultValue={Number(tier.revenueFrom)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="revenueTo" className="text-xs">To (blank = no limit)</Label>
              <Input id="revenueTo" name="revenueTo" type="number" step="0.01" min="0" defaultValue={tier.revenueTo ? Number(tier.revenueTo) : undefined} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="bonusAmount" className="text-xs">Bonus Amount (USD)</Label>
            <Input id="bonusAmount" name="bonusAmount" type="number" step="0.01" min="0" defaultValue={Number(tier.bonusAmount)} required />
          </div>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ServiceCompensationEditDialog({ service }: { service: PlainService }) {
  const [open, setOpen] = useState(false);
  const action = updateServiceCompensation.bind(null, service.id);
  const [state, formAction, pending] = useActionState<TierFormState, FormData>(action, undefined);
  useAutoClose(pending, Boolean(state?.error), setOpen);

  const isPercent = service.compensationType === "PERCENT_REVENUE";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit {service.serviceName} Rate</DialogTitle>
        </DialogHeader>
        <form key={`${service.id}-${service.compensationValue}`} action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="compensationValue" className="text-xs">
              {isPercent ? "Percent of session revenue" : "Amount per delivered track (USD)"}
            </Label>
            <Input
              id="compensationValue"
              name="compensationValue"
              type="number"
              step="0.01"
              min="0"
              max={isPercent ? 100 : undefined}
              defaultValue={service.compensationValue ?? 0}
              required
            />
          </div>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EmployeeCompensationEditDialog({ employee }: { employee: PlainEmployee }) {
  const [open, setOpen] = useState(false);
  const action = updateEmployeeCompensation.bind(null, employee.id);
  const [state, formAction, pending] = useActionState<TierFormState, FormData>(action, undefined);
  useAutoClose(pending, Boolean(state?.error), setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit {employee.displayName ?? employee.fullName}&apos;s Pay Rates</DialogTitle>
        </DialogHeader>
        <form key={`${employee.id}-${employee.basePayWeekly}-${employee.acquisitionCommissionPercent}`} action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="basePayWeekly" className="text-xs">Base Pay (per week, USD)</Label>
            <Input
              id="basePayWeekly"
              name="basePayWeekly"
              type="number"
              step="0.01"
              min="0"
              defaultValue={employee.basePayWeekly ?? 0}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="acquisitionCommissionPercent" className="text-xs">
              New Client Acquisition Commission (%)
            </Label>
            <Input
              id="acquisitionCommissionPercent"
              name="acquisitionCommissionPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={employee.acquisitionCommissionPercent ?? 0}
              required
            />
          </div>
          {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
