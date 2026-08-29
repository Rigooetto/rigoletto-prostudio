"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createCampaign, type CampaignFormState } from "@/lib/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function CampaignDialog() {
  const [open, setOpen] = useState(false);
  const hasSubmitted = useRef(false);
  const [state, formAction, pending] = useActionState<CampaignFormState, FormData>(createCampaign, undefined);

  useEffect(() => {
    if (pending) hasSubmitted.current = true;
    if (!pending && hasSubmitted.current && !state?.error) {
      setOpen(false);
      hasSubmitted.current = false;
    }
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><Plus className="h-4 w-4" />New Campaign</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Campaign</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input id="name" name="name" placeholder="e.g. Meta Ads - August" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month *</Label>
              <Input id="month" name="month" type="month" defaultValue={currentMonthValue()} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spend">Spend (USD) *</Label>
              <Input id="spend" name="spend" type="number" step="0.01" min="0" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create Campaign"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
