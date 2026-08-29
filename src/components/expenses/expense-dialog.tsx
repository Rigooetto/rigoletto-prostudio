"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createExpense, updateExpense, type ExpenseFormState } from "@/lib/actions/expenses";
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
import { ExpenseCategoryValues } from "@/lib/validation/expense";
import type { PlainExpense } from "@/lib/serialize";

const categoryLabels: Record<(typeof ExpenseCategoryValues)[number], string> = {
  PAYROLL: "Payroll",
  ADVERTISING: "Advertising",
  ELECTRICITY: "Electricity",
  WATER: "Water",
  INTERNET: "Internet",
  RENT: "Rent",
  EQUIPMENT: "Equipment",
  MAINTENANCE: "Maintenance",
  SOFTWARE: "Software",
  CONTRACTORS: "Contractors",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

export function ExpenseDialog({ expense }: { expense?: PlainExpense }) {
  const [open, setOpen] = useState(false);
  const hasSubmitted = useRef(false);
  const action = expense ? updateExpense.bind(null, expense.id) : createExpense;
  const [state, formAction, pending] = useActionState<ExpenseFormState, FormData>(action, undefined);

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
          expense ? (
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button>
              <Plus className="h-4 w-4" />
              New Expense
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "New Expense"}</DialogTitle>
        </DialogHeader>
        <form key={expense?.updatedAt.toISOString() ?? "new"} action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={expense ? expense.date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={expense ? Number(expense.amount) : undefined}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor *</Label>
            <Input id="vendor" name="vendor" required defaultValue={expense?.vendor} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select name="category" defaultValue={expense?.category ?? "OTHER"}>
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ExpenseCategoryValues.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={expense?.description ?? ""} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="recurring"
              name="recurring"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              defaultChecked={expense?.recurring ?? false}
            />
            <Label htmlFor="recurring" className="font-normal">Recurring monthly expense</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={expense?.notes ?? ""} />
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : expense ? "Save Changes" : "Create Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
