import { z } from "zod";

// The booking-time choice, not the stored PaymentStatus directly — "Deposit"
// isn't a real PaymentStatus value, it's a shorthand for "record a payment
// for half the amount now," which bookSession translates into a real
// PARTIAL-status payment record. Full Refunded/further Partial adjustments
// only make sense afterward, via recordSessionPayment — never a raw pick here.
export const SessionCreatePaymentStatusValues = ["UNPAID", "DEPOSIT", "PAID"] as const;

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

// Powers the single-form "book a session" flow: client and project can each
// independently be an existing record, a brand-new one created inline, or
// (project only) skipped entirely — one submission handles every
// combination instead of three separate dialogs/round-trips.
export const BookSessionSchema = z
  .object({
    clientMode: z.enum(["existing", "new"]),
    clientId: emptyToUndefined,
    newClientName: emptyToUndefined,
    newClientPhone: emptyToUndefined,
    newClientEmail: z.preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.string().email("Enter a valid email.").optional()
    ),

    projectMode: z.enum(["existing", "new", "none"]),
    projectId: emptyToUndefined,
    newProjectTitle: emptyToUndefined,
    newProjectTrackCount: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : val),
      z.coerce.number().int().min(1, "At least 1 track.").max(100, "That's a lot of tracks.").optional()
    ),

    artistId: emptyToUndefined,
    serviceId: z.string().min(1, "Select a service."),
    studioRoom: z.string().trim().min(1, "Room is required.").default("Main Room"),
    startsAt: z.string().min(1, "Start time is required."),
    endsAt: z.string().min(1, "End time is required."),
    amount: z.coerce.number().min(0, "Amount must be zero or more."),
    paymentStatus: z.enum(SessionCreatePaymentStatusValues).default("UNPAID"),
    notes: emptyToUndefined,
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End time must be after start time.",
    path: ["endsAt"],
  })
  .refine((data) => data.clientMode === "new" || !!data.clientId, {
    message: "Select a client.",
    path: ["clientId"],
  })
  .refine((data) => data.clientMode === "existing" || !!data.newClientName, {
    message: "Enter a name for the new client.",
    path: ["newClientName"],
  })
  .refine((data) => data.projectMode === "new" || data.projectMode === "none" || !!data.projectId, {
    message: "Select a project.",
    path: ["projectId"],
  })
  .refine((data) => data.projectMode !== "new" || !!data.newProjectTitle, {
    message: "Title is required.",
    path: ["newProjectTitle"],
  })
  .refine((data) => data.projectMode !== "new" || !!data.newProjectTrackCount, {
    message: "Track count is required.",
    path: ["newProjectTrackCount"],
  });

export const PaymentMethodValues = ["CASH", "CARD", "TRANSFER", "OTHER"] as const;

export const SessionPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero."),
  method: z.enum(PaymentMethodValues).default("CASH"),
  paidAt: emptyToUndefined,
  notes: emptyToUndefined,
});

// Same shape minus paymentStatus — that's derived from real payment records,
// so an edit submission here must not touch it.
export const SessionDetailsSchema = z
  .object({
    projectId: emptyToUndefined,
    clientId: z.string().min(1, "Select a client."),
    artistId: emptyToUndefined,
    serviceId: z.string().min(1, "Select a service."),
    studioRoom: z.string().trim().min(1, "Room is required.").default("Main Room"),
    startsAt: z.string().min(1, "Start time is required."),
    endsAt: z.string().min(1, "End time is required."),
    amount: z.coerce.number().min(0, "Amount must be zero or more."),
    notes: emptyToUndefined,
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End time must be after start time.",
    path: ["endsAt"],
  });
