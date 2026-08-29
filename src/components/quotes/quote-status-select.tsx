"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateQuoteStatus } from "@/lib/actions/quotes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuoteStatusValues } from "@/lib/validation/quote";
import type { QuoteStatus } from "@/generated/prisma/enums";

const labels: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

export function QuoteStatusSelect({ quoteId, status }: { quoteId: string; status: QuoteStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(next) => {
        startTransition(async () => {
          try {
            await updateQuoteStatus(quoteId, next as QuoteStatus);
          } catch {
            toast.error("Couldn't update quote status.");
          }
        });
      }}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {QuoteStatusValues.map((val) => (
          <SelectItem key={val} value={val}>
            {labels[val]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
