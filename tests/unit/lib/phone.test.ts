import { describe, it, expect } from "vitest";
import { normalizePhoneToE164 } from "@/lib/phone";

describe("normalizePhoneToE164", () => {
  it("normalizes a spaced local Mexican number to E.164", () => {
    expect(normalizePhoneToE164("664 123 4567")).toBe("+526641234567");
  });

  it("normalizes a parens/dashes-formatted number to E.164", () => {
    expect(normalizePhoneToE164("(664)123-4567")).toBe("+526641234567");
  });

  it("normalizes a bare 10-digit number to E.164", () => {
    expect(normalizePhoneToE164("6641234567")).toBe("+526641234567");
  });

  it("passes through a number already in E.164", () => {
    expect(normalizePhoneToE164("+526641234567")).toBe("+526641234567");
  });

  it("respects an explicit default country other than Mexico", () => {
    expect(normalizePhoneToE164("(415) 555-2671", "US")).toBe("+14155552671");
  });

  it("returns null for empty/whitespace input", () => {
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164("   ")).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(normalizePhoneToE164(null)).toBeNull();
    expect(normalizePhoneToE164(undefined)).toBeNull();
  });

  it("returns null for garbage/non-numeric input", () => {
    expect(normalizePhoneToE164("abc")).toBeNull();
  });

  it("returns null for a too-short/invalid number rather than guessing", () => {
    expect(normalizePhoneToE164("123")).toBeNull();
  });
});
