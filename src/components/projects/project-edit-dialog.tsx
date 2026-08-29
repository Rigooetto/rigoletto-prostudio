"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { updateProjectDetails, type ProjectFormState } from "@/lib/actions/projects";
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
import type { Artist, Role } from "@/generated/prisma/client";
import type { PlainService, PlainEmployee } from "@/lib/serialize";

type ArtistWithClient = Artist & { client: { displayName: string } };
type EmployeeWithRole = PlainEmployee & { role: Role };

// Deliberately narrow — a full Project detail-query result carries nested
// relations (primaryService, client, etc.) with Decimal fields that can't
// cross the Server -> Client boundary. Only the fields this form edits.
type EditableProject = {
  id: string;
  title: string;
  artistId: string | null;
  primaryServiceId: string;
  leadEngineerId: string | null;
  trackCount: number;
  quotedPrice: number | null;
  scheduledRecordingAt: Date | null;
  notes: string | null;
  // Forces the form to remount (and its defaultValue inputs to re-init)
  // whenever the underlying project actually changes server-side. This
  // dialog stays mounted while closed, so without this key its uncontrolled
  // inputs would keep showing whatever was true the first time it rendered.
  updatedAt: Date;
};

export function ProjectEditDialog({
  project,
  tracks,
  isAdmin,
  artists,
  services,
  employees,
}: {
  project: EditableProject;
  tracks: Array<{ trackNumber: number; hasProgress: boolean }>;
  isAdmin: boolean;
  artists: ArtistWithClient[];
  services: PlainService[];
  employees: EmployeeWithRole[];
}) {
  const [open, setOpen] = useState(false);
  const hasSubmitted = useRef(false);
  const action = updateProjectDetails.bind(null, project.id);
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(action, undefined);

  // Admins can push the track count below tracks that already have work
  // logged (Studio Managers still hit the server-side block) — but doing so
  // permanently deletes that progress, so it needs an explicit, specific
  // confirmation rather than silently going through.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!isAdmin) return;
    const newCount = Number(new FormData(event.currentTarget).get("trackCount"));
    if (!Number.isFinite(newCount)) return;
    const tracksAtRisk = tracks.filter((t) => t.trackNumber > newCount && t.hasProgress);
    if (tracksAtRisk.length === 0) return;
    const confirmed = window.confirm(
      `Reducing to ${newCount} tracks permanently deletes ${tracksAtRisk.length} track${tracksAtRisk.length === 1 ? "" : "s"} that already ${tracksAtRisk.length === 1 ? "has" : "have"} work logged (progress, delivery, or compensation already attributed to it). This can't be undone. Continue?`
    );
    if (!confirmed) event.preventDefault();
  }

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
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <form key={project.updatedAt.toISOString()} action={formAction} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" defaultValue={project.title} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="artistId">Artist</Label>
              <Select name="artistId" defaultValue={project.artistId ?? undefined}>
                <SelectTrigger id="artistId" className="w-full">
                  <SelectValue placeholder="None" />
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
            <div className="space-y-2">
              <Label htmlFor="primaryServiceId">Service *</Label>
              <Select name="primaryServiceId" defaultValue={project.primaryServiceId}>
                <SelectTrigger id="primaryServiceId" className="w-full">
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
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leadEngineerId">Lead Engineer</Label>
              <Select name="leadEngineerId" defaultValue={project.leadEngineerId ?? undefined}>
                <SelectTrigger id="leadEngineerId" className="w-full">
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
              <Label htmlFor="quotedPrice">Quoted Price (USD)</Label>
              <Input
                id="quotedPrice"
                name="quotedPrice"
                type="number"
                step="0.01"
                min="0"
                defaultValue={project.quotedPrice ? Number(project.quotedPrice) : undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackCount">Track Count *</Label>
            <Input
              id="trackCount"
              name="trackCount"
              type="number"
              min="1"
              max="100"
              defaultValue={project.trackCount}
              required
            />
            <p className="text-xs text-muted-foreground">
              Increasing adds new pending tracks. Decreasing removes the highest-numbered tracks
              {isAdmin
                ? " — you'll be asked to confirm if any of them already have work logged."
                : " — only allowed if none of them have work logged yet."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledRecordingAt">Scheduled Recording</Label>
            <Input
              id="scheduledRecordingAt"
              name="scheduledRecordingAt"
              type="date"
              defaultValue={project.scheduledRecordingAt ? project.scheduledRecordingAt.toISOString().slice(0, 10) : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={project.notes ?? ""} />
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
