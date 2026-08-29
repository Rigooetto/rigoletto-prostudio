"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createEmployee, updateEmployee, type EmployeeFormState } from "@/lib/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Role } from "@/generated/prisma/client";
import type { PlainEmployee } from "@/lib/serialize";

export function EmployeeDialog({ employee, roles }: { employee?: PlainEmployee; roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const hasSubmitted = useRef(false);
  const action = employee ? updateEmployee.bind(null, employee.id) : createEmployee;
  const [state, formAction, pending] = useActionState<EmployeeFormState, FormData>(action, undefined);

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
          employee ? (
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button>
              <Plus className="h-4 w-4" />
              New Employee
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "New Employee"}</DialogTitle>
        </DialogHeader>
        <form key={employee?.updatedAt.toISOString() ?? "new"} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" name="fullName" defaultValue={employee?.fullName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" name="displayName" defaultValue={employee?.displayName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" defaultValue={employee?.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleId">Role *</Label>
            <Select name="roleId" defaultValue={employee?.roleId}>
              <SelectTrigger id="roleId" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="basePayWeekly">Base Pay (Weekly, USD)</Label>
            <Input
              id="basePayWeekly"
              name="basePayWeekly"
              type="number"
              step="0.01"
              min="0"
              defaultValue={employee?.basePayWeekly ? Number(employee.basePayWeekly) : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acquisitionCommissionPercent">New Client Acquisition Commission (%)</Label>
            <Input
              id="acquisitionCommissionPercent"
              name="acquisitionCommissionPercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={
                employee?.acquisitionCommissionPercent ? Number(employee.acquisitionCommissionPercent) : undefined
              }
              placeholder="10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{employee ? "Reset Password (optional)" : "Password *"}</Label>
            <Input id="password" name="password" type="password" required={!employee} minLength={8} />
          </div>
          {employee && (
            <div className="flex items-center gap-2">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={employee.active}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="active" className="font-normal">
                Active
              </Label>
            </div>
          )}

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : employee ? "Save Changes" : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
