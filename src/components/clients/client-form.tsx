"use client";

import { useActionState } from "react";
import { createClient, updateClient, type ClientFormState } from "@/lib/actions/clients";
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
import type { LeadSource, Client } from "@/generated/prisma/client";

// Deliberately narrow — never the raw query result. getClientDetail's
// `client` also carries `originatedByEmployee`/`projects` relations whose
// nested Employee objects contain Decimal fields, which can't cross the
// Server->Client boundary. This form only ever needs these scalar fields.
type EditableClient = Pick<
  Client,
  "id" | "displayName" | "contactName" | "leadSourceId" | "phone" | "email" | "instagramHandle" | "notes"
>;

export function ClientForm({
  leadSources,
  client,
  cancelHref,
}: {
  leadSources: LeadSource[];
  client?: EditableClient;
  cancelHref: string;
}) {
  const boundAction = client ? updateClient.bind(null, client.id) : createClient;
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="displayName">Name *</Label>
        <Input id="displayName" name="displayName" defaultValue={client?.displayName} required />
        {state?.fieldErrors?.displayName && (
          <p className="text-xs text-destructive">{state.fieldErrors.displayName[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input id="contactName" name="contactName" defaultValue={client?.contactName ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leadSourceId">Lead Source</Label>
          <Select name="leadSourceId" defaultValue={client?.leadSourceId ?? undefined}>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
          {state?.fieldErrors?.email && <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagramHandle">Instagram</Label>
        <Input id="instagramHandle" name="instagramHandle" defaultValue={client?.instagramHandle ?? ""} placeholder="@handle" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <CancelLink href={cancelHref} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : client ? "Save Changes" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
