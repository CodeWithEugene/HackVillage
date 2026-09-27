/**
 * Newsletter email templates: the welcome email sent the moment someone
 * subscribes, and the reusable blast template for one-off campaign sends
 * (see scripts/send-newsletter-blast.ts). Both carry a real unsubscribe
 * link, since this is public marketing mail, not the security/money
 * critical mail in lib/auth/mail-templates.ts.
 */
import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html, trustedHtml } from "@/lib/notifications/html";

export type { EmailTemplate };

export function newsletterWelcomeEmail(): EmailTemplate {
  return {
    subject: "You're On The List",
    html: renderEmail({
      preheader: "Thanks for subscribing to the HackVillage newsletter.",
      section: {
        heading: "Welcome To HackVillage",
        bodyHtml: html`<p style="margin:0;">You're subscribed. We'll send you new Prize Verified hackathons, product updates, and the occasional story from a winner, straight to this inbox.</p>
          <p style="margin:12px 0 0;">No spam, and you can unsubscribe anytime from the link at the bottom of every email.</p>`,
        ctaUrl: "https://www.hackvillage.xyz/hackathons",
        ctaLabel: "Browse Open Hackathons",
      },
    }),
    text: renderText([
      "You're subscribed to the HackVillage newsletter.",
      "We'll send you new Prize Verified hackathons, product updates, and the occasional story from a winner.",
      "Browse open hackathons: https://www.hackvillage.xyz/hackathons",
    ]),
  };
}

/**
 * Sent when someone re-subscribes an address that had unsubscribed: the list
 * stays opted out until the inbox owner clicks the confirm link (a forwarded
 * signup form can't silently re-add them).
 */
export function newsletterResubscribeConfirmEmail(confirmUrl: string): EmailTemplate {
  return {
    subject: "Confirm You Want Back On The List",
    html: renderEmail({
      preheader: "You (or someone with your address) asked to re-subscribe.",
      section: {
        heading: "Confirm Your Re-Subscription",
        bodyHtml: html`<p style="margin:0;">We got a new subscription request for this address, but it had unsubscribed before. If that was you, confirm below and you're back on the list. If it wasn't, ignore this email — you'll stay unsubscribed.</p>`,
        ctaUrl: confirmUrl,
        ctaLabel: "Yes, Re-Subscribe Me",
      },
    }),
    text: renderText([
      "We got a new subscription request for this address, but it had unsubscribed before.",
      `Confirm here to re-subscribe: ${confirmUrl}`,
      "If it wasn't you, ignore this email — you'll stay unsubscribed.",
    ]),
  };
}

export interface NewsletterBlastInput {
  subject: string;
  heading: string;
  bodyHtml: string;
  bodyText: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

/** The template a maintainer fills in to send a one-off newsletter blast. */
export function newsletterBlastEmail(input: NewsletterBlastInput): EmailTemplate {
  return {
    subject: input.subject,
    html: renderEmail({
      preheader: input.bodyText.slice(0, 140),
      section: {
        heading: input.heading,
        // Written by a maintainer for a one-off blast, never by users.
        bodyHtml: trustedHtml(input.bodyHtml),
        ctaUrl: input.ctaUrl,
        ctaLabel: input.ctaLabel,
      },
    }),
    text: renderText([input.bodyText]),
  };
}
