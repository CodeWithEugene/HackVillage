import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  confirmNewsletterResubscribeAction,
  newsletterUnsubscribeAction,
  subscribeAction,
} from "@/lib/newsletter/actions";
import {
  createNewsletterResubscribeToken,
  createNewsletterUnsubscribeToken,
} from "@/lib/newsletter/unsubscribe-token";

/**
 * The newsletter opt-out/resubscribe flow end to end: unsubscribe always
 * works with a valid token; a re-subscribe attempt on an unsubscribed
 * address does NOT silently re-add them — only the confirm link clears the
 * opt-out. (BREVO_API_KEY is empty in test env, so the mail port no-ops.)
 */
const TEST_KEY = `nl-${Date.now().toString(36)}@hackvillage.test`;

function formDataWith(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

afterAll(async () => {
  await prisma.newsletterSubscriber.deleteMany({ where: { email: TEST_KEY } });
  await prisma.$disconnect();
});

describe("newsletter subscribe → unsubscribe → resubscribe flow", () => {
  it("runs the whole lifecycle with the right gates", async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

    // 1. Subscribe — generic success, row created.
    const subscribed = await subscribeAction({}, formDataWith({ email: TEST_KEY }));
    expect(subscribed.message).toBeTruthy();
    let row = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: TEST_KEY } });
    expect(row.unsubscribedAt).toBeNull();

    // 2. A bogus unsubscribe token changes nothing.
    const bogus = await newsletterUnsubscribeAction({}, formDataWith({ token: "bogus" }));
    expect(bogus.error).toBeTruthy();
    row = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: TEST_KEY } });
    expect(row.unsubscribedAt).toBeNull();

    // 3. A real token unsubscribes.
    const unsubToken = createNewsletterUnsubscribeToken(row.id);
    const unsubscribed = await newsletterUnsubscribeAction({}, formDataWith({ token: unsubToken }));
    expect(unsubscribed.done).toBe(true);
    row = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: TEST_KEY } });
    expect(row.unsubscribedAt).not.toBeNull();

    // 4. Re-subscribing an unsubscribed address does NOT clear the opt-out.
    const resub = await subscribeAction({}, formDataWith({ email: TEST_KEY }));
    expect(resub.message).toBeTruthy(); // same generic message — no signal
    row = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: TEST_KEY } });
    expect(row.unsubscribedAt).not.toBeNull();

    // 5. The unsubscribe token must NOT work as a resubscribe confirm.
    const wrongPurpose = await confirmNewsletterResubscribeAction(
      {},
      formDataWith({ token: unsubToken })
    );
    expect(wrongPurpose.error).toBeTruthy();
    row = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: TEST_KEY } });
    expect(row.unsubscribedAt).not.toBeNull();

    // 6. Only the purpose-bound confirm token re-opts them in.
    const confirmToken = createNewsletterResubscribeToken(row.id);
    const confirmed = await confirmNewsletterResubscribeAction(
      {},
      formDataWith({ token: confirmToken })
    );
    expect(confirmed.done).toBe(true);
    row = await prisma.newsletterSubscriber.findUniqueOrThrow({ where: { email: TEST_KEY } });
    expect(row.unsubscribedAt).toBeNull();
  });

  it("the honeypot silently succeeds without creating rows", async () => {
    const result = await subscribeAction(
      {},
      formDataWith({ email: `hp-${TEST_KEY}`, company: "spammy-bot" })
    );
    expect(result.message).toBeTruthy();
    expect(
      await prisma.newsletterSubscriber.findUnique({ where: { email: `hp-${TEST_KEY}` } })
    ).toBeNull();
  });

  it("bad email input is rejected with a form error", async () => {
    const result = await subscribeAction({}, formDataWith({ email: "not-an-email" }));
    expect(result.error).toBeTruthy();
  });
});
