"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { ProjectSchema, ProjectDetailsSchema } from "@/lib/validation/project";
import { TRACK_STATUS_ORDER, TRACK_STATUS_TIMESTAMP_FIELD, tracksNeedingAdvance } from "@/lib/track-status";
import { refreshDraftCompensationPeriods } from "@/lib/services/compensation/refresh";
import type { ProjectStatus, TrackStatus } from "@/generated/prisma/enums";

export type ProjectFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

/**
 * The authorization boundary for project writes (there is no Postgres RLS
 * in this app). Admin can write any project. A Studio Manager can only
 * modify a project they are the lead engineer on, and cannot reassign a
 * project's lead engineer to someone else — mirrors the plan's RLS-equivalent
 * rule and is unit-tested in tests/unit.
 */
// Duplicated from queries/employees.ts rather than imported: that file is
// guarded by "server-only", which throws when actions/projects.ts is loaded
// by unit tests outside Next's bundler (see project-authorization.test.ts).
async function getPrimaryStudioManager() {
  return prisma.employee.findFirst({
    where: { active: true, role: { code: "STUDIO_MANAGER" } },
    orderBy: { createdAt: "asc" },
  });
}

export async function assertCanWriteProject(project: { leadEngineerId: string | null }) {
  const employee = await requireEmployee();
  if (employee.role.code === "ADMIN") return employee;
  if (project.leadEngineerId === employee.id) return employee;
  // Unassigned projects (no lead engineer yet) are fair game for any
  // employee — most projects get created before someone's formally
  // assigned, and this shouldn't require an Admin just to fix a typo.
  if (project.leadEngineerId === null) return employee;
  throw new Error("You can only modify projects you are the lead engineer on.");
}

export async function createProject(_prevState: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  await requireEmployee();

  const validated = ProjectSchema.safeParse({
    clientId: formData.get("clientId"),
    artistId: formData.get("artistId"),
    primaryServiceId: formData.get("primaryServiceId"),
    leadEngineerId: formData.get("leadEngineerId"),
    title: formData.get("title"),
    trackCount: formData.get("trackCount"),
    quotedPrice: formData.get("quotedPrice"),
    scheduledRecordingAt: formData.get("scheduledRecordingAt"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  // Default to the studio's primary engineer so delivered-track/production
  // comp always has someone to attribute to — a project left unassigned is
  // easy to forget and silently zeroes out the production bonus for
  // whoever actually did the work. Still fully overridable via the form.
  const leadEngineerId = data.leadEngineerId ?? (await getPrimaryStudioManager())?.id;

  const project = await prisma.project.create({
    data: {
      clientId: data.clientId,
      artistId: data.artistId,
      primaryServiceId: data.primaryServiceId,
      leadEngineerId,
      title: data.title,
      trackCount: data.trackCount,
      quotedPrice: data.quotedPrice,
      quotedPriceBase: data.quotedPrice,
      scheduledRecordingAt: data.scheduledRecordingAt ? new Date(data.scheduledRecordingAt) : undefined,
      notes: data.notes,
      tracks: {
        create: Array.from({ length: data.trackCount }, (_, i) => ({ trackNumber: i + 1 })),
      },
    },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectDetails(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { tracks: true },
  });
  const employee = await assertCanWriteProject(project);

  const validated = ProjectDetailsSchema.safeParse({
    title: formData.get("title"),
    artistId: formData.get("artistId"),
    primaryServiceId: formData.get("primaryServiceId"),
    leadEngineerId: formData.get("leadEngineerId"),
    trackCount: formData.get("trackCount"),
    quotedPrice: formData.get("quotedPrice"),
    scheduledRecordingAt: formData.get("scheduledRecordingAt"),
    notes: formData.get("notes"),
  });

  if (!validated.success) {
    return { error: "Please fix the errors below.", fieldErrors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  // A Studio Manager may not reassign the project to someone else.
  if (
    employee.role.code === "STUDIO_MANAGER" &&
    data.leadEngineerId &&
    data.leadEngineerId !== employee.id &&
    data.leadEngineerId !== project.leadEngineerId
  ) {
    return { error: "You can't reassign this project to another engineer." };
  }

  // Reconcile ProjectTrack rows with the new count. Growing adds fresh
  // PENDING tracks; shrinking removes the highest-numbered ones — but only
  // if none of them have any work logged, so a typo'd count can't silently
  // delete real production progress.
  if (data.trackCount > project.tracks.length) {
    await prisma.projectTrack.createMany({
      data: Array.from({ length: data.trackCount - project.tracks.length }, (_, i) => ({
        projectId,
        trackNumber: project.tracks.length + i + 1,
      })),
    });
  } else if (data.trackCount < project.tracks.length) {
    const toRemove = project.tracks
      .filter((t) => t.trackNumber > data.trackCount)
      .sort((a, b) => b.trackNumber - a.trackNumber);
    const hasProgress = toRemove.some(
      (t) => t.status !== "PENDING" || t.editedAt || t.mixedAt || t.masteredAt || t.deliveredAt
    );
    // A typo'd count shouldn't silently delete real production progress —
    // but an Admin cleaning up a genuine mistake (test data, wrong count
    // entered) needs a way through. Studio Managers still hit the hard
    // block; the form makes clear to an Admin what they're discarding.
    if (hasProgress && employee.role.code !== "ADMIN") {
      return {
        error: `Can't reduce to ${data.trackCount} tracks — some of tracks ${data.trackCount + 1}-${project.tracks.length} already have work logged. Update their status back to Pending first if you're sure, or leave the count as-is.`,
      };
    }
    await prisma.projectTrack.deleteMany({
      where: { id: { in: toRemove.map((t) => t.id) } },
    });

    // Any of the removed tracks that were DELIVERED were counted toward
    // someone's production/mix-master variable — refresh whichever month(s)
    // that comp was attributed to so it doesn't keep counting tracks that
    // no longer exist.
    if (project.leadEngineerId) {
      const deliveredDates = [...new Set(toRemove.filter((t) => t.deliveredAt).map((t) => t.deliveredAt!.getTime()))].map(
        (t) => new Date(t)
      );
      await Promise.all(deliveredDates.map((date) => refreshDraftCompensationPeriods([project.leadEngineerId!], date)));
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      title: data.title,
      artistId: data.artistId ?? null,
      primaryServiceId: data.primaryServiceId,
      leadEngineerId: data.leadEngineerId ?? null,
      trackCount: data.trackCount,
      quotedPrice: data.quotedPrice,
      quotedPriceBase: data.quotedPrice,
      scheduledRecordingAt: data.scheduledRecordingAt ? new Date(data.scheduledRecordingAt) : null,
      notes: data.notes,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

type PrismaProjectUpdateTimestamps =
  | "recordingStartedAt"
  | "recordingCompletedAt"
  | "editingStartedAt"
  | "editingCompletedAt"
  | "mixStartedAt"
  | "mixCompletedAt"
  | "masterStartedAt"
  | "masterCompletedAt"
  | "firstDeliveredAt"
  | "finalDeliveredAt"
  | "revisionRequestedAt";

const statusTimestampFields: Partial<Record<ProjectStatus, PrismaProjectUpdateTimestamps[]>> = {
  RECORDING: ["recordingStartedAt"],
  EDITING: ["recordingCompletedAt", "editingStartedAt"],
  MIXING: ["editingCompletedAt", "mixStartedAt"],
  MASTERING: ["mixCompletedAt", "masterStartedAt"],
  READY_TO_DELIVER: ["masterCompletedAt"],
  DELIVERED: ["firstDeliveredAt", "finalDeliveredAt"],
  REVISION: ["revisionRequestedAt"],
};

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  await assertCanWriteProject(project);

  const fieldsToStamp = statusTimestampFields[status] ?? [];
  const timestampData: Partial<Record<PrismaProjectUpdateTimestamps, Date>> = {};
  const now = new Date();
  for (const field of fieldsToStamp) {
    if (!project[field]) timestampData[field] = now;
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status, ...timestampData },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function updateProjectTrackStatus(trackId: string, status: TrackStatus) {
  const track = await prisma.projectTrack.findUniqueOrThrow({
    where: { id: trackId },
    include: { project: true },
  });
  await assertCanWriteProject(track.project);

  const field = TRACK_STATUS_TIMESTAMP_FIELD[status];
  const timestampData = field && !track[field] ? { [field]: new Date() } : {};

  await prisma.projectTrack.update({
    where: { id: trackId },
    data: { status, ...timestampData },
  });

  // Whichever month this track was (or still is) DELIVERED in may need its
  // production/mix-master variable refreshed — covers both directions:
  // newly delivered (dated now) and reverted away from delivered (dated
  // whenever it was originally marked so).
  if (track.project.leadEngineerId) {
    const datesToRefresh = [track.deliveredAt, new Date()].filter((d): d is Date => d !== null);
    await Promise.all(
      datesToRefresh.map((date) => refreshDraftCompensationPeriods([track.project.leadEngineerId!], date))
    );
  }

  revalidatePath(`/projects/${track.projectId}`);
}

// Advances every track that's currently earlier than targetStatus in the
// standard PENDING->DELIVERED progression. Tracks in REVISION_REQUESTED are
// skipped — a flagged redo shouldn't get silently marked done by a bulk
// sweep. Returns the number of tracks actually changed, for the caller's
// toast message.
export async function bulkAdvanceTrackStatus(projectId: string, targetStatus: TrackStatus): Promise<number> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { tracks: true },
  });
  await assertCanWriteProject(project);

  if (!TRACK_STATUS_ORDER.includes(targetStatus)) {
    throw new Error("Bulk-advance only supports the standard Pending -> Delivered progression.");
  }

  const tracksToAdvance = tracksNeedingAdvance(project.tracks, targetStatus);
  if (tracksToAdvance.length === 0) return 0;

  const field = TRACK_STATUS_TIMESTAMP_FIELD[targetStatus];
  const now = new Date();

  await prisma.$transaction(
    tracksToAdvance.map((t) =>
      prisma.projectTrack.update({
        where: { id: t.id },
        data: {
          status: targetStatus,
          ...(field && !t[field] ? { [field]: now } : {}),
        },
      })
    )
  );

  if (project.leadEngineerId) {
    await refreshDraftCompensationPeriods([project.leadEngineerId], now);
  }

  revalidatePath(`/projects/${projectId}`);
  return tracksToAdvance.length;
}

export async function deleteProject(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { tracks: true, sessions: true },
  });
  await assertCanWriteProject(project);

  // Real production work logged on any track means real time was spent —
  // don't let a mis-booked project silently take that with it.
  const hasTrackProgress = project.tracks.some(
    (t) => t.status !== "PENDING" || t.editedAt || t.mixedAt || t.masteredAt || t.deliveredAt
  );
  if (hasTrackProgress) {
    throw new Error(
      "Can't delete a project with track progress logged — reset the tracks to Pending first if you're sure, or leave the project as-is."
    );
  }

  // Any session that isn't plain UNPAID represents real money changing
  // hands (paid, partially paid, or refunded) — that's a financial record
  // worth protecting, not something to lose as a side effect of cleaning
  // up a project.
  const hasFinancialActivity = project.sessions.some((s) => s.paymentStatus !== "UNPAID");
  if (hasFinancialActivity) {
    throw new Error(
      "Can't delete a project with a paid, partially-paid, or refunded session attached — that's real collected revenue. Handle those sessions individually first."
    );
  }

  if (project.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: project.invoiceId },
      include: { payments: true },
    });
    if (invoice && invoice.payments.length > 0) {
      throw new Error("Can't delete a project with a paid invoice attached.");
    }
  }

  // Whatever sessions remain are plain UNPAID bookings for this project —
  // safe to remove along with it (ProjectTrack rows cascade automatically).
  await prisma.session.deleteMany({ where: { projectId } });
  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
  revalidatePath("/sessions");
  redirect("/projects");
}
