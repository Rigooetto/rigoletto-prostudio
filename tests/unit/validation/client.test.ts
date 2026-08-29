import { describe, it, expect } from "vitest";
import { ClientSchema } from "@/lib/validation/client";

describe("ClientSchema", () => {
  it("accepts a minimal valid client", () => {
    const result = ClientSchema.safeParse({ displayName: "Los Nuevos" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty display name", () => {
    const result = ClientSchema.safeParse({ displayName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email but allows an empty one", () => {
    expect(ClientSchema.safeParse({ displayName: "X", email: "not-an-email" }).success).toBe(false);
    expect(ClientSchema.safeParse({ displayName: "X", email: "" }).success).toBe(true);
  });
});
