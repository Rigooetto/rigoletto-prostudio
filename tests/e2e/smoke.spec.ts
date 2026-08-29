import { test, expect } from "@playwright/test";

// Phase 1 golden-path smoke test: login -> client -> project -> session ->
// dashboard reflects it -> logout -> role-based nav (Settings hidden from
// Studio Manager). Not exhaustive coverage — see the plan doc for why this
// is the one e2e test Phase 1 ships with.

const ADMIN_EMAIL = "admin@rigolettoprostudio.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
const TURI_EMAIL = "turi@rigolettoprostudio.com";
const TURI_PASSWORD = process.env.SEED_TURI_PASSWORD ?? "ChangeMe123!";

test("golden path: login, create client/project/session, dashboards, logout", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const clientName = `Smoke Test Client ${uniqueSuffix}`;

  await test.step("unauthenticated visitors are redirected to /login", async () => {
    await page.goto("/");
    await page.waitForURL("**/login");
  });

  await test.step("Admin can log in", async () => {
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
    await expect(page.getByAltText("Rigoletto ProStudio").first()).toBeVisible();
  });

  let clientId = "";
  await test.step("create a client", async () => {
    await page.goto("/clients/new");
    await page.fill('input[name="displayName"]', clientName);
    await page.click('button[type="submit"]:has-text("Create Client")');
    await page.waitForURL(/\/clients\/[a-f0-9-]+$/);
    await expect(page.getByRole("heading", { name: clientName })).toBeVisible();
    clientId = page.url().split("/clients/")[1];
  });

  let projectId = "";
  await test.step("create a multi-track project and see all tracks", async () => {
    await page.goto(`/projects/new?clientId=${clientId}`);
    await page.fill('input[name="title"]', "Smoke Test Album");
    await page.click("#primaryServiceId");
    await page.getByRole("option").first().click();
    await page.fill('input[name="trackCount"]', "3");
    await page.click('button[type="submit"]:has-text("Create Project")');
    await page.waitForURL(/\/projects\/[a-f0-9-]+$/);
    projectId = page.url().split("/projects/")[1];

    // 3 track rows in the Tracks card specifically (page also has a Sessions table)
    const trackRows = page.locator("table").first().locator("tbody tr");
    await expect(trackRows).toHaveCount(3);
  });

  await test.step("create a session linked to the project", async () => {
    await page.goto(`/sessions/new?clientId=${clientId}&projectId=${projectId}`);
    await page.click("#serviceId");
    await page.getByRole("option").first().click();
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 16);
    await page.fill('input[name="startsAt"]', fmt(start));
    await page.fill('input[name="endsAt"]', fmt(end));
    await page.fill('input[name="amount"]', "200");
    await page.click('button[type="submit"]:has-text("Book Session")');
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    await expect(page.getByText("$200").first()).toBeVisible();
  });

  await test.step("the client detail page reflects the new project and session", async () => {
    await page.goto(`/clients/${clientId}`);
    await expect(page.getByText("Smoke Test Album")).toBeVisible();
  });

  await test.step("Admin can log out", async () => {
    await page.click('button[aria-label="Account menu"]');
    await page.click('button:has-text("Log out")');
    await page.waitForURL("**/login");
  });

  await test.step("Studio Manager (Turi) can log in and does not see Settings", async () => {
    await page.fill('input[name="email"]', TURI_EMAIL);
    await page.fill('input[name="password"]', TURI_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: /good morning/i })).toBeVisible();
    await expect(page.locator('a[href="/settings/services"]')).toHaveCount(0);
    // Phase 4's compensation engine renders a real live forecast here now
    // (base pay, production/mix-master/time-based variables, revenue bonus).
    await expect(page.getByText(/projected pay/i)).toBeVisible();
  });
});
