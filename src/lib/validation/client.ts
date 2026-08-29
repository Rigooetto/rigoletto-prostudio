import { z } from "zod";

export const ClientSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required."),
  contactName: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  instagramHandle: z.string().trim().optional().or(z.literal("")),
  leadSourceId: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof ClientSchema>;

export const ArtistSchema = z.object({
  clientId: z.string().min(1),
  stageName: z.string().trim().min(1, "Stage name is required."),
  genre: z.string().trim().optional().or(z.literal("")),
});
