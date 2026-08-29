"use client";

import { useActionState } from "react";
import { createProject, type ProjectFormState } from "@/lib/actions/projects";
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
import type { Client, Artist, Role } from "@/generated/prisma/client";
import type { PlainService, PlainEmployee } from "@/lib/serialize";

type ArtistWithClient = Artist & { client: { displayName: string } };
type EmployeeWithRole = PlainEmployee & { role: Role };

export function ProjectForm({
  clients,
  artists,
  services,
  employees,
  defaultClientId,
  cancelHref,
}: {
  clients: Client[];
  artists: ArtistWithClient[];
  services: PlainService[];
  employees: EmployeeWithRole[];
  defaultClientId?: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(createProject, undefined);
  // Mirrors createProject's server-side default (getPrimaryStudioManager) so
  // the form doesn't show "Unassigned" for what will actually be assigned.
  const defaultLeadEngineerId = employees.find((e) => e.role.code === "STUDIO_MANAGER")?.id;

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="title">Project Title *</Label>
        <Input id="title" name="title" placeholder="e.g. 10-song album, Single: Nombre" required />
        {state?.fieldErrors?.title && <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>}
      </div>

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
          <Label htmlFor="artistId">Artist</Label>
          <Select name="artistId">
            <SelectTrigger id="artistId" className="w-full">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {artists.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.stageName} — {artist.client.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primaryServiceId">Service *</Label>
          <Select name="primaryServiceId">
            <SelectTrigger id="primaryServiceId" className="w-full">
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
          {state?.fieldErrors?.primaryServiceId && (
            <p className="text-xs text-destructive">{state.fieldErrors.primaryServiceId[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="leadEngineerId">Lead Engineer</Label>
          <Select name="leadEngineerId" defaultValue={defaultLeadEngineerId}>
            <SelectTrigger id="leadEngineerId" className="w-full">
              <SelectValue placeholder="Unassigned">
                {(value: string | null) =>
                  employees.find((e) => e.id === value)?.displayName ??
                  employees.find((e) => e.id === value)?.fullName ??
                  "Unassigned"
                }
              </SelectValue>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="trackCount">Track Count *</Label>
          <Input id="trackCount" name="trackCount" type="number" min="1" max="100" defaultValue={1} required />
          {state?.fieldErrors?.trackCount && (
            <p className="text-xs text-destructive">{state.fieldErrors.trackCount[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="quotedPrice">Quoted Price (USD)</Label>
          <Input id="quotedPrice" name="quotedPrice" type="number" step="0.01" min="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduledRecordingAt">Scheduled Recording</Label>
          <Input id="scheduledRecordingAt" name="scheduledRecordingAt" type="date" />
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
          {pending ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
