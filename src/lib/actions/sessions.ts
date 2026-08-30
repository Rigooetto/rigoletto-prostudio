"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireEmployee } from "@/lib/auth/session";
import { BookSessionSchema, SessionDetailsSchema, SessionPaymentSchema, RescheduleSessionSchema } from "@/lib/validation/session";
import { deriveSessionPaymentStatus, resolveBookingPayment } from "@/lib/payment-status";
import { refreshDraftCompensationPeriods } from "@/lib/services/compensation/refresh";
import { sendBookingConfirmationWhatsApp, type WhatsappSendResult } from "@/lib/services/whatsapp";
import { computeClientPhoneE164 } from "@/lib/phone";
import { formatDate, formatTime } from "@/lib/format";

export type SessionFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;
export type SessionPaymentFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

// Accepted by every helper below so they work identically whether called
// with the plain `prisma` client or an interactive-transaction `tx` — that's
// what lets bookSession run client-create + project-create + session-create
// as one atomic unit.
type Db = Prisma.TransactionClient;

/**
 * Authorization boundary for session writes (no Postgres RLS in this app).
 * Admin can write any session. A Studio Manager can only modify a session
 * they created or are assigned to as an engineer.
 */
export async function assertCanWriteSession(session: {
  createdByEmployeeId: string | null;
  engineers: { employeeId: string }[];
}) {
  const employee = await requireEmployee();
  if (employee.role.code === "ADMIN") return employee;
  if (session.createdByEmployeeId === employee.id) return employee;
  if (session.engineers.some((e) => e.employeeId === employee.id)) return employee;
  throw new Error("You can only modify sessions you created or are assigned to.");
}

/**
 * Keeps Project.leadEngineerId in sync with whoever's actually checked as
 * the session's engineer — that field is what compensation attribution
 * (production/mix-master variables) keys off, and it was too easy to check
 * an engineer here while the project's own field silently stayed unset.
 * Only syncs the unambiguous case: exactly one engineer checked. Zero or
 * multiple engineers leaves the project's field untouched either way.
 */
async function syncProjectLeadEngineerFromSession(db: Db, projectId: string | null | undefined, engineerIds: string[]) {
  if (!projectId || engineerIds.length !== 1) return;
  await db.project.update({
    where: { id: projectId },
    data: { leadEngineerId: engineerIds[0] },
  });
}

// Duplicated from queries/employees.ts rather than imported: that file is
// guarded by "server-only", which throws when actions/sessions.ts is loaded
// by unit tests outside Next's bundler (see session-authorization.test.ts).
async function getPrimaryStudioManager(db: Db) {
  return db.employee.findFirst({
    where: { active: true, role: { code: "STUDIO_MANAGER" } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * TIERED_PRODUCTION (Full Production) and FIXED_AMOUNT (Mix & Master) both
 * pay Turi off delivered ProjectTrack rows, never directly off session
 * revenue — so a session booked with one of those services but no project
 * has nowhere for that compensation to ever attach, no matter how much gets
 * paid. Rather than leaving that a silent trap, auto-create a minimal
 * 1-track project so there's always something to mark Delivered later.
 * Sessions for other service types (paid straight off revenue) don't need
 * this and are left exactly as booked.
 */
async function ensureProjectForSession(
  db: Db,
  params: {
    projectId: string | null | undefined;
    clientId: string;
    artistId: string | null | undefined;
    serviceId: string;
    engineerIds: string[];
  }
): Promise<string | null | undefined> {
  if (params.projectId) return params.projectId;

  const service = await db.service.findUnique({ where: { id: params.serviceId } });
  if (!service || (service.compensationType !== "TIERED_PRODUCTION" && service.compensationType !== "FIXED_AMOUNT")) {
    return params.projectId;
  }

  const client = await db.client.findUnique({ where: { id: params.clientId } });
  const leadEngineerId =
    params.engineerIds.length === 1 ? params.engineerIds[0] : (await getPrimaryStudioManager(db))?.id;

  const project = await db.project.create({
    data: {
      clientId: params.clientId,
      artistId: params.artistId,
      primaryServiceId: params.serviceId,
      leadEngineerId,
      title: `${client?.displayName ?? "Untitled"} — ${service.serviceName}`,
      trackCount: 1,
      tracks: { create: [{ trackNumber: 1 }] },
    },
  });
  return project.id;
}

/**
 * Books a session in one atomic pass. Client and project can each
 * independently be an existing record, a brand-new one created inline right
 * here, or (project only) skipped — every combination that used to require
 * clicking through the separate "+ New Client" / "+ New Project" dialogs
 * (each its own server round-trip) now happens as a single $transaction, so
 * an error partway through (e.g. a bad track count) rolls back cleanly
 * instead of leaving an orphaned Client with nothing attached to it.
 */
export async function bookSession(_prevState: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const employee = await requireEmployee();

  const validated = BookSessionSchema.safeParse({
    clientMode: formData.get("clientMode"),
    clientId: formData.get("clientId"),
    newClientName: formData.get("newClientName"),
    newClientPhone: formData.get("newClientPhone"),
    newClientEmail: formData.get("newClientEmail"),
    projectMode: formData.get("projectMode"),
    projectId: formData.get("projectId"),
    newProjectTitle: formData.get("newProjectTitle"),
    newProjectTrackCount: formData.get("newProjectTrackCount"),
    artistId: formData.get("artistId"),
    serviceId: formData.get("serviceId"),
    studioRoom: formData.get("studioRoom") || "Main Room",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    amount: formData.get("amount"),
    paymentStatus: formData.get("paymentStatus") || "UNPAID",
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;
  const engineerIds = formData.getAll("engineerIds").filter((v): v is string => typeof v === "string");

  const { paidAmount, storedPaymentStatus } = resolveBookingPayment(data.amount, data.paymentStatus);

  const { sessionId, projectId } = await prisma.$transaction(async (tx) => {
    const clientId =
      data.clientMode === "new"
        ? (
            await tx.client.create({
              data: {
                displayName: data.newClientName!,
                phone: data.newClientPhone,
                phoneE164: computeClientPhoneE164(data.newClientPhone),
                email: data.newClientEmail,
                originatedByEmployeeId: employee.id,
                firstVisitAt: new Date(),
              },
            })
          ).id
        : data.clientId!;

    let projectId: string | null | undefined = data.projectMode === "existing" ? data.projectId : undefined;

    if (data.projectMode === "new") {
      const leadEngineerId = (await getPrimaryStudioManager(tx))?.id;
      const project = await tx.project.create({
        data: {
          clientId,
          artistId: data.artistId,
          primaryServiceId: data.serviceId,
          leadEngineerId,
          title: data.newProjectTitle!,
          trackCount: data.newProjectTrackCount!,
          tracks: {
            create: Array.from({ length: data.newProjectTrackCount! }, (_, i) => ({ trackNumber: i + 1 })),
          },
        },
      });
      projectId = project.id;
    } else if (data.projectMode === "none") {
      projectId = await ensureProjectForSession(tx, {
        projectId: undefined,
        clientId,
        artistId: data.artistId,
        serviceId: data.serviceId,
        engineerIds,
      });
    }

    const session = await tx.session.create({
      data: {
        projectId,
        clientId,
        artistId: data.artistId,
        serviceId: data.serviceId,
        studioRoom: data.studioRoom,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        amount: data.amount,
        amountBase: data.amount,
        paymentStatus: storedPaymentStatus,
        notes: data.notes,
        createdByEmployeeId: employee.id,
        engineers: {
          create: engineerIds.map((employeeId) => ({ employeeId })),
        },
        // "Paid" or "Deposit" at booking time means money actually changed
        // hands right now — back that with a real dated payment record
        // instead of just the status flag, so revenue recognition has
        // something real to sum.
        payments:
          paidAmount > 0
            ? { create: [{ amount: paidAmount, amountBase: paidAmount, recordedByEmployeeId: employee.id }] }
            : undefined,
      },
    });

    await syncProjectLeadEngineerFromSession(tx, projectId, engineerIds);

    return { sessionId: session.id, projectId };
  });

  // Runs outside the transaction — it does its own separate reads/writes and
  // has no bearing on whether the booking itself should commit or roll back.
  if (paidAmount > 0) {
    await refreshDraftCompensationPeriods(engineerIds, new Date());
  }

  // Best-effort — a booking must never fail because the WhatsApp send does.
  // sendAndPersistWhatsappConfirmation already never throws on its own; this
  // try/catch is belt-and-suspenders against a bug in that contract.
  try {
    await sendAndPersistWhatsappConfirmation(sessionId);
  } catch {
    // Swallowed intentionally — see comment above.
  }

  revalidatePath("/sessions");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/sessions/${sessionId}`);
}

/**
 * Sends the booking-confirmation WhatsApp message and persists the result on
 * the Session row. Shared by bookSession (on creation) and
 * resendWhatsappConfirmation (manual retry) so both write the same fields
 * the same way. The send necessarily happens after the session already
 * exists, so this is always a second, separate statement — never part of
 * bookSession's creating transaction.
 */
async function sendAndPersistWhatsappConfirmation(sessionId: string): Promise<WhatsappSendResult> {
  const target = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { studioRoom: true, startsAt: true, client: { select: { id: true, displayName: true, phone: true } } },
  });
  if (!target) return { status: "SKIPPED", error: "Session not found" };

  const result = await sendBookingConfirmationWhatsApp({
    clientName: target.client.displayName,
    phone: target.client.phone,
    startsAt: target.startsAt,
    studioRoom: target.studioRoom,
  });

  await prisma.session
    .update({
      where: { id: sessionId },
      data: {
        whatsappStatus: result.status,
        whatsappSentAt: result.status === "SENT" ? new Date() : null,
        whatsappError: result.error?.slice(0, 500) ?? null,
      },
    })
    .catch(() => {
      // A persistence hiccup here shouldn't surface as a send failure either.
    });

  // Only a genuine SENT has a real Meta message behind it worth logging in
  // the client's conversation history — SKIPPED/FAILED stay visible only via
  // the Session fields above, which is where a retry-driving badge belongs.
  if (result.status === "SENT" && result.waMessageId) {
    await prisma.whatsappMessage
      .create({
        data: {
          clientId: target.client.id,
          sessionId,
          direction: "OUTBOUND",
          body: `Confirmación de sesión: ${formatDate(target.startsAt)} a las ${formatTime(target.startsAt)} en ${target.studioRoom}`,
          waMessageId: result.waMessageId,
          status: "SENT",
        },
      })
      .catch(() => {
        // Same reasoning — a logging hiccup shouldn't retroactively look
        // like the send itself failed.
      });
  }

  return result;
}

export async function resendWhatsappConfirmation(sessionId: string): Promise<WhatsappSendResult> {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: { engineers: true },
  });
  await assertCanWriteSession(session);

  const result = await sendAndPersistWhatsappConfirmation(sessionId);
  revalidatePath(`/sessions/${sessionId}`);
  return result;
}

export async function updateSessionDetails(
  sessionId: string,
  _prevState: SessionFormState,
  formData: FormData
): Promise<SessionFormState> {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: { engineers: true },
  });
  await assertCanWriteSession(session);

  const validated = SessionDetailsSchema.safeParse({
    projectId: formData.get("projectId"),
    clientId: formData.get("clientId"),
    artistId: formData.get("artistId"),
    serviceId: formData.get("serviceId"),
    studioRoom: formData.get("studioRoom") || "Main Room",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;
  const engineerIds = formData.getAll("engineerIds").filter((v): v is string => typeof v === "string");
  const projectId = await ensureProjectForSession(prisma, {
    projectId: data.projectId,
    clientId: data.clientId,
    artistId: data.artistId,
    serviceId: data.serviceId,
    engineerIds,
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      projectId: projectId ?? null,
      clientId: data.clientId,
      artistId: data.artistId ?? null,
      serviceId: data.serviceId,
      studioRoom: data.studioRoom,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      amount: data.amount,
      amountBase: data.amount,
      notes: data.notes,
      engineers: {
        deleteMany: {},
        create: engineerIds.map((employeeId) => ({ employeeId })),
      },
    },
  });

  await syncProjectLeadEngineerFromSession(prisma, projectId, engineerIds);

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  revalidatePath("/calendar");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

/**
 * Moves a session to a new time slot — drag/resize on the Calendar's
 * time-grid. Follows the app's soft-warning convention used elsewhere (e.g.
 * the project page's outstanding-balance banner): the move always happens,
 * a same-room overlap only produces a warning to toast, never blocks it —
 * there's no DB-level overlap constraint anywhere else in the app either.
 */
export async function rescheduleSession(
  sessionId: string,
  startsAt: Date,
  endsAt: Date
): Promise<{ warning?: string }> {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: { engineers: true },
  });
  await assertCanWriteSession(session);

  const parsed = RescheduleSessionSchema.parse({ startsAt, endsAt });

  const overlapping = await prisma.session.findFirst({
    where: {
      id: { not: sessionId },
      studioRoom: session.studioRoom,
      startsAt: { lt: parsed.endsAt },
      endsAt: { gt: parsed.startsAt },
    },
    select: { client: { select: { displayName: true } } },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { startsAt: parsed.startsAt, endsAt: parsed.endsAt },
  });

  revalidatePath("/calendar");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");

  return overlapping ? { warning: `Overlaps with ${overlapping.client.displayName} in ${session.studioRoom}.` } : {};
}

/**
 * A project/invoice only qualifies for the "also delete" offer if this
 * session is the ONLY thing tied to it and no real work/money is attached —
 * never delete something that other sessions, track progress, or payments
 * still depend on, regardless of what the caller asks for.
 */
export async function getSessionDeleteImpact(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });

  const [project, invoice] = await Promise.all([
    session.projectId
      ? prisma.project.findUnique({
          where: { id: session.projectId },
          select: {
            id: true,
            title: true,
            _count: { select: { sessions: true, tracks: { where: { status: { not: "PENDING" } } } } },
          },
        })
      : null,
    session.invoiceId
      ? prisma.invoice.findUnique({
          where: { id: session.invoiceId },
          select: {
            id: true,
            invoiceNumber: true,
            _count: { select: { sessions: true, projects: true, payments: true } },
          },
        })
      : null,
  ]);

  return {
    orphanableProject:
      project && project._count.sessions <= 1 && project._count.tracks === 0
        ? { id: project.id, title: project.title }
        : null,
    orphanableInvoice:
      invoice && invoice._count.sessions <= 1 && invoice._count.projects === 0 && invoice._count.payments === 0
        ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber }
        : null,
  };
}

export async function deleteSession(
  sessionId: string,
  options?: { alsoDeleteProjectId?: string; alsoDeleteInvoiceId?: string }
) {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: { engineers: true, payments: true },
  });
  const employee = await assertCanWriteSession(session);

  // A paid session is real collected revenue that may already be reflected
  // in a generated compensation period. Only an Admin may delete one outright
  // — Studio Managers still need to refund first. Whichever affected month's
  // period exists gets auto-refreshed below, so this never leaves a stale
  // number behind the way a silent delete used to.
  if (session.paymentStatus === "PAID" && employee.role.code !== "ADMIN") {
    throw new Error(
      "Only an Admin can delete a paid session — mark it Refunded first if you need to reverse the payment yourself."
    );
  }

  // Re-derive what's actually safe to delete server-side — never trust the
  // client's request alone, since the impact could have changed (e.g.
  // another session got linked) between the dialog opening and submitting.
  const impact = await getSessionDeleteImpact(sessionId);
  const shouldDeleteProject =
    options?.alsoDeleteProjectId && options.alsoDeleteProjectId === impact.orphanableProject?.id;
  const shouldDeleteInvoice =
    options?.alsoDeleteInvoiceId && options.alsoDeleteInvoiceId === impact.orphanableInvoice?.id;

  const engineerIds = session.engineers.map((e) => e.employeeId);
  const paymentDates = session.payments.map((p) => p.paidAt);

  await prisma.session.delete({ where: { id: sessionId } });
  if (shouldDeleteProject) {
    await prisma.project.delete({ where: { id: options!.alsoDeleteProjectId! } });
  }
  if (shouldDeleteInvoice) {
    await prisma.invoice.delete({ where: { id: options!.alsoDeleteInvoiceId! } });
  }

  // The session's own revenue is gone now — refresh every month a payment
  // was dated in (a deposit/balance session can span two), for everyone who
  // was assigned, so no already-generated period keeps counting it. Nothing
  // to refresh if the session was never paid — it wasn't in the numbers.
  await Promise.all(paymentDates.map((date) => refreshDraftCompensationPeriods(engineerIds, date)));

  revalidatePath("/sessions");
  revalidatePath("/projects");
  revalidatePath("/invoices");
  redirect("/sessions");
}

async function recomputeSessionPaymentStatus(sessionId: string) {
  const [session, agg] = await Promise.all([
    prisma.session.findUniqueOrThrow({ where: { id: sessionId } }),
    prisma.sessionPayment.aggregate({ where: { sessionId }, _sum: { amountBase: true }, _count: true }),
  ]);
  const totalPaid = Number(agg._sum.amountBase ?? 0);
  const paymentStatus = deriveSessionPaymentStatus(totalPaid, Number(session.amountBase ?? session.amount), agg._count);
  await prisma.session.update({ where: { id: sessionId }, data: { paymentStatus } });
}

async function recordSessionPaymentEntry(
  sessionId: string,
  signedAmountFactor: 1 | -1,
  _prevState: SessionPaymentFormState,
  formData: FormData
): Promise<SessionPaymentFormState> {
  const session = await prisma.session.findUniqueOrThrow({
    where: { id: sessionId },
    include: { engineers: true },
  });
  const employee = await assertCanWriteSession(session);

  const validated = SessionPaymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method") || "CASH",
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes"),
  });
  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;
  const signedAmount = data.amount * signedAmountFactor;
  const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();

  await prisma.sessionPayment.create({
    data: {
      sessionId,
      amount: signedAmount,
      amountBase: signedAmount,
      method: data.method,
      paidAt,
      notes: data.notes,
      recordedByEmployeeId: employee.id,
    },
  });
  await recomputeSessionPaymentStatus(sessionId);
  await refreshDraftCompensationPeriods(
    session.engineers.map((e) => e.employeeId),
    paidAt
  );

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  return undefined;
}

export async function recordSessionPayment(
  sessionId: string,
  prevState: SessionPaymentFormState,
  formData: FormData
): Promise<SessionPaymentFormState> {
  return recordSessionPaymentEntry(sessionId, 1, prevState, formData);
}

export async function recordSessionRefund(
  sessionId: string,
  prevState: SessionPaymentFormState,
  formData: FormData
): Promise<SessionPaymentFormState> {
  return recordSessionPaymentEntry(sessionId, -1, prevState, formData);
}
