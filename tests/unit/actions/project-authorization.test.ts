import { describe, it, expect, vi, beforeEach } from "vitest";

const requireEmployee = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireEmployee,
}));

const { assertCanWriteProject } = await import("@/lib/actions/projects");

function admin() {
  return { id: "admin-1", role: { code: "ADMIN" } };
}

function manager(id = "turi-1") {
  return { id, role: { code: "STUDIO_MANAGER" } };
}

describe("assertCanWriteProject", () => {
  beforeEach(() => {
    requireEmployee.mockReset();
  });

  it("lets Admin write any project regardless of lead engineer", async () => {
    requireEmployee.mockResolvedValue(admin());
    const employee = await assertCanWriteProject({ leadEngineerId: "someone-else" });
    expect(employee.role.code).toBe("ADMIN");
  });

  it("lets a Studio Manager write a project they lead", async () => {
    requireEmployee.mockResolvedValue(manager("turi-1"));
    const employee = await assertCanWriteProject({ leadEngineerId: "turi-1" });
    expect(employee.id).toBe("turi-1");
  });

  it("blocks a Studio Manager from writing a project led by someone else", async () => {
    requireEmployee.mockResolvedValue(manager("turi-1"));
    await expect(assertCanWriteProject({ leadEngineerId: "other-engineer" })).rejects.toThrow(
      /only modify projects you are the lead engineer on/
    );
  });

  it("lets a Studio Manager write an unassigned project", async () => {
    requireEmployee.mockResolvedValue(manager("turi-1"));
    const employee = await assertCanWriteProject({ leadEngineerId: null });
    expect(employee.id).toBe("turi-1");
  });
});
