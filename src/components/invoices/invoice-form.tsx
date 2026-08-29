"use client";

import { useActionState } from "react";
import { createInvoice, type InvoiceFormState } from "@/lib/actions/invoices";
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
import type { Client, Project } from "@/generated/prisma/client";

export function InvoiceForm({
  clients,
  projects,
  defaultClientId,
  cancelHref,
}: {
  clients: Client[];
  projects: Pick<Project, "id" | "title" | "clientId">[];
  defaultClientId?: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<InvoiceFormState, FormData>(createInvoice, undefined);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-border bg-card p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client *</Label>
          <Select name="clientId" defaultValue={defaultClientId}>
            <SelectTrigger id="clientId" className="w-full">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.fieldErrors?.clientId && <p className="text-xs text-destructive">{state.fieldErrors.clientId[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <Select name="projectId">
            <SelectTrigger id="projectId" className="w-full">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="total">Total (USD) *</Label>
          <Input id="total" name="total" type="number" step="0.01" min="0.01" required />
          {state?.fieldErrors?.total && <p className="text-xs text-destructive">{state.fieldErrors.total[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="depositAmount">Deposit (USD)</Label>
          <Input id="depositAmount" name="depositAmount" type="number" step="0.01" min="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <CancelLink href={cancelHref} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
