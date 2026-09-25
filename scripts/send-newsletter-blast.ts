/**
 * Send a one-off newsletter blast to every active subscriber, using the
 * shared newsletterBlastEmail template (lib/newsletter/mail-templates.ts).
 * Sends one at a time with a short delay between each, since lib/ports/mail
 * calls Brevo's transactional API directly with no batching of its own.
 *
 *   npm run newsletter:send -- \
 *     --subject "New hackathons just dropped" \
 *     --heading "Three New Prize Verified Events" \
 *     --body "Fintech for Matatu Culture just opened, with a KES 250,000 pool." \
 *     --cta-label "Browse Events" \
 *     --cta-url "https://www.hackvillage.xyz/events"
 *
 * Omit --cta-url/--cta-label to send a text-only update with no button.
 * Add --dry-run to print recipients and the rendered subject without
 * sending anything.
 */
import { prisma } from "@/lib/db";
import { newsletterBlastEmail } from "@/lib/newsletter/mail-templates";
import { sendNewsletterMail } from "@/lib/newsletter/send";

const DELAY_BETWEEN_SENDS_MS = 350;

function readArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const subject = readArg("subject");
  const heading = readArg("heading");
  const body = readArg("body");
  const ctaUrl = readArg("cta-url");
  const ctaLabel = readArg("cta-label");
  const dryRun = process.argv.includes("--dry-run");

  if (!subject || !heading || !body) {
    console.error("Usage: npm run newsletter:send -- --subject \"...\" --heading \"...\" --body \"...\" [--cta-label \"...\" --cta-url \"...\"] [--dry-run]");
    process.exit(1);
  }

  const template = newsletterBlastEmail({
    subject,
    heading,
    bodyHtml: `<p style="margin:0;">${body}</p>`,
    bodyText: body,
    ctaUrl,
    ctaLabel,
  });

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { unsubscribedAt: null },
    select: { id: true, email: true },
    orderBy: { subscribedAt: "asc" },
  });

  console.log(`[newsletter] "${subject}" -> ${subscribers.length} subscriber(s)`);

  if (dryRun) {
    for (const subscriber of subscribers) console.log(`  would send to ${subscriber.email}`);
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const subscriber of subscribers) {
    const result = await sendNewsletterMail({
      to: subscriber.email,
      subscriberId: subscriber.id,
      template,
    });
    if (result.delivered) sent += 1;
    else failed += 1;
    await sleep(DELAY_BETWEEN_SENDS_MS);
  }

  console.log(`[newsletter] done: ${sent} sent, ${failed} not delivered`);
}

main()
  .catch((error: unknown) => {
    console.error("[newsletter] blast failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
