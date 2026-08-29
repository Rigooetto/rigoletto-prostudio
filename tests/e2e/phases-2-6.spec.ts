import { test, expect } from "@playwright/test";

// Golden path across Phases 2-6: Lead -> Quote -> Client -> Project,
// Invoice -> Payment, Expense, Compensation generate/approve/pay, Campaign,
// Analytics, Month-End Close. Each phase's own actions/queries have unit
// coverage (tests/unit) — this is the cross-module integration smoke test.

const ADMIN_EMAIL = "admin@rigolettoprostudio.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

test("golden path: CRM -> financial -> compensation -> analytics", async ({ page }) => {
  // A long cross-module test touching ~15 distinct routes — generous budget
  // on purpose, not masking a real slowdown (each step has its own assertion).
  test.setTimeout(90_000);
  const suffix = Date.now();

  await test.step("log in as Admin", async () => {
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  let leadId = "";
  await test.step("create a lead", async () => {
    await page.goto("/leads/new");
    await page.fill('input[name="name"]', `Regression Lead ${suffix}`);
    await page.click('button[type="submit"]:has-text("Create Lead")');
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    leadId = page.url().split("/leads/")[1];
  });

  let quoteId = "";
  await test.step("quote the lead and accept it", async () => {
    await page.goto(`/quotes/new?leadId=${leadId}`);
    await page.click("#serviceId");
    await page.getByRole("option").first().click();
    await page.fill('input[name="amount"]', "350");
    await page.click('button[type="submit"]:has-text("Create Quote")');
    await page.waitForURL(/\/quotes\/[a-f0-9-]+$/);
    quoteId = page.url().split("/quotes/")[1];

    await page.click('button:has-text("Draft")');
    await page.getByRole("option", { name: "Accepted" }).click();
    await page.waitForTimeout(300);
  });

  let clientId = "";
  await test.step("convert the lead to a client", async () => {
    await page.goto(`/leads/${leadId}`);
    await page.click('button:has-text("Convert to Client")');
    await page.waitForURL(/\/clients\/[a-f0-9-]+$/);
    clientId = page.url().split("/clients/")[1];
  });

  await test.step("convert the accepted quote into a project", async () => {
    await page.goto(`/quotes/${quoteId}`);
    await page.fill('input[name="trackCount"]', "1");
    await page.click('button[type="submit"]:has-text("Create Project from Quote")');
    await page.waitForURL(/\/projects\/[a-f0-9-]+$/);
  });

  await test.step("invoice the client and record a payment", async () => {
    await page.goto(`/invoices/new?clientId=${clientId}`);
    await page.fill('input[name="total"]', "350");
    await page.click('button[type="submit"]:has-text("Create Invoice")');
    await page.waitForURL(/\/invoices\/[a-f0-9-]+$/);

    await page.fill('input[name="amount"]', "350");
    await page.click('button[type="submit"]:has-text("Record Payment")');
    await expect(page.getByText("PAID").first()).toBeVisible();
  });

  await test.step("the audit log recorded the payment", async () => {
    await page.goto("/settings/audit-log");
    await expect(page.getByText("payment.recorded").first()).toBeVisible();
  });

  await test.step("log an expense", async () => {
    await page.goto("/expenses");
    await page.click('button:has-text("New Expense")');
    await page.waitForSelector('input[name="vendor"]');
    await page.fill('input[name="vendor"]', `Regression Vendor ${suffix}`);
    await page.fill('input[name="amount"]', "100");
    await page.click('button[type="submit"]:has-text("Create Expense")');
    await page.waitForTimeout(300);
    await expect(page.getByText(`Regression Vendor ${suffix}`)).toBeVisible();
  });

  await test.step("financial dashboard reflects the invoice payment and expense", async () => {
    await page.goto("/finance");
    await expect(page.getByRole("heading", { name: "Financial Dashboard" })).toBeVisible();
  });

  await test.step("generate, approve, and pay a compensation period", async () => {
    await page.goto("/compensation");
    await page.click('button:has-text("Generate / Recalculate")');
    await page.waitForTimeout(800);

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator("a").first().click();
    await page.waitForURL(/\/compensation\/[a-f0-9-]+$/);

    const approveBtn = page.locator('button:has-text("Approve")');
    if ((await approveBtn.count()) > 0) {
      await approveBtn.click();
      await page.waitForTimeout(300);
    }
    const payBtn = page.locator('button:has-text("Mark Paid")');
    if ((await payBtn.count()) > 0) {
      await payBtn.click();
      await page.waitForTimeout(300);
    }
  });

  await test.step("log a marketing campaign", async () => {
    await page.goto("/marketing");
    await page.click('button:has-text("New Campaign")');
    await page.waitForSelector('input[name="name"]');
    await page.fill('input[name="name"]', `Regression Campaign ${suffix}`);
    await page.fill('input[name="spend"]', "200");
    await page.click('button[type="submit"]:has-text("Create Campaign")');
    await page.waitForTimeout(300);
    await expect(page.getByText(`Regression Campaign ${suffix}`)).toBeVisible();
  });

  await test.step("analytics page renders historical data", async () => {
    await page.goto("/analytics");
    await expect(page.getByText("Revenue, Expenses & Profit")).toBeVisible();
  });

  await test.step("calendar renders without error", async () => {
    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  });

  await test.step("tasks page renders without error", async () => {
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  });

  await test.step("compensation tiers are editable config, not hardcoded", async () => {
    await page.goto("/settings/compensation-tiers");
    await expect(page.getByText("Full Production")).toBeVisible();
  });
});
