import { describe, it, expect, vi, beforeEach } from "vitest";

const requireEmployee = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireEmployee,
}));

const { assertCanWriteSession } = await import("@/lib/actions/sessions");

function admin() {
  return { id: "admin-1", role: { code: "ADMIN" } };
}

function manager(id = "turi-1") {
  return { id, role: { code: "STUDIO_MANAGER" } };
}

describe("assertCanWriteSession", () => {
  beforeEach(() => {
    requireEmployee.mockReset();
  });

  it("lets Admin write any session", async () => {
    requireEmployee.mockResolvedValue(admin());
    const employee = await assertCanWriteSession({ createdByEmployeeId: "someone-else", engineers: [] });
    expect(employee.role.code).toBe("ADMIN");
  });

  it("lets a Studio Manager write a session they created", async () => {
    requireEmployee.mockResolvedValue(manager("turi-1"));
    const employee = await assertCanWriteSession({ createdByEmployeeId: "turi-1", engineers: [] });
    expect(employee.id).toBe("turi-1");
  });

  it("lets a Studio Manager write a session they're assigned to as an engineer", async () => {
    requireEmployee.mockResolvedValue(manager("turi-1"));
    const employee = await assertCanWriteSession({
      createdByEmployeeId: "someone-else",
      engineers: [{ employeeId: "turi-1" }],
    });
    expect(employee.id).toBe("turi-1");
  });

  it("blocks a Studio Manager from writing a session they neither created nor are assigned to", async () => {
    requireEmployee.mockResolvedValue(manager("turi-1"));
    await expect(
      assertCanWriteSession({ createdByEmployeeId: "someone-else", engineers: [{ employeeId: "another-engineer" }] })
    ).rejects.toThrow(/only modify sessions you created or are assigned to/);
  });
});
