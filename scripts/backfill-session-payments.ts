/**
 * One-off backfill: SessionPayment revenue recognition just replaced the old
 * Session.paymentStatus-only model. Any session that was already marked PAID
 * needs a matching SessionPayment row, or its revenue silently disappears
 * from every compensation calculation (gather.ts now sums SessionPayment,
 * not Session.paymentStatus). Dated at the session's own startsAt as the
 * best available estimate of when payment happened, since no history exists.
 *   npx tsx scripts/backfill-session-payments.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const paidSessions = await prisma.session.findMany({
    where: { paymentStatus: "PAID", payments: { none: {} } },
  });

  console.log(`Backfilling ${paidSessions.length} PAID session(s) with no payment record yet.`);

  for (const session of paidSessions) {
    await prisma.sessionPayment.create({
      data: {
        sessionId: session.id,
        amount: session.amount,
        amountBase: session.amountBase ?? session.amount,
        paidAt: session.startsAt,
        notes: "Backfilled from pre-existing PAID status.",
      },
    });
    console.log(`  ${session.id}: $${session.amount} dated ${session.startsAt.toISOString().slice(0, 10)}`);
  }

  console.log("Backfill complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
