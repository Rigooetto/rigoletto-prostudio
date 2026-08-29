"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { generateCompensationPeriod } from "@/lib/actions/compensation";
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
import type { Role } from "@/generated/prisma/client";
import type { PlainEmployee } from "@/lib/serialize";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function GeneratePeriodForm({ employees }: { employees: (PlainEmployee & { role: Role })[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const employeeId = String(formData.get("employeeId") || "");
        const periodStart = String(formData.get("periodStart") || "");
        if (!employeeId || !periodStart) return;
        startTransition(async () => {
          try {
            const result = await generateCompensationPeriod(employeeId, periodStart);
            if (result?.error) toast.error(result.error);
            else toast.success("Compensation period generated.");
          } catch {
            toast.error("Couldn't generate this period.");
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="employeeId" className="text-xs">Employee</Label>
        <Select name="employeeId" defaultValue={employees[0]?.id}>
          <SelectTrigger id="employeeId" className="w-48">
            <SelectValue />
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
      <div className="space-y-1">
        <Label htmlFor="periodStart" className="text-xs">Month</Label>
        <Input id="periodStart" name="periodStart" type="month" defaultValue={currentMonthValue()} className="w-40" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Generating..." : "Generate / Recalculate"}
      </Button>
    </form>
  );
}
