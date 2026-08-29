import "server-only";
import { prisma } from "@/lib/db";
import { startOfToday } from "@/lib/dates";
import { overdueProjectsWhere } from "@/lib/queries/dashboard";

export type LiveNotification = {
  id: string;
  message: string;
  link: string;
};

/**
 * Computed live from current state rather than persisted Notification rows —
 * there's no cron/job runner in this app yet to generate "a project just
 * became overdue" events, so these are recomputed on every request instead.
 * The Notification table stays in the schema for a future persisted/
 * dismissable version.
 */
export async function getLiveNotifications(): Promise<LiveNotification[]> {
  const notifications: LiveNotification[] = [];

  const [overdueProjects, followUpLeads, unpaidInvoices] = await Promise.all([
    prisma.project.findMany({
      where: overdueProjectsWhere(),
      select: { id: true, title: true },
      take: 5,
    }),
    prisma.lead.findMany({
      where: { stage: { notIn: ["WON", "LOST"] }, nextFollowUpAt: { lte: new Date() } },
      select: { id: true, name: true, artistName: true },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["UNPAID", "PARTIAL"] }, dueDate: { lt: startOfToday() } },
      select: { id: true, invoiceNumber: true },
      take: 5,
    }),
  ]);

  for (const project of overdueProjects) {
    notifications.push({
      id: `project-${project.id}`,
      message: `"${project.title}" is overdue`,
      link: `/projects/${project.id}`,
    });
  }
  for (const lead of followUpLeads) {
    notifications.push({
      id: `lead-${lead.id}`,
      message: `Follow up with ${lead.artistName || lead.name}`,
      link: `/leads/${lead.id}`,
    });
  }
  for (const invoice of unpaidInvoices) {
    notifications.push({
      id: `invoice-${invoice.id}`,
      message: `${invoice.invoiceNumber} is past due`,
      link: `/invoices/${invoice.id}`,
    });
  }

  return notifications;
}
