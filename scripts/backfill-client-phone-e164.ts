/**
 * One-off backfill: populates Client.phoneE164 for every existing client
 * that predates the column. Without this, the WhatsApp webhook can't match
 * an inbound message to a client until they're individually re-saved via
 * the Edit Client form. Run once via:
 *   npx tsx scripts/backfill-client-phone-e164.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeClientPhoneE164 } from "../src/lib/phone";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const clients = await prisma.client.findMany({
    where: { phone: { not: null }, phoneE164: null },
    select: { id: true, phone: true },
  });

  console.log(`${clients.length} client(s) with a phone number but no phoneE164 yet.`);

  let updated = 0;
  let unmatched = 0;

  for (const client of clients) {
    const phoneE164 = computeClientPhoneE164(client.phone);
    if (!phoneE164) {
      unmatched++;
      continue;
    }
    await prisma.client.update({ where: { id: client.id }, data: { phoneE164 } });
    updated++;
  }

  console.log(`Backfilled ${updated}. ${unmatched} left unmatched (phone isn't a valid, parseable number).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
