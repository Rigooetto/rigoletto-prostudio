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

test("dragging a session pill in Month view moves it to the dropped day", async ({ page }) => {
  const clientName = `MonthDrag Test Client ${Date.now()}`;

  const originDay = new Date();
  originDay.setDate(originDay.getDate() + 12);
  const targetDay = new Date(originDay);
  targetDay.setDate(targetDay.getDate() + 2);

  const dateParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const originDateParam = dateParam(originDay);
  const targetDateParam = dateParam(targetDay);

  await test.step("log in as Admin", async () => {
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  await test.step("book a session on the origin day", async () => {
    await page.goto("/sessions/new");
    await page.getByRole("button", { name: "+ New client", exact: true }).click();
    await page.fill('input[name="newClientName"]', clientName);
    await page.click("#serviceId");
    await page.getByRole("option").first().click();

    const start = new Date(originDay);
    start.setHours(10, 0, 0, 0);
    const end = new Date(originDay);
    end.setHours(11, 0, 0, 0);
    await page.fill('input[name="startsAt"]', toDatetimeLocalValue(start));
    await page.fill('input[name="endsAt"]', toDatetimeLocalValue(end));
    await page.fill('input[name="amount"]', "300");
    await page.click('button[type="submit"]:has-text("Book Session")');
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
  });

  await test.step("drag the pill from the origin day cell onto the target day cell", async () => {
    await page.goto(`/calendar?view=month&date=${originDateParam}`);
    const pill = page.locator(`[data-day-content="${originDateParam}"] a`, { hasText: clientName });
    await expect(pill).toBeVisible();
    const pillBox = await pill.boundingBox();
    const targetBox = await page.locator(`[data-day-cell="${targetDateParam}"]`).first().boundingBox();
    if (!pillBox || !targetBox) throw new Error("pill or target day cell not found");

    const startX = pillBox.x + pillBox.width / 2;
    const startY = pillBox.y + pillBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(startX + (endX - startX) * (i / 5), startY + (endY - startY) * (i / 5), { steps: 3 });
    }
    await page.mouse.up();
  });

  await test.step("the session now shows under the target day, not the origin day", async () => {
    await expect(page.locator(`[data-day-content="${targetDateParam}"] a`, { hasText: clientName })).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator(`[data-day-content="${originDateParam}"] a`, { hasText: clientName })
    ).not.toBeVisible();
  });

  await test.step("the move persisted past reload", async () => {
    await page.reload();
    await expect(page.locator(`[data-day-content="${targetDateParam}"] a`, { hasText: clientName })).toBeVisible();
  });
});

// A multi-day session's own covered columns previously had no hit-test
// marker at all (only the *uncovered* days in its row got one), so once the
// dragged banner went pointer-events:none mid-drag, elementFromPoint fell
// through to nothing and the drop silently no-op'd. Covers the fix: every
// day in the row gets a marker now, with the banner painted on top of them.
test("dragging a multi-day banner in Month view shifts the whole span by the day delta", async ({ page }) => {
  const clientName = `MultiDayDrag Month Client ${Date.now()}`;

  // Tuesday origin, 3-day span (Tue/Wed/Thu) — never crosses a week row, so
  // the banner renders as one uninterrupted segment to grab and measure.
  const originDay = new Date();
  originDay.setDate(originDay.getDate() + 16);
  while (originDay.getDay() !== 2) originDay.setDate(originDay.getDate() + 1);
  const originEndDay = new Date(originDay);
  originEndDay.setDate(originEndDay.getDate() + 2);

  const dateParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  await test.step("log in as Admin", async () => {
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  await test.step("book a 3-day session (Tue-Thu)", async () => {
    await page.goto("/sessions/new");
    await page.getByRole("button", { name: "+ New client", exact: true }).click();
    await page.fill('input[name="newClientName"]', clientName);
    await page.click("#serviceId");
    await page.getByRole("option").first().click();

    const start = new Date(originDay);
    start.setHours(10, 0, 0, 0);
    const end = new Date(originEndDay);
    end.setHours(14, 0, 0, 0);
    await page.fill('input[name="startsAt"]', toDatetimeLocalValue(start));
    await page.fill('input[name="endsAt"]', toDatetimeLocalValue(end));
    await page.fill('input[name="amount"]', "500");
    await page.click('button[type="submit"]:has-text("Book Session")');
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
  });

  await test.step("grab the middle of the bar and drag it one day to the right", async () => {
    await page.goto(`/calendar?view=month&date=${dateParam(originDay)}`);
    const banner = page.locator("a", { hasText: clientName }).first();
    await expect(banner).toBeVisible();
    const box = await banner.boundingBox();
    if (!box) throw new Error("banner not found");

    const grabX = box.x + box.width / 2; // the middle day of the 3-day bar
    const grabY = box.y + box.height / 2;
    const dayWidth = box.width / 3;
    const targetX = grabX + dayWidth;

    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(grabX + (targetX - grabX) * (i / 5), grabY, { steps: 3 });
    }
    await page.mouse.up();
    // The drop commits via an async server action + router.refresh(), which
    // takes a moment to land — unlike the first test above, there's no
    // conflict-toast assertion here to double as a wait gate, so wait for
    // the banner to actually move before reloading, or the reload can race
    // ahead of the mutation and observe pre-drop data.
    await expect
      .poll(async () => (await banner.boundingBox())?.x, { timeout: 5000 })
      .not.toBe(box.x);
  });

  await test.step("the whole 3-day span shifted by one day, not just its start", async () => {
    const shiftedStart = new Date(originDay);
    shiftedStart.setDate(shiftedStart.getDate() + 1);

    await page.reload();
    const boxAfter = await page.locator("a", { hasText: clientName }).first().boundingBox();
    const originCell = await page.locator(`[data-day-cell="${dateParam(originDay)}"]`).first().boundingBox();
    const shiftedCell = await page.locator(`[data-day-cell="${dateParam(shiftedStart)}"]`).first().boundingBox();
    if (!boxAfter || !originCell || !shiftedCell) throw new Error("banner or day cells not found after reload");
    // The bar now starts at the shifted day's column, not the original one.
    expect(Math.abs(boxAfter.x - shiftedCell.x)).toBeLessThan(5);
    expect(Math.abs(boxAfter.x - originCell.x)).toBeGreaterThan(5);
  });
});

test("dragging a multi-day banner in Week view shifts the whole span by the day delta", async ({ page }) => {
  const clientName = `MultiDayDrag Week Client ${Date.now()}`;

  // Tuesday origin, 2-day span (Tue/Wed) — never crosses a week boundary.
  const originDay = new Date();
  originDay.setDate(originDay.getDate() + 23);
  while (originDay.getDay() !== 2) originDay.setDate(originDay.getDate() + 1);
  const originEndDay = new Date(originDay);
  originEndDay.setDate(originEndDay.getDate() + 1);

  const dateParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  await test.step("log in as Admin", async () => {
    await page.goto("/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  await test.step("book a 2-day session (Tue-Wed)", async () => {
    await page.goto("/sessions/new");
    await page.getByRole("button", { name: "+ New client", exact: true }).click();
    await page.fill('input[name="newClientName"]', clientName);
    await page.click("#serviceId");
    await page.getByRole("option").first().click();

    const start = new Date(originDay);
    start.setHours(10, 0, 0, 0);
    const end = new Date(originEndDay);
    end.setHours(14, 0, 0, 0);
    await page.fill('input[name="startsAt"]', toDatetimeLocalValue(start));
    await page.fill('input[name="endsAt"]', toDatetimeLocalValue(end));
    await page.fill('input[name="amount"]', "500");
    await page.click('button[type="submit"]:has-text("Book Session")');
    await page.waitForURL(/\/sessions\/[a-f0-9-]+$/);
  });

  await test.step("grab the start day of the bar and drag it one day to the right", async () => {
    await page.goto(`/calendar?view=week&date=${dateParam(originDay)}`);
    const banner = page.locator("a", { hasText: clientName }).first();
    await expect(banner).toBeVisible();
    const box = await banner.boundingBox();
    if (!box) throw new Error("banner not found");

    const grabX = box.x + box.width / 4; // within the first (Tuesday) day of the bar
    const grabY = box.y + box.height / 2;
    const dayWidth = box.width / 2;
    const targetX = grabX + dayWidth;

    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(grabX + (targetX - grabX) * (i / 5), grabY, { steps: 3 });
    }
    await page.mouse.up();
    // See the Month view test above: the drop commits asynchronously, and
    // there's no toast assertion here to act as an incidental wait gate.
    await expect
      .poll(async () => (await banner.boundingBox())?.x, { timeout: 5000 })
      .not.toBe(box.x);
  });

  await test.step("the session now spans Wed-Thu instead of Tue-Wed", async () => {
    const shiftedStart = new Date(originDay);
    shiftedStart.setDate(shiftedStart.getDate() + 1);

    await page.reload();
    await expect(page.getByRole("link", { name: new RegExp(clientName) })).toBeVisible();
    const boxAfter = await page.locator("a", { hasText: clientName }).first().boundingBox();
    const originCell = await page.locator(`[data-day-cell="${dateParam(originDay)}"]`).first().boundingBox();
    const shiftedCell = await page.locator(`[data-day-cell="${dateParam(shiftedStart)}"]`).first().boundingBox();
    if (!boxAfter || !originCell || !shiftedCell) throw new Error("banner or day cells not found after reload");
    // The bar now starts at the shifted day's column, not the original one.
    expect(Math.abs(boxAfter.x - shiftedCell.x)).toBeLessThan(5);
    expect(Math.abs(boxAfter.x - originCell.x)).toBeGreaterThan(5);
  });
});
