"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateLeadStage } from "@/lib/actions/leads";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadStageValues } from "@/lib/validation/lead";
import type { LeadStage } from "@/generated/prisma/enums";

const labels: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTED: "Quoted",
  FOLLOW_UP: "Follow Up",
  BOOKED: "Booked",
  WON: "Won",
  LOST: "Lost",
};

export function LeadStageSelect({ leadId, stage }: { leadId: string; stage: LeadStage }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={stage}
      disabled={pending}
      onValueChange={(next) => {
        startTransition(async () => {
          try {
            await updateLeadStage(leadId, next as LeadStage);
          } catch {
            toast.error("Couldn't update stage.");
          }
        });
      }}
    >
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LeadStageValues.map((val) => (
          <SelectItem key={val} value={val}>
            {labels[val]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
