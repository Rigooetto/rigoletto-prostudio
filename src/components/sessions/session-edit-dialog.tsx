"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { updateSessionDetails, type SessionFormState } from "@/lib/actions/sessions";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Client, Artist, Role, Project } from "@/generated/prisma/client";
import type { PlainService, PlainEmployee } from "@/lib/serialize";

type ArtistWithClient = Artist & { client: { displayName: string } };
type EmployeeWithRole = PlainEmployee & { role: Role };

// Deliberately narrow — the session-detail query result carries nested
// relations with Decimal fields that can't cross the Server -> Client
// boundary. Only the fields this form edits, as plain values.
type EditableSession = {
  id: string;
  clientId: string;
  artistId: string | null;
  serviceId: string;
  projectId: string | null;
  studioRoom: string;
  startsAt: string;
  endsAt: string;
  amount: number;
  notes: string | null;
  engineerIds: string[];
  // Forces the form to remount (and its defaultValue inputs to re-init)
  // whenever the underlying session actually changes server-side. This
  // dialog stays mounted while closed, so without this key its uncontrolled
  // inputs would keep showing whatever was true the first time it rendered.
  updatedAt: string;
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function SessionEditDialog({
  session,
  clients,
  artists,
  services,
  employees,
  projects,
}: {
  session: EditableSession;
  clients: Client[];
  artists: ArtistWithClient[];
  services: PlainService[];
  employees: EmployeeWithRole[];
  projects: Pick<Project, "id" | "title">[];
}) {
  const [open, setOpen] = useState(false);
  const hasSubmitted = useRef(false);
  const action = updateSessionDetails.bind(null, session.id);
  const [state, formAction, pending] = useActionState<SessionFormState, FormData>(action, undefined);

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
          <Button variant="outline">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>
        <form key={session.updatedAt} action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select name="clientId" defaultValue={session.clientId}>
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
              {state?.fieldErrors?.clientId && (
                <p className="text-xs text-destructive">{state.fieldErrors.clientId[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="artistId">Artist</Label>
              <Select name="artistId" defaultValue={session.artistId ?? undefined}>
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
              <Label htmlFor="serviceId">Service *</Label>
              <Select name="serviceId" defaultValue={session.serviceId}>
                <SelectTrigger id="serviceId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.serviceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.fieldErrors?.serviceId && (
                <p className="text-xs text-destructive">{state.fieldErrors.serviceId[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Linked Project</Label>
              <Select name="projectId" defaultValue={session.projectId ?? undefined}>
                <SelectTrigger id="projectId" className="w-full">
                  <SelectValue placeholder="None" />
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start *</Label>
              <Input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                defaultValue={toLocalInputValue(session.startsAt)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End *</Label>
              <Input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                defaultValue={toLocalInputValue(session.endsAt)}
                required
              />
              {state?.fieldErrors?.endsAt && (
                <p className="text-xs text-destructive">{state.fieldErrors.endsAt[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="studioRoom">Room</Label>
              <Input id="studioRoom" name="studioRoom" defaultValue={session.studioRoom} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={session.amount}
                required
              />
              {state?.fieldErrors?.amount && (
                <p className="text-xs text-destructive">{state.fieldErrors.amount[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Engineers</Label>
            <div className="flex flex-wrap gap-3 rounded-md border border-border p-3">
              {employees.map((employee) => (
                <label key={employee.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="engineerIds"
                    value={employee.id}
                    defaultChecked={session.engineerIds.includes(employee.id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {employee.displayName ?? employee.fullName}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={session.notes ?? ""} />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
