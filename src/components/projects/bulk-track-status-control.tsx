"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkAdvanceTrackStatus } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRACK_STATUS_ORDER, TRACK_STATUS_LABELS, tracksNeedingAdvance } from "@/lib/track-status";
import type { TrackStatus } from "@/generated/prisma/enums";

export function BulkTrackStatusControl({
  projectId,
  tracks,
}: {
  projectId: string;
  tracks: { status: TrackStatus }[];
}) {
  const [target, setTarget] = useState<TrackStatus>("EDITED");
  const [pending, startTransition] = useTransition();

  const remainingCount = useMemo(() => tracksNeedingAdvance(tracks, target).length, [tracks, target]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Advance all tracks to</span>
      <Select value={target} onValueChange={(v) => setTarget(v as TrackStatus)}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRACK_STATUS_ORDER.map((val) => (
            <SelectItem key={val} value={val}>
              {TRACK_STATUS_LABELS[val]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending || remainingCount === 0}
        onClick={() => {
          startTransition(async () => {
            try {
              const count = await bulkAdvanceTrackStatus(projectId, target);
              toast.success(`Advanced ${count} track${count === 1 ? "" : "s"} to ${TRACK_STATUS_LABELS[target]}.`);
            } catch {
              toast.error("Couldn't bulk-update track status.");
            }
          });
        }}
      >
        {pending ? "Applying..." : `Apply to ${remainingCount} remaining`}
      </Button>
    </div>
  );
}
