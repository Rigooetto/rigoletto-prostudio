import { createHmac } from "crypto";
import { describe, it, expect } from "vitest";
import { verifyWebhookSignature, parseWebhookPayload } from "@/lib/services/whatsapp-webhook";

const APP_SECRET = "test_app_secret";

function signatureFor(rawBody: string, secret = APP_SECRET) {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a correctly-signed body", () => {
    const rawBody = '{"entry":[]}';
    expect(verifyWebhookSignature(rawBody, signatureFor(rawBody), APP_SECRET)).toBe(true);
  });

  it("rejects a body signed with the wrong app secret", () => {
    const rawBody = '{"entry":[]}';
    expect(verifyWebhookSignature(rawBody, signatureFor(rawBody, "wrong_secret"), APP_SECRET)).toBe(false);
  });

  it("rejects a body that doesn't match its claimed signature (tampered payload)", () => {
    const original = '{"entry":[]}';
    const tampered = '{"entry":[{"id":"evil"}]}';
    expect(verifyWebhookSignature(tampered, signatureFor(original), APP_SECRET)).toBe(false);
  });

  it("rejects when the signature header is missing", () => {
    expect(verifyWebhookSignature('{"entry":[]}', null, APP_SECRET)).toBe(false);
  });

  it("rejects a malformed/short signature header without throwing", () => {
    expect(verifyWebhookSignature('{"entry":[]}', "sha256=nope", APP_SECRET)).toBe(false);
  });
});

describe("parseWebhookPayload", () => {
  it("extracts an inbound text message", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ from: "526641234567", id: "wamid.ABC123", text: { body: "Hola, tengo una pregunta" } }],
              },
            },
          ],
        },
      ],
    };
    const result = parseWebhookPayload(payload);
    expect(result.inboundMessages).toEqual([
      { from: "526641234567", waMessageId: "wamid.ABC123", body: "Hola, tengo una pregunta" },
    ]);
    expect(result.statusUpdates).toEqual([]);
  });

  it("extracts a status update (delivery/read receipt for an outbound message)", () => {
    const payload = {
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.XYZ789", status: "delivered" }] } }] }],
    };
    const result = parseWebhookPayload(payload);
    expect(result.statusUpdates).toEqual([{ waMessageId: "wamid.XYZ789", status: "delivered" }]);
    expect(result.inboundMessages).toEqual([]);
  });

  it("handles multiple entries/changes in one payload", () => {
    const payload = {
      entry: [
        { changes: [{ value: { messages: [{ from: "1", id: "m1", text: { body: "a" } }] } }] },
        { changes: [{ value: { statuses: [{ id: "m1", status: "sent" }] } }] },
      ],
    };
    const result = parseWebhookPayload(payload);
    expect(result.inboundMessages).toHaveLength(1);
    expect(result.statusUpdates).toHaveLength(1);
  });

  it("ignores malformed entries instead of throwing", () => {
    expect(parseWebhookPayload(null)).toEqual({ inboundMessages: [], statusUpdates: [] });
    expect(parseWebhookPayload({})).toEqual({ inboundMessages: [], statusUpdates: [] });
    expect(parseWebhookPayload({ entry: "not an array" })).toEqual({ inboundMessages: [], statusUpdates: [] });
    expect(parseWebhookPayload({ entry: [{ changes: [{ value: { messages: [{ from: "1" }] } }] }] })).toEqual({
      inboundMessages: [],
      statusUpdates: [],
    });
  });
});
