"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { createTask, type TaskFormState } from "@/lib/actions/tasks";
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
import type { Role, Project, Lead, Client } from "@/generated/prisma/client";
import type { PlainEmployee } from "@/lib/serialize";

type EmployeeWithRole = PlainEmployee & { role: Role };

export function TaskDialog({
  employees,
  projects,
  leads,
  clients,
}: {
  employees: EmployeeWithRole[];
  projects: Pick<Project, "id" | "title">[];
  leads: Pick<Lead, "id" | "name" | "artistName">[];
  clients: Pick<Client, "id" | "displayName">[];
}) {
  const [open, setOpen] = useState(false);
  const hasSubmitted = useRef(false);
  const [state, formAction, pending] = useActionState<TaskFormState, FormData>(createTask, undefined);

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
          <Button>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dueAt">Due Date</Label>
              <Input id="dueAt" name="dueAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedToEmployeeId">Assign To</Label>
              <Select name="assignedToEmployeeId">
                <SelectTrigger id="assignedToEmployeeId" className="w-full">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="relatedProjectId">Related Project</Label>
            <Select name="relatedProjectId">
              <SelectTrigger id="relatedProjectId" className="w-full">
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
          <div className="space-y-2">
            <Label htmlFor="relatedLeadId">Related Lead</Label>
            <Select name="relatedLeadId">
              <SelectTrigger id="relatedLeadId" className="w-full">
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
            <Label htmlFor="relatedClientId">Related Client</Label>
            <Select name="relatedClientId">
              <SelectTrigger id="relatedClientId" className="w-full">
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

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
