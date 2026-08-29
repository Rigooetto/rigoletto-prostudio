import { requireRole } from "@/lib/auth/session";
import { listExpenses } from "@/lib/queries/expenses";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { toPlainExpense } from "@/lib/serialize";

export default async function ExpensesPage() {
  await requireRole("ADMIN");
  const expenses = await listExpenses();
  const total = expenses.reduce((sum, e) => sum + Number(e.amountBase ?? e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">{formatCurrency(total)} total · Admin-only</p>
        </div>
        <ExpenseDialog />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No expenses logged yet.
                </TableCell>
              </TableRow>
            )}
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="text-muted-foreground">{formatDate(expense.date)}</TableCell>
                <TableCell className="font-medium">{expense.vendor}</TableCell>
                <TableCell className="text-muted-foreground">{expense.category}</TableCell>
                <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                <TableCell>
                  {expense.recurring && <Badge variant="outline">Recurring</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ExpenseDialog expense={toPlainExpense(expense)} />
                    <DeleteExpenseButton expenseId={expense.id} vendor={expense.vendor} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
