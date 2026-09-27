"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  newsletterResubscribeConfirmEmail,
  newsletterWelcomeEmail,
} from "@/lib/newsletter/mail-templates";
import { sendNewsletterMail } from "@/lib/newsletter/send";
import {
  createNewsletterResubscribeToken,
  verifyNewsletterResubscribeToken,
  verifyNewsletterUnsubscribeToken,
} from "@/lib/newsletter/unsubscribe-token";
import { appUrl } from "@/lib/url";

export interface SubscribeState {
  error?: string;
  message?: string;
}

const subscribeSchema = z.object({
  email: z.string().email("That email doesn't look right."),
});

/**
 * Public newsletter signup — anonymous, no account required. Always returns
 * a generic success message so a failed welcome-email send (provider outage,
 * for example) never blocks the subscription itself, and so the response
 * gives no signal about whether an email was already on the list.
 *
 * Re-subscribing a previously unsubscribed address does NOT clear
 * unsubscribedAt directly: a forwarded form can't silently re-add someone.
 * They get a signed confirmation link instead; only the click re-opts them in.
 */
export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  // Honeypot: real visitors never see or fill this field (see NewsletterForm).
  // Anything in it means a bot filled every input on the page — pretend it
  // worked and do nothing else, no need to even validate the email.
  if (String(formData.get("company") ?? "")) {
    return { message: "subscribed" };
  }

  const parsed = subscribeSchema.safeParse({ email: String(formData.get("email") ?? "") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your email and try again." };
  }

  const email = parsed.data.email.toLowerCase();

  const limit = await rateLimit(`newsletter:${email}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many attempts with that email, try again in a while." };
  }

  // Previously unsubscribed: confirm-instead-of-auto-resubscribe.
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing?.unsubscribedAt) {
    const token = createNewsletterResubscribeToken(existing.id);
    await sendNewsletterMail({
      to: email,
      subscriberId: existing.id,
      template: newsletterResubscribeConfirmEmail(
        appUrl(`/newsletter/resubscribe?token=${token}`)
      ),
    }).catch((error: unknown) =>
      console.error("[newsletter] resubscribe confirm email failed", error)
    );
    return { message: "subscribed" };
  }

  let subscriber: { id: string };
  try {
    subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, source: "landing-cta" },
      update: {},
    });
  } catch (error: unknown) {
    // Nothing was saved, so tell the person to retry rather than claiming
    // they're on the list. Logged with context for ops.
    console.error("[newsletter] subscribe failed", error);
    return { error: "We couldn't add you right now. Please try again in a moment." };
  }

  try {
    await sendNewsletterMail({
      to: email,
      subscriberId: subscriber.id,
      template: newsletterWelcomeEmail(),
    });
  } catch (error: unknown) {
    // The subscription already succeeded; a welcome-email hiccup shouldn't
    // surface as a form error. Logged so it's visible in ops, not silent.
    console.error("[newsletter] welcome email failed", error);
  }

  return { message: "subscribed" };
}

export interface NewsletterUnsubscribeState {
  error?: string;
  done?: boolean;
}

export async function newsletterUnsubscribeAction(
  _prev: NewsletterUnsubscribeState,
  formData: FormData
): Promise<NewsletterUnsubscribeState> {
  const token = String(formData.get("token") ?? "");
  const subscriberId = verifyNewsletterUnsubscribeToken(token);
  if (!subscriberId) return { error: "This unsubscribe link is invalid or has expired." };

  try {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriberId },
      data: { unsubscribedAt: new Date() },
    });
  } catch {
    // Already removed, or the id no longer exists — either way the person
    // is not getting more mail, which is what they asked for.
  }

  return { done: true };
}

/**
 * The click on a re-subscribe confirmation link — the ONLY path that clears
 * unsubscribedAt for a returning address.
 */
export async function confirmNewsletterResubscribeAction(
  _prev: NewsletterUnsubscribeState,
  formData: FormData
): Promise<NewsletterUnsubscribeState> {
  const token = String(formData.get("token") ?? "");
  const subscriberId = verifyNewsletterResubscribeToken(token);
  if (!subscriberId) {
    return { error: "This confirmation link is invalid or has expired. Subscribe again." };
  }

  try {
    await prisma.newsletterSubscriber.update({
      where: { id: subscriberId },
      data: { unsubscribedAt: null },
    });
  } catch {
    return { error: "We couldn't find that subscription. Subscribe again from the site." };
  }

  return { done: true };
}
