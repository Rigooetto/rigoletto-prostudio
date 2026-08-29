"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createService, updateService, type ServiceFormState } from "@/lib/actions/services";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BillingTypeValues, CompensationTypeValues } from "@/lib/validation/service";
import type { PlainService } from "@/lib/serialize";

const billingTypeLabels: Record<(typeof BillingTypeValues)[number], string> = {
  PER_SONG: "Per Song",
  PER_HOUR: "Per Hour",
  PER_DAY: "Per Day",
  FIXED_PROJECT: "Fixed Project",
  CUSTOM: "Custom",
};

const compensationTypeLabels: Record<(typeof CompensationTypeValues)[number], string> = {
  NONE: "None",
  FIXED_AMOUNT: "Fixed Amount ($)",
  PERCENT_REVENUE: "Percent of Revenue (%)",
  TIERED_PRODUCTION: "Tiered Production (Phase 4)",
  CUSTOM: "Custom",
};

export function ServiceDialog({ service }: { service?: PlainService }) {
  const [open, setOpen] = useState(false);
  const hasSubmitted = useRef(false);
  const action = service ? updateService.bind(null, service.id) : createService;
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(action, undefined);

  useEffect(() => {
    if (pending) hasSubmitted.current = true;
    if (!pending && hasSubmitted.current && !state?.error) {
      setOpen(false);
      hasSubmitted.current = false;
    }
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          service ? (
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button>
              <Plus className="h-4 w-4" />
              New Service
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "New Service"}</DialogTitle>
        </DialogHeader>
        <form key={service?.updatedAt.toISOString() ?? "new"} action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serviceName">Service Name *</Label>
              <Input id="serviceName" name="serviceName" defaultValue={service?.serviceName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceCategory">Category</Label>
              <Input id="serviceCategory" name="serviceCategory" defaultValue={service?.serviceCategory ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="billingType">Billing Type *</Label>
              <Select name="billingType" defaultValue={service?.billingType ?? "PER_SONG"}>
                <SelectTrigger id="billingType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BillingTypeValues.map((val) => (
                    <SelectItem key={val} value={val}>
                      {billingTypeLabels[val]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPrice">Default Price (USD) *</Label>
              <Input
                id="defaultPrice"
                name="defaultPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={service ? Number(service.defaultPrice) : undefined}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultDurationMinutes">Default Duration (minutes)</Label>
            <Input
              id="defaultDurationMinutes"
              name="defaultDurationMinutes"
              type="number"
              min="0"
              defaultValue={service?.defaultDurationMinutes ?? undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="compensationType">Compensation Type *</Label>
              <Select name="compensationType" defaultValue={service?.compensationType ?? "NONE"}>
                <SelectTrigger id="compensationType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CompensationTypeValues.map((val) => (
                    <SelectItem key={val} value={val}>
                      {compensationTypeLabels[val]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compensationValue">Compensation Value</Label>
              <Input
                id="compensationValue"
                name="compensationValue"
                type="number"
                step="0.01"
                min="0"
                defaultValue={service?.compensationValue ? Number(service.compensationValue) : undefined}
                placeholder="$ or %"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked={service ? service.active : true}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active" className="font-normal">
              Active (visible when creating projects/sessions)
            </Label>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : service ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
