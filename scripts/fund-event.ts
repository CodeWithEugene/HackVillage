/**
 * Dev utility — fund a PENDING_DEPOSIT event through the REAL escrow service
 * path (Paystack port picks simulation mode without keys). Prints the
 * checkout URL; complete it at that URL with the dev server running.
 *
 *   npm run dev:fund -- ai-for-health-records
 */
import { prisma } from "@/lib/db";
import { initiateDeposit } from "@/services/escrow/deposits";

async function main(): Promise<void> {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run dev:fund -- <event-slug>");
    process.exit(1);
  }

  const event = await prisma.event.findFirst({
    where: { slug, status: "PENDING_DEPOSIT" },
    include: { org: { include: { members: { where: { role: "OWNER", status: "ACTIVE" } } } } },
  });
  if (!event || event.org.members.length === 0) {
    console.error(`No pending event "${slug}" with an active owner.`);
    process.exit(1);
  }

  const start = await initiateDeposit(event.id, event.org.members[0].userId);
  console.log(`Deposit initiated: ${start.reference}`);
  console.log(`Gross due includes the 5% platform fee.`);
  console.log(`\nComplete the payment at:\n${start.checkoutUrl}`);
  await prisma.$disconnect();
  // CLI tools exit explicitly — pg-boss's pool keeps the event loop open.
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
