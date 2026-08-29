import { z } from "zod";

export const ProjectStatusValues = [
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
  "CANCELLED",
  "ON_HOLD",
] as const;

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().min(0).optional()
);

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

export const ProjectSchema = z.object({
  clientId: z.string().min(1, "Select a client."),
  artistId: emptyToUndefined,
  primaryServiceId: z.string().min(1, "Select a service."),
  leadEngineerId: emptyToUndefined,
  title: z.string().trim().min(1, "Title is required."),
  trackCount: z.coerce.number().int().min(1, "At least 1 track.").max(100, "That's a lot of tracks."),
  quotedPrice: optionalNumber,
  scheduledRecordingAt: emptyToUndefined,
  notes: emptyToUndefined,
});

export const ProjectDetailsSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  artistId: emptyToUndefined,
  primaryServiceId: z.string().min(1, "Select a service."),
  leadEngineerId: emptyToUndefined,
  trackCount: z.coerce.number().int().min(1, "At least 1 track.").max(100, "That's a lot of tracks."),
  quotedPrice: optionalNumber,
  scheduledRecordingAt: emptyToUndefined,
  notes: emptyToUndefined,
});
