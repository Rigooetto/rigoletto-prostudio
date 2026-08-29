"use client";

import { useActionState } from "react";
import { createQuote, type QuoteFormState } from "@/lib/actions/quotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CancelLink } from "@/components/shared/cancel-link";
import type { Client, Lead } from "@/generated/prisma/client";
import type { PlainService } from "@/lib/serialize";

export function QuoteForm({
  leads,
  clients,
  services,
  defaultLeadId,
  defaultClientId,
  cancelHref,
}: {
  leads: Pick<Lead, "id" | "name" | "artistName">[];
  clients: Client[];
  services: PlainService[];
  defaultLeadId?: string;
  defaultClientId?: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(createQuote, undefined);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-border bg-card p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="leadId">Lead</Label>
          <Select name="leadId" defaultValue={defaultLeadId}>
            <SelectTrigger id="leadId" className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {leads.map((lead) => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.artistName || lead.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientId">Client</Label>
          <Select name="clientId" defaultValue={defaultClientId}>
            <SelectTrigger id="clientId" className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Set a lead or a client (or both) for this quote.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="serviceId">Service *</Label>
          <Select name="serviceId">
            <SelectTrigger id="serviceId" className="w-full">
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.serviceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD) *</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="validUntil">Valid Until</Label>
        <Input id="validUntil" name="validUntil" type="date" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <CancelLink href={cancelHref} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create Quote"}
        </Button>
      </div>
    </form>
  );
}
