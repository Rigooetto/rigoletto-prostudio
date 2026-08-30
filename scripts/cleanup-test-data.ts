/**
 * One-off cleanup: removes throwaway data created by automated test runs
 * during development, leaving only real studio data. Run once via:
 *   npx tsx scripts/cleanup-test-data.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const EXACT_TEST_CLIENT_NAMES = ["La Maria", "Finance Test Client", "Audit Test Client"];
const TEST_CLIENT_PREFIXES = [
  "Regression Lead ",
  "Smoke Test Client ",
  "QuickCreate Client ",
  "Multiday Client ",
  "Acquisition Test Client ",
  "Delete Test Client ",
  "Paid Delete Test Client ",
  "Cascade Client ",
  "SplitPay Client ",
  "ProjDelete Test ",
  "ProjDelete Progress ",
  "EngSync Client ",
  "AdminDelete Client ",
  "AdminTrackCount Client ",
  "AutoProj Client ",
  "RateHistory Client ",
  "QuickBook Client ",
  "Drag Test Client A ",
  "Drag Test Client B ",
];

const EXACT_TEST_LEAD_NAMES = ["Maria Lopez"];
const TEST_LEAD_PREFIXES = ["Regression Lead "];

const TEST_VENDOR_PREFIXES = ["Regression Vendor"];

async function main() {
  const clients = await prisma.client.findMany({ select: { id: true, displayName: true } });
  const testClientIds = clients
    .filter(
      (c) =>
        EXACT_TEST_CLIENT_NAMES.includes(c.displayName) ||
        TEST_CLIENT_PREFIXES.some((p) => c.displayName.startsWith(p))
    )
    .map((c) => c.id);

  const leads = await prisma.lead.findMany({ select: { id: true, name: true } });
  const testLeadIds = leads
    .filter((l) => EXACT_TEST_LEAD_NAMES.includes(l.name) || TEST_LEAD_PREFIXES.some((p) => l.name.startsWith(p)))
    .map((l) => l.id);

  const expenses = await prisma.expense.findMany({ select: { id: true, vendor: true } });
  const testExpenseIds = expenses
    .filter((e) => TEST_VENDOR_PREFIXES.some((p) => e.vendor.startsWith(p)))
    .map((e) => e.id);

  console.log(`Test clients: ${testClientIds.length} / ${clients.length} total`);
  console.log(`Test leads: ${testLeadIds.length} / ${leads.length} total`);
  console.log(`Test expenses: ${testExpenseIds.length} / ${expenses.length} total`);

  await prisma.$transaction([
    // Tasks referencing test leads/clients (Task -> Lead/Client FK, must go first).
    prisma.task.deleteMany({
      where: { OR: [{ relatedLeadId: { in: testLeadIds } }, { relatedClientId: { in: testClientIds } }] },
    }),
    // Quotes referencing test leads/clients (Quote -> Lead/Client FK, must go first).
    prisma.quote.deleteMany({
      where: { OR: [{ leadId: { in: testLeadIds } }, { clientId: { in: testClientIds } }] },
    }),
    // Sessions belonging to test clients (SessionEngineer cascades automatically).
    prisma.session.deleteMany({ where: { clientId: { in: testClientIds } } }),
    // Invoices belonging to test clients (Payments cascade automatically).
    prisma.invoice.deleteMany({ where: { clientId: { in: testClientIds } } }),
    // Projects belonging to test clients (ProjectTrack cascades automatically).
    prisma.project.deleteMany({ where: { clientId: { in: testClientIds } } }),
    // Leads themselves.
    prisma.lead.deleteMany({ where: { id: { in: testLeadIds } } }),
    // Clients themselves (Artist rows cascade automatically).
    prisma.client.deleteMany({ where: { id: { in: testClientIds } } }),
    // Expenses are a leaf table — nothing references them.
    prisma.expense.deleteMany({ where: { id: { in: testExpenseIds } } }),
  ]);

  console.log("Cleanup complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
