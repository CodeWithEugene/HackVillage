/**
 * Newsletter email templates: the welcome email sent the moment someone
 * subscribes, and the reusable blast template for one-off campaign sends
 * (see scripts/send-newsletter-blast.ts). Both carry a real unsubscribe
 * link, since this is public marketing mail, not the security/money
 * critical mail in lib/auth/mail-templates.ts.
 */
import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";

export type { EmailTemplate };

export function newsletterWelcomeEmail(): EmailTemplate {
  return {
    subject: "You're On The List",
    html: renderEmail({
      preheader: "Thanks for subscribing to the HackVillage newsletter.",
      section: {
        heading: "Welcome To HackVillage",
        bodyHtml: `<p style="margin:0;">You're subscribed. We'll send you new Prize Verified hackathons, product updates, and the occasional story from a winner, straight to this inbox.</p>
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
        bodyHtml: input.bodyHtml,
        ctaUrl: input.ctaUrl,
        ctaLabel: input.ctaLabel,
      },
    }),
    text: renderText([input.bodyText]),
  };
}
