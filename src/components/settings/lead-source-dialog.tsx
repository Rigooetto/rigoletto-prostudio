"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createLeadSource, updateLeadSource, type LeadSourceFormState } from "@/lib/actions/lead-sources";
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
import type { LeadSource } from "@/generated/prisma/client";

export function LeadSourceDialog({ leadSource }: { leadSource?: LeadSource }) {
  const [open, setOpen] = useState(false);
  const hasSubmitted = useRef(false);
  const action = leadSource ? updateLeadSource.bind(null, leadSource.id) : createLeadSource;
  const [state, formAction, pending] = useActionState<LeadSourceFormState, FormData>(action, undefined);

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
          leadSource ? (
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button>
              <Plus className="h-4 w-4" />
              New Lead Source
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{leadSource ? "Edit Lead Source" : "New Lead Source"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" defaultValue={leadSource?.code} placeholder="e.g. TIKTOK" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Label *</Label>
            <Input id="label" name="label" defaultValue={leadSource?.label} required />
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <input
                id="isMarketingChannel"
                name="isMarketingChannel"
                type="checkbox"
                defaultChecked={leadSource?.isMarketingChannel ?? false}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isMarketingChannel" className="font-normal">
                Paid/organic marketing channel
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="eligibleForAcquisitionCommission"
                name="eligibleForAcquisitionCommission"
                type="checkbox"
                defaultChecked={leadSource?.eligibleForAcquisitionCommission ?? false}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="eligibleForAcquisitionCommission" className="font-normal">
                Eligible for Customer Acquisition Commission
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={leadSource ? leadSource.active : true}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="active" className="font-normal">
                Active
              </Label>
            </div>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : leadSource ? "Save Changes" : "Create Lead Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
