"use client";

import { useActionState, useMemo, useState } from "react";
import { bookSession, type SessionFormState } from "@/lib/actions/sessions";
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
import type { Client, Artist, Role, Project } from "@/generated/prisma/client";
import type { PlainService, PlainEmployee } from "@/lib/serialize";

type ArtistWithClient = Artist & { client: { displayName: string } };
type EmployeeWithRole = PlainEmployee & { role: Role };
type ProjectOption = Pick<Project, "id" | "title" | "clientId">;

export function SessionForm({
  clients,
  artists,
  services,
  employees,
  projects,
  defaultClientId,
  defaultProjectId,
  defaultStartsAt,
  defaultEndsAt,
  cancelHref,
}: {
  clients: Client[];
  artists: ArtistWithClient[];
  services: PlainService[];
  employees: EmployeeWithRole[];
  projects: ProjectOption[];
  defaultClientId?: string;
  defaultProjectId?: string;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<SessionFormState, FormData>(bookSession, undefined);

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState(defaultClientId ?? "");

  const [projectMode, setProjectMode] = useState<"existing" | "new" | "none">(defaultProjectId ? "existing" : "none");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");

  const [serviceId, setServiceId] = useState("");

  // Neither is a controlled form value (the inputs stay uncontrolled for
  // submission) — these just mirror onChange so the deposit preview below
  // can show a live dollar amount.
  const [amountPreview, setAmountPreview] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"UNPAID" | "DEPOSIT" | "PAID">("UNPAID");
  const parsedAmount = Number(amountPreview);
  const depositAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? Math.round(parsedAmount * 50) / 100 : 0;

  // A brand-new client can't already have an existing project — scope the
  // dropdown to the selected client, and drop out of "existing" mode if the
  // client switches to "new" mid-edit.
  const visibleProjects = useMemo(
    () => (clientMode === "existing" && clientId ? projects.filter((p) => p.clientId === clientId) : []),
    [projects, clientMode, clientId]
  );
  const canCreateNewProject = clientMode === "new" || !!clientId;

  function switchToNewClient() {
    setClientMode("new");
    setClientId("");
    if (projectMode === "existing") setProjectMode("none");
  }

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-border bg-card p-6">
      <input type="hidden" name="clientMode" value={clientMode} />
      <input type="hidden" name="projectMode" value={projectMode} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Client *</Label>
            {clientMode === "existing" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={switchToNewClient}
              >
                + New client
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => setClientMode("existing")}
              >
                ‹ Use existing client
              </Button>
            )}
          </div>
          {clientMode === "existing" ? (
            <>
              <Select name="clientId" value={clientId} onValueChange={(value) => setClientId(value ?? "")}>
                <SelectTrigger id="clientId" className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      (value && clients.find((c) => c.id === value)?.displayName) || "Select a client"
                    }
                  </SelectValue>
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
            </>
          ) : (
            <div className="space-y-2 rounded-md border border-dashed border-border p-3">
              <Input name="newClientName" placeholder="Client name *" required autoFocus />
              {state?.fieldErrors?.newClientName && (
                <p className="text-xs text-destructive">{state.fieldErrors.newClientName[0]}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input name="newClientPhone" placeholder="Phone" />
                <Input name="newClientEmail" type="email" placeholder="Email" />
              </div>
              {state?.fieldErrors?.newClientEmail && (
                <p className="text-xs text-destructive">{state.fieldErrors.newClientEmail[0]}</p>
              )}
            </div>
          )}
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
          <Label htmlFor="serviceId">Service *</Label>
          <Select name="serviceId" value={serviceId} onValueChange={(value) => setServiceId(value ?? "")}>
            <SelectTrigger id="serviceId" className="w-full">
              <SelectValue>
                {(value: string | null) =>
                  (value && services.find((s) => s.id === value)?.serviceName) || "Select a service"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.serviceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.fieldErrors?.serviceId && <p className="text-xs text-destructive">{state.fieldErrors.serviceId[0]}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Linked Project</Label>
            <div className="flex gap-1">
              {clientMode === "existing" && (
                <Button
                  type="button"
                  variant={projectMode === "existing" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-auto px-2 py-1 text-xs"
                  onClick={() => setProjectMode("existing")}
                >
                  Existing
                </Button>
              )}
              <Button
                type="button"
                variant={projectMode === "new" ? "secondary" : "ghost"}
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                disabled={!canCreateNewProject}
                onClick={() => setProjectMode("new")}
              >
                + New
              </Button>
              <Button
                type="button"
                variant={projectMode === "none" ? "secondary" : "ghost"}
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => setProjectMode("none")}
              >
                None
              </Button>
            </div>
          </div>
          {projectMode === "existing" && (
            <>
              <Select name="projectId" value={projectId} onValueChange={(value) => setProjectId(value ?? "")}>
                <SelectTrigger id="projectId" className="w-full">
                  <SelectValue>
                    {(value: string | null) => (value && visibleProjects.find((p) => p.id === value)?.title) || "Select a project"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {visibleProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.fieldErrors?.projectId && (
                <p className="text-xs text-destructive">{state.fieldErrors.projectId[0]}</p>
              )}
            </>
          )}
          {projectMode === "new" && (
            <div className="grid grid-cols-2 gap-2 rounded-md border border-dashed border-border p-3">
              <Input name="newProjectTitle" placeholder="Project title *" required />
              <Input name="newProjectTrackCount" type="number" min="1" max="100" defaultValue={1} placeholder="Tracks" />
              {state?.fieldErrors?.newProjectTitle && (
                <p className="col-span-2 text-xs text-destructive">{state.fieldErrors.newProjectTitle[0]}</p>
              )}
              {state?.fieldErrors?.newProjectTrackCount && (
                <p className="col-span-2 text-xs text-destructive">{state.fieldErrors.newProjectTrackCount[0]}</p>
              )}
            </div>
          )}
          {projectMode === "none" && (
            <p className="text-xs text-muted-foreground">This session won&apos;t be linked to a project.</p>
          )}
          {!canCreateNewProject && (
            <p className="text-xs text-muted-foreground">Select or add a client to enable New Project.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Start *</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={defaultStartsAt} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">End *</Label>
          <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={defaultEndsAt} required />
          {state?.fieldErrors?.endsAt && <p className="text-xs text-destructive">{state.fieldErrors.endsAt[0]}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="studioRoom">Room</Label>
          <Input id="studioRoom" name="studioRoom" defaultValue="Main Room" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            onChange={(e) => setAmountPreview(e.target.value)}
          />
          {state?.fieldErrors?.amount && <p className="text-xs text-destructive">{state.fieldErrors.amount[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <Select
            name="paymentStatus"
            defaultValue="UNPAID"
            onValueChange={(value) => setPaymentStatus((value as typeof paymentStatus) ?? "UNPAID")}
          >
            <SelectTrigger id="paymentStatus" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="DEPOSIT">Deposit (50%)</SelectItem>
              <SelectItem value="PAID">Paid on the spot</SelectItem>
            </SelectContent>
          </Select>
          {paymentStatus === "DEPOSIT" ? (
            <p className="text-xs text-muted-foreground">
              {depositAmount > 0
                ? `Charges $${depositAmount.toFixed(2)} now; the rest is tracked as balance until the recording session wraps.`
                : "Charges half the amount now; the rest is tracked as balance."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              For a partial amount other than half, create the session as Unpaid and record the payment afterward.
            </p>
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
                className="h-4 w-4 rounded border-input"
              />
              {employee.displayName ?? employee.fullName}
            </label>
          ))}
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
          {pending ? "Booking..." : "Book Session"}
        </Button>
      </div>
    </form>
  );
}
