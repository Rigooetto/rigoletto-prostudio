import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature, parseWebhookPayload } from "@/lib/services/whatsapp-webhook";
import { normalizePhoneToE164 } from "@/lib/phone";

// Meta's one-time verification handshake when the webhook URL is configured
// in the App Dashboard — echoes hub.challenge back only if our verify token
// matches, proving we control this endpoint.
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response(null, { status: 403 });
}

// Inbound messages and delivery/read status updates for outbound sends.
// Always acks 200 once the request is confirmed authentic — Meta disables a
// webhook after repeated non-2xx responses, so an internal processing
// hiccup here must never look like a delivery failure to Meta.
export async function POST(req: NextRequest) {
  // Raw text, not .json() — signature verification needs the exact bytes
  // Meta signed, before any parsing.
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret || !verifyWebhookSignature(rawBody, signature, appSecret)) {
    return new Response(null, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const { inboundMessages, statusUpdates } = parseWebhookPayload(payload);

    for (const message of inboundMessages) {
      // Meta sends `from` as digits-only, already E.164 minus the "+" —
      // re-run through the normalizer so it matches Client.phoneE164's
      // stored format exactly.
      const fromE164 = normalizePhoneToE164(`+${message.from}`);
      if (!fromE164) continue;

      const client = await prisma.client.findFirst({ where: { phoneE164: fromE164 } });
      if (!client) {
        // No "unknown contacts" inbox — out of scope. Just don't lose the
        // signal that this happened.
        console.warn(`WhatsApp message from unrecognized number: ${message.from}`);
        continue;
      }

      // upsert on waMessageId — Meta redelivers webhook events, this makes
      // a duplicate delivery a no-op instead of a duplicate row or a crash.
      await prisma.whatsappMessage.upsert({
        where: { waMessageId: message.waMessageId },
        create: {
          clientId: client.id,
          direction: "INBOUND",
          body: message.body,
          waMessageId: message.waMessageId,
          status: "SENT",
        },
        update: {},
      });
    }

    for (const update of statusUpdates) {
      // updateMany (not update) so a status arriving before our own send
      // call finished persisting the row is a silent no-op, not a crash.
      // Collapses Meta's sent/delivered/read into our existing SENT — the
      // Session badge's 4 states aren't touched by this at all.
      await prisma.whatsappMessage.updateMany({
        where: { waMessageId: update.waMessageId },
        data: { status: update.status === "failed" ? "FAILED" : "SENT" },
      });
    }
  } catch (err) {
    console.error("WhatsApp webhook processing error", err);
  }

  return NextResponse.json({ received: true });
}
