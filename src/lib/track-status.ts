import type { ProjectStatus, TrackStatus } from "@/generated/prisma/enums";

// Canonical PENDING -> DELIVERED progression. REVISION_REQUESTED is a branch
// state, not a step in this order — anything doing ordered comparisons
// (bulk-advance, milestone suggestions) treats it as "not on the ladder."
export const TRACK_STATUS_ORDER: TrackStatus[] = [
  "PENDING",
  "RECORDING",
  "RECORDED",
  "EDITING",
  "EDITED",
  "MIXING",
  "MIXED",
  "MASTERING",
  "MASTERED",
  "DELIVERED",
];

export const TRACK_STATUS_VALUES: TrackStatus[] = [...TRACK_STATUS_ORDER, "REVISION_REQUESTED"];

export const TRACK_STATUS_LABELS: Record<TrackStatus, string> = {
  PENDING: "Pending",
  RECORDING: "Recording",
  RECORDED: "Recorded",
  EDITING: "Editing",
  EDITED: "Edited",
  MIXING: "Mixing",
  MIXED: "Mixed",
  MASTERING: "Mastering",
  MASTERED: "Mastered",
  DELIVERED: "Delivered",
  REVISION_REQUESTED: "Revision Requested",
};

export const TRACK_STATUS_TIMESTAMP_FIELD: Partial<
  Record<TrackStatus, "editedAt" | "mixedAt" | "masteredAt" | "deliveredAt">
> = {
  // DELIVERED counts toward Phase 4's tiered production compensation.
  EDITED: "editedAt",
  MIXED: "mixedAt",
  MASTERED: "masteredAt",
  DELIVERED: "deliveredAt",
};

// The normal forward path a project takes, used only to compare "is the
// project behind where its tracks already are." CANCELLED/ON_HOLD are
// intentionally excluded — a project sitting in either never gets a
// suggested-advance banner.
const PROJECT_STATUS_FORWARD_ORDER: ProjectStatus[] = [
  "LEAD",
  "QUOTED",
  "BOOKED",
  "RECORDING",
  "EDITING",
  "MIXING",
  "MASTERING",
  "CLIENT_REVIEW",
  "REVISION",
  "READY_TO_DELIVER",
  "DELIVERED",
  "PAID",
];

// Recording is typically half-paid at booking (deposit) with the rest due
// once recording wraps, before post-production starts — this flags projects
// at or past that point so an outstanding balance can be surfaced as a
// heads-up. Not a hard gate: a Studio Manager can still advance status/track
// stages regardless, this is advisory only.
export function hasStartedProduction(status: ProjectStatus): boolean {
  const index = PROJECT_STATUS_FORWARD_ORDER.indexOf(status);
  const recordingIndex = PROJECT_STATUS_FORWARD_ORDER.indexOf("RECORDING");
  return index !== -1 && index >= recordingIndex;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  LEAD: "Lead",
  QUOTED: "Quoted",
  BOOKED: "Booked",
  RECORDING: "Recording",
  EDITING: "Editing",
  MIXING: "Mixing",
  MASTERING: "Mastering",
  CLIENT_REVIEW: "Client Review",
  REVISION: "Revision",
  READY_TO_DELIVER: "Ready to Deliver",
  DELIVERED: "Delivered",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  ON_HOLD: "On Hold",
};

/** Tracks currently earlier than targetStatus in the standard progression. REVISION_REQUESTED (index -1) is never included. */
export function tracksNeedingAdvance<T extends { status: TrackStatus }>(tracks: T[], targetStatus: TrackStatus): T[] {
  const targetIndex = TRACK_STATUS_ORDER.indexOf(targetStatus);
  if (targetIndex === -1) return [];
  return tracks.filter((t) => {
    const currentIndex = TRACK_STATUS_ORDER.indexOf(t.status);
    return currentIndex !== -1 && currentIndex < targetIndex;
  });
}

const MILESTONES: { trackMin: TrackStatus; suggestedProjectStatus: ProjectStatus }[] = [
  { trackMin: "DELIVERED", suggestedProjectStatus: "DELIVERED" },
  { trackMin: "MASTERED", suggestedProjectStatus: "READY_TO_DELIVER" },
  { trackMin: "MIXED", suggestedProjectStatus: "MASTERING" },
  { trackMin: "EDITED", suggestedProjectStatus: "MIXING" },
];

/**
 * If every track has reached a milestone the project's own status hasn't
 * caught up to yet, suggest the furthest-applicable next Project status.
 * Checked most-advanced milestone first so a project that's fallen far
 * behind its tracks (e.g. bulk-advanced) gets the right jump, not just the
 * nearest one.
 */
export function suggestNextProjectStatus(
  tracks: { status: TrackStatus }[],
  currentStatus: ProjectStatus
): { status: ProjectStatus; label: string } | null {
  if (tracks.length === 0) return null;

  const currentIndex = PROJECT_STATUS_FORWARD_ORDER.indexOf(currentStatus);
  if (currentIndex === -1) return null;

  const allTracksAtLeast = (min: TrackStatus) => {
    const minIndex = TRACK_STATUS_ORDER.indexOf(min);
    return tracks.every((t) => TRACK_STATUS_ORDER.indexOf(t.status) >= minIndex);
  };

  for (const { trackMin, suggestedProjectStatus } of MILESTONES) {
    const suggestedIndex = PROJECT_STATUS_FORWARD_ORDER.indexOf(suggestedProjectStatus);
    if (currentIndex < suggestedIndex && allTracksAtLeast(trackMin)) {
      return { status: suggestedProjectStatus, label: PROJECT_STATUS_LABELS[suggestedProjectStatus] };
    }
  }
  return null;
}
