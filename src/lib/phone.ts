import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Client phone numbers are stored as free text (dashes, spaces, parens,
 * missing/present country code) — real numbers, not a format guaranteed by
 * validation. Normalizes to E.164 (e.g. "+526641234567") for anything that
 * needs to actually dial/message the number, defaulting to Mexico when no
 * country code is present (this studio's primary market). Returns null for
 * anything that isn't a real, valid number rather than guessing.
 */
export function normalizePhoneToE164(rawPhone: string | null | undefined, defaultCountry: CountryCode = "MX"): string | null {
  const trimmed = rawPhone?.trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;

  return parsed.number;
}

/**
 * Thin, named wrapper for the one specific use of normalizePhoneToE164 that
 * matters for inbound WhatsApp routing: keeping Client.phoneE164 in sync
 * with Client.phone at every write site, so the webhook can match an
 * incoming sender by exact lookup instead of re-normalizing every client's
 * phone on every message.
 */
export function computeClientPhoneE164(phone: string | null | undefined): string | null {
  return normalizePhoneToE164(phone ?? null);
}
