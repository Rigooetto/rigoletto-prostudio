import { test, expect } from "@playwright/test";

// Covers Phase B of the Calendar redesign: dragging a session block in the
// time-grid (day/week view) reschedules it via a real pointer gesture, not
// just a call to the server action directly. Two behaviors matter: the
// drop persists past a reload, and a same-room time conflict produces a
// warning toast without blocking the move (this app's soft-warning
// convention — see rescheduleSession in src/lib/actions/sessions.ts).

const ADMIN_EMAIL = "admin@rigolettoprostudio.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test("dragging a session block reschedules it, warning on a same-room conflict", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const clientAName = `Drag Test Client A ${uniqueSuffix}`;
  const clientBName = `Drag Test Client B ${uniqueSuffix}`;

  // A week out, at a fixed hour, so this test never collides with whatever
  // real sessions happen to be booked "today" and never lands near midnight.
  const dayDate = new Date();
  dayDate.setDate(dayDate.getDate() + 7);

  async function bookSession(clientName: string, startHour: number, endHour: number) {
    await page.goto("/sessions/new");
    await page.getByRole("button", { name: "+ New client", exact: true }).click();
    await page.fill('input[name="newClientName"]', clientName);
    await page.click("#serviceId");
    await page.getByRole("option").first().click();

    const start = new Date(dayDate);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(dayDate);
    end.setHours(endHour, 0, 0, 0);
    await page.fill('input[name="startsAt"]', toDatetimeLocalValue(start));
    await page.fill('input[name="endsAt"]', toDatetimeLocalValue(end));
    await page.fill('input[name="amount"]', "300");

    await page.click('button[type="submit"]:has-text("Book Session")');
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
  }

  await test.step("log in as Admin", async () => {
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  await test.step("book session A (09:00-10:00) and session B (13:00-14:00), same room", async () => {
    await bookSession(clientAName, 9, 10);
    await bookSession(clientBName, 13, 14);
  });

  const dateParam = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;

  await test.step("drag session A down 4 hours, onto session B's slot", async () => {
    await page.goto(`/calendar?view=day&date=${dateParam}`);
    const blockA = page.locator("button", { hasText: clientAName });
    await expect(blockA).toBeVisible();
    const box = await blockA.boundingBox();
    if (!box) throw new Error("session block A not found");

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Several intermediate moves so the drag threshold and snap logic both
    // see real incremental movement, not a single teleport.
    for (let i = 1; i <= 4; i++) {
      await page.mouse.move(startX, startY + i * 60, { steps: 5 });
    }
    await page.mouse.up();
  });

  await test.step("a same-room overlap with session B produces a warning toast", async () => {
    await expect(page.getByText(/Overlaps with .*Main Room/)).toBeVisible({ timeout: 5000 });
  });

  await test.step("the move persisted past reload despite the warning", async () => {
    await page.reload();
    const blockA = page.locator("button", { hasText: clientAName });
    await expect(blockA).toContainText("1:00 PM");
  });
});
