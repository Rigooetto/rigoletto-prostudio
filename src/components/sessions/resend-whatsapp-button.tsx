"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { resendWhatsappConfirmation } from "@/lib/actions/sessions";
import { Button } from "@/components/ui/button";

export function ResendWhatsappButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await resendWhatsappConfirmation(sessionId);
            if (result.status === "SENT") {
              toast.success("WhatsApp confirmation sent.");
            } else if (result.status === "SKIPPED") {
              toast.warning(result.error ?? "WhatsApp confirmation skipped.");
            } else {
              toast.error(result.error ?? "Couldn't send the WhatsApp confirmation.");
            }
          } catch {
            toast.error("Couldn't send the WhatsApp confirmation.");
          }
        });
      }}
    >
      <MessageCircle className="h-4 w-4" />
      {pending ? "Sending..." : "Resend Confirmation"}
    </Button>
  );
}
