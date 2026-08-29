import { normalizePhoneToE164 } from "@/lib/phone";
import { formatDate, formatTime } from "@/lib/format";

const GRAPH_API_VERSION = "v21.0";

export type WhatsappSendResult = {
  status: "SENT" | "FAILED" | "SKIPPED";
  error?: string;
  // Meta's own message id ("wamid...") — only present on a genuine SENT,
  // used by the caller to log a real WhatsappMessage row (see
  // src/lib/actions/sessions.ts). A SKIPPED/FAILED attempt never got a real
  // message back from Meta, so it has nothing to log there.
  waMessageId?: string;
};

/**
 * Sends the booking-confirmation WhatsApp message via Meta's WhatsApp Cloud
 * API directly (no BSP — Twilio doesn't support WhatsApp Coexistence, which
 * this studio needs: the real WhatsApp Business App must keep working on
 * staff phones alongside these automated sends). Never throws — a
 * notification failure must never block a session booking, so every branch
 * resolves with a result instead. SKIPPED (Meta not configured, or no valid
 * phone number) is distinct from FAILED (a real send attempt that errored)
 * since the former is expected in dev/for bad data.
 */
export async function sendBookingConfirmationWhatsApp(params: {
  clientName: string;
  phone: string | null;
  startsAt: Date;
  studioRoom: string;
}): Promise<WhatsappSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_BOOKING_TEMPLATE_NAME;
  const templateLang = process.env.WHATSAPP_BOOKING_TEMPLATE_LANG || "es_MX";

  if (!accessToken || !phoneNumberId || !templateName) {
    return { status: "SKIPPED", error: "WhatsApp not configured" };
  }

  const e164Phone = normalizePhoneToE164(params.phone);
  if (!e164Phone) {
    return { status: "SKIPPED", error: "No valid phone number" };
  }

  const firstName = params.clientName.trim().split(/\s+/)[0] || params.clientName;
  const textParam = (text: string) => ({ type: "text", text });

  const body = {
    messaging_product: "whatsapp",
    // Meta's Cloud API expects digits only, no leading "+".
    to: e164Phone.replace(/^\+/, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLang },
      components: [
        {
          type: "body",
          parameters: [
            textParam(firstName),
            textParam(formatDate(params.startsAt)),
            textParam(formatTime(params.startsAt)),
            textParam(params.studioRoom),
          ],
        },
      ],
    },
  };

  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { status: "FAILED", error: errorBody.slice(0, 500) };
    }

    const result = (await response.json()) as { messages?: { id?: string }[] };
    return { status: "SENT", waMessageId: result.messages?.[0]?.id };
  } catch (err) {
    return { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "Unknown error" };
  }
}
