"use client";

import { useTransition } from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { convertLeadToClient } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";

export function ConvertLeadButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            await convertLeadToClient(leadId);
          } catch {
            toast.error("Couldn't convert this lead.");
          }
        });
      }}
    >
      <UserCheck className="h-4 w-4" />
      {pending ? "Converting..." : "Convert to Client"}
    </Button>
  );
}
