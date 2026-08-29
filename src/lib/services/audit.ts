import "server-only";
import { prisma } from "@/lib/db";

/**
 * Fire-and-forget audit trail for financial/compensation mutations (spec
 * §46: invoice edits, payment deletes, compensation overrides, bonus
 * adjustments, expense edits). Never throws — a logging failure must not
 * block the underlying business action.
 */
export async function logAudit(entry: {
  employeeId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        employeeId: entry.employeeId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue === undefined ? undefined : (entry.oldValue as never),
        newValue: entry.newValue === undefined ? undefined : (entry.newValue as never),
      },
    });
  } catch (err) {
    console.error("Failed to write audit log entry", err);
  }
}
