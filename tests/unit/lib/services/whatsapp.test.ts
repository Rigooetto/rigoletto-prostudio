import { describe, it, expect, vi, afterEach } from "vitest";
import { sendBookingConfirmationWhatsApp } from "@/lib/services/whatsapp";

const baseParams = {
  clientName: "Maria Lopez",
  phone: "664 123 4567",
  startsAt: new Date("2026-09-01T14:00:00"),
  studioRoom: "Main Room",
};

function stubWhatsappEnv() {
  vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "token_test");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "1234567890");
  vi.stubEnv("WHATSAPP_BOOKING_TEMPLATE_NAME", "session_booking_confirmation");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendBookingConfirmationWhatsApp", () => {
  it("is SKIPPED when WhatsApp env vars are missing (e.g. local dev)", async () => {
    const result = await sendBookingConfirmationWhatsApp(baseParams);
    expect(result.status).toBe("SKIPPED");
    expect(result.error).toMatch(/not configured/i);
  });

  it("is SKIPPED when the phone doesn't normalize to a valid number", async () => {
    stubWhatsappEnv();
    const result = await sendBookingConfirmationWhatsApp({ ...baseParams, phone: "123" });
    expect(result.status).toBe("SKIPPED");
    expect(result.error).toMatch(/phone/i);
  });

  it("is SKIPPED when there's no phone number at all", async () => {
    stubWhatsappEnv();
    const result = await sendBookingConfirmationWhatsApp({ ...baseParams, phone: null });
    expect(result.status).toBe("SKIPPED");
  });

  it("is SENT on a successful Meta response, and never throws", async () => {
    stubWhatsappEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.test123" }] }), { status: 200 }))
    );
    const result = await sendBookingConfirmationWhatsApp(baseParams);
    expect(result.status).toBe("SENT");
  });

  it("captures Meta's message id (wamid) on success, for logging the outbound message", async () => {
    stubWhatsappEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.test123" }] }), { status: 200 }))
    );
    const result = await sendBookingConfirmationWhatsApp(baseParams);
    expect(result.waMessageId).toBe("wamid.test123");
  });

  it("is FAILED (not thrown) when Meta returns an error, e.g. an unapproved/mismatched template", async () => {
    stubWhatsappEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Template name does not exist" } }), { status: 400 })
      )
    );
    const result = await sendBookingConfirmationWhatsApp(baseParams);
    expect(result.status).toBe("FAILED");
    expect(result.error).toMatch(/Template name does not exist/);
  });

  it("is FAILED (not thrown) when the network request itself rejects", async () => {
    stubWhatsappEnv();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await sendBookingConfirmationWhatsApp(baseParams);
    expect(result.status).toBe("FAILED");
    expect(result.error).toMatch(/network down/);
  });

  it("sends the recipient as digits-only E.164 (no leading +) per Meta's Cloud API convention", async () => {
    stubWhatsappEnv();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.x" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendBookingConfirmationWhatsApp(baseParams);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.to).toBe("526641234567");
  });

  it("posts to the phone-number-scoped Graph API endpoint with a Bearer token", async () => {
    stubWhatsappEnv();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.x" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendBookingConfirmationWhatsApp(baseParams);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/1234567890/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token_test");
  });
});
