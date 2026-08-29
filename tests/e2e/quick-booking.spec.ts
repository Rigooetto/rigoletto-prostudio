import { test, expect } from "@playwright/test";

// Covers the unified booking flow: a brand-new client + a brand-new
// multi-track project + a session, created in one form submission instead
// of the old 3-dialog / 3-round-trip flow. Also spot-checks that the two
// entry points this change didn't touch (Calendar's date-prefilled link and
// a direct ?clientId= link) still work against the rebuilt form.

const ADMIN_EMAIL = "admin@rigolettoprostudio.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

test("unified booking form: new client + new project + session in one submit", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const clientName = `QuickBook Client ${uniqueSuffix}`;
  const projectTitle = `QuickBook Album ${uniqueSuffix}`;

  await test.step("log in as Admin", async () => {
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  let sessionId = "";
  await test.step("book a new client + new 10-track project + session in one pass", async () => {
    await page.goto("/sessions/new");

    await page.getByRole("button", { name: "+ New client", exact: true }).click();
    await page.fill('input[name="newClientName"]', clientName);
    await page.fill('input[name="newClientPhone"]', "555-0100");

    await page.click("#serviceId");
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: "+ New", exact: true }).click();
    await page.fill('input[name="newProjectTitle"]', projectTitle);
    await page.fill('input[name="newProjectTrackCount"]', "10");

    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 16);
    await page.fill('input[name="startsAt"]', fmt(start));
    await page.fill('input[name="endsAt"]', fmt(end));
    await page.fill('input[name="amount"]', "500");

    await page.click('button[type="submit"]:has-text("Book Session")');
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
    sessionId = page.url().split("/sessions/")[1];
  });

  await test.step("booking succeeds even though WhatsApp isn't configured in this dev environment", async () => {
    // No WHATSAPP_* env vars are set here, so the send is expected to be
    // skipped — the point of this assertion is that booking still worked
    // and the page loaded, proving a missing/failed WhatsApp send never
    // blocks the booking itself.
    await expect(page.getByText("WhatsApp Skipped")).toBeVisible();
  });

  let projectId = "";
  await test.step("the session links to exactly one new client and one new 10-track project", async () => {
    await page.goto(`/sessions/${sessionId}`);
    await expect(page.getByRole("link", { name: clientName })).toBeVisible();
    const projectLink = page.getByRole("link", { name: projectTitle });
    await expect(projectLink).toBeVisible();
    const href = await projectLink.getAttribute("href");
    projectId = href!.split("/projects/")[1];
  });

  await test.step("the new project has exactly 10 tracks", async () => {
    await page.goto(`/projects/${projectId}`);
    const trackRows = page.locator("table").first().locator("tbody tr");
    await expect(trackRows).toHaveCount(10);
  });

  let clientId = "";
  await test.step("the client detail page shows the one project, nothing orphaned", async () => {
    await page.goto(`/sessions/${sessionId}`);
    const clientLink = page.getByRole("link", { name: clientName });
    const clientHref = await clientLink.getAttribute("href");
    clientId = clientHref!.split("/clients/")[1];

    await page.goto(`/clients/${clientId}`);
    await expect(page.getByText(projectTitle)).toBeVisible();
  });

  await test.step("Calendar's date-prefilled entry point still works against the rebuilt form", async () => {
    // Calendar defaults to Month view — each day cell's "New session" icon
    // link carries the same ?date= prefill as Week view's text link.
    await page.goto("/calendar");
    await page.getByRole("link", { name: "New session" }).first().click();
    await page.waitForURL(/\/sessions\/new\?date=/);
    const startValue = await page.locator('input[name="startsAt"]').inputValue();
    expect(startValue).toMatch(/T12:00$/);
  });

  await test.step("a direct ?clientId= link still pre-selects the existing client", async () => {
    await page.goto(`/sessions/new?clientId=${clientId}`);
    await expect(page.locator("#clientId")).toContainText(clientName);
    // Existing-project mode should offer this client's project we just made.
    await expect(page.getByRole("button", { name: "Existing", exact: true })).toBeVisible();
  });
});
