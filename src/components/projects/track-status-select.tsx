"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateProjectTrackStatus } from "@/lib/actions/projects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRACK_STATUS_VALUES, TRACK_STATUS_LABELS } from "@/lib/track-status";
import type { TrackStatus } from "@/generated/prisma/enums";

export function TrackStatusSelect({ trackId, status }: { trackId: string; status: TrackStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(next) => {
        startTransition(async () => {
          try {
            await updateProjectTrackStatus(trackId, next as TrackStatus);
          } catch {
            toast.error("Couldn't update track status.");
          }
        });
      }}
    >
      <SelectTrigger size="sm" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TRACK_STATUS_VALUES.map((val) => (
          <SelectItem key={val} value={val}>
            {TRACK_STATUS_LABELS[val]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
