import { listTasks } from "@/lib/queries/tasks";
import { listActiveEmployees } from "@/lib/queries/employees";
import { prisma } from "@/lib/db";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskStatusSelect } from "@/components/tasks/task-status-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toPlainEmployee } from "@/lib/serialize";

export default async function TasksPage() {
  const [tasks, employees, projects, leads, clients] = await Promise.all([
    listTasks(),
    listActiveEmployees(),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.lead.findMany({ select: { id: true, name: true, artistName: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.client.findMany({ select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
  ]);

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.filter((t) => t.status !== "DONE").length} open</p>
        </div>
        <TaskDialog
          employees={employees.map((e) => ({ ...toPlainEmployee(e), role: e.role }))}
          projects={projects}
          leads={leads}
          clients={clients}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Related To</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No tasks yet.
                </TableCell>
              </TableRow>
            )}
            {tasks.map((task) => {
              const overdue = task.status !== "DONE" && task.dueAt && task.dueAt < now;
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <p className="font-medium">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.relatedProject?.title ?? task.relatedLead?.artistName ?? task.relatedLead?.name ?? task.relatedClient?.displayName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.assignedToEmployee?.displayName ?? task.assignedToEmployee?.fullName ?? "Unassigned"}
                  </TableCell>
                  <TableCell className={cn("text-muted-foreground", overdue && "text-destructive font-medium")}>
                    {formatDate(task.dueAt)}
                  </TableCell>
                  <TableCell>
                    <TaskStatusSelect taskId={task.id} status={task.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
