import { z } from "zod";

export const TaskStatusValues = ["TODO", "IN_PROGRESS", "DONE"] as const;

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

export const TaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: emptyToUndefined,
  dueAt: emptyToUndefined,
  assignedToEmployeeId: emptyToUndefined,
  relatedProjectId: emptyToUndefined,
  relatedLeadId: emptyToUndefined,
  relatedClientId: emptyToUndefined,
});
