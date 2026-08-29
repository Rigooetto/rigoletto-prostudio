"use client";

import { useActionState } from "react";
import { createLead, updateLead, type LeadFormState } from "@/lib/actions/leads";
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
import type { LeadSource, Role } from "@/generated/prisma/client";
import type { PlainService, PlainEmployee, PlainLead } from "@/lib/serialize";

type EmployeeWithRole = PlainEmployee & { role: Role };

export function LeadForm({
  leadSources,
  services,
  employees,
  lead,
  cancelHref,
}: {
  leadSources: LeadSource[];
  services: PlainService[];
  employees: EmployeeWithRole[];
  lead?: PlainLead;
  cancelHref: string;
}) {
  const boundAction = lead ? updateLead.bind(null, lead.id) : createLead;
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-border bg-card p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Contact Name *</Label>
          <Input id="name" name="name" defaultValue={lead?.name} required />
          {state?.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="artistName">Artist / Company</Label>
          <Input id="artistName" name="artistName" defaultValue={lead?.artistName ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={lead?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={lead?.email ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagramHandle">Instagram</Label>
          <Input id="instagramHandle" name="instagramHandle" defaultValue={lead?.instagramHandle ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="leadSourceId">Lead Source</Label>
          <Select name="leadSourceId" defaultValue={lead?.leadSourceId ?? undefined}>
            <SelectTrigger id="leadSourceId" className="w-full">
              <SelectValue placeholder="Select a source" />
            </SelectTrigger>
            <SelectContent>
              {leadSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="interestedServiceId">Interested Service</Label>
          <Select name="interestedServiceId" defaultValue={lead?.interestedServiceId ?? undefined}>
            <SelectTrigger id="interestedServiceId" className="w-full">
              <SelectValue placeholder="Optional" />
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="estimatedValue">Estimated Value (USD)</Label>
          <Input id="estimatedValue" name="estimatedValue" type="number" step="0.01" min="0" defaultValue={lead?.estimatedValue ? Number(lead.estimatedValue) : undefined} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="probability">Probability (%)</Label>
          <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue={lead?.probability ?? 50} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nextFollowUpAt">Next Follow-Up</Label>
          <Input id="nextFollowUpAt" name="nextFollowUpAt" type="date" defaultValue={lead?.nextFollowUpAt ? lead.nextFollowUpAt.toISOString().slice(0, 10) : undefined} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownerEmployeeId">Owner</Label>
        <Select name="ownerEmployeeId" defaultValue={lead?.ownerEmployeeId ?? undefined}>
          <SelectTrigger id="ownerEmployeeId" className="w-full">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.displayName ?? employee.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={lead?.notes ?? ""} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <CancelLink href={cancelHref} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : lead ? "Save Changes" : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}
