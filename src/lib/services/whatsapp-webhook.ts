import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies Meta's X-Hub-Signature-256 header — an HMAC-SHA256 of the exact
 * raw request body, keyed with the app secret. Must run against the raw
 * bytes Meta actually signed, before any JSON.parse, or a byte-for-byte
 * mismatch (whitespace, key order) would falsely reject a real request.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signatureHeader);

  // timingSafeEqual throws on mismatched lengths rather than returning
  // false, so that has to be checked first.
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export type InboundWhatsappMessage = {
  from: string;
  waMessageId: string;
  body: string;
};

export type WhatsappStatusUpdate = {
  waMessageId: string;
  status: string;
};

/**
 * Meta's webhook payload nests messages/status-updates several levels deep
 * (entry[].changes[].value.{messages,statuses}) and delivers arbitrary,
 * untyped JSON — this defensively walks that shape without assuming any
 * particular entry actually contains what it claims to.
 */
export function parseWebhookPayload(payload: unknown): {
  inboundMessages: InboundWhatsappMessage[];
  statusUpdates: WhatsappStatusUpdate[];
} {
  const inboundMessages: InboundWhatsappMessage[] = [];
  const statusUpdates: WhatsappStatusUpdate[] = [];

  const entries = isRecord(payload) && Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = isRecord(entry) && Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = isRecord(change) ? change.value : undefined;
      if (!isRecord(value)) continue;

      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const message of messages) {
        if (!isRecord(message)) continue;
        const from = message.from;
        const id = message.id;
        const body = isRecord(message.text) ? message.text.body : undefined;
        if (typeof from === "string" && typeof id === "string" && typeof body === "string") {
          inboundMessages.push({ from, waMessageId: id, body });
        }
      }

      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const status of statuses) {
        if (!isRecord(status)) continue;
        const id = status.id;
        const statusValue = status.status;
        if (typeof id === "string" && typeof statusValue === "string") {
          statusUpdates.push({ waMessageId: id, status: statusValue });
        }
      }
    }
  }

  return { inboundMessages, statusUpdates };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
