import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html } from "@/lib/notifications/html";

export function legacyCheckinReminderEmail(eventTitle: string, url: string): EmailTemplate {
  return {
    subject: `What Happened To Your ${eventTitle} Project?`,
    html: renderEmail({
      preheader: "One tap updates your portfolio.",
      section: {
        heading: "Tell Us What Happened",
        bodyHtml: html`<p style="margin:0;">Three months ago you built something at <strong>${eventTitle}</strong>. Did it become a product?</p>
          <p style="margin:12px 0 0;">One tap updates your portfolio: still a demo, in production, pivoted, or set aside. Your project's real trajectory is part of your Proof of Work record.</p>`,
        ctaUrl: url,
        ctaLabel: "Record What Happened",
      },
    }),
    text: renderText([
      `Three months ago you built something at ${eventTitle}. Did it become a product?`,
      "One tap updates your portfolio.",
      url,
    ]),
  };
}

export function legacyUnresponsiveEmail(eventTitle: string, url: string): EmailTemplate {
  return {
    subject: `Last Chance To Update Your ${eventTitle} Portfolio Entry`,
    html: renderEmail({
      preheader: "We are marking this project unresponsive.",
      section: {
        heading: "Final Reminder",
        bodyHtml: html`<p style="margin:0;">We did not hear back about your project from <strong>${eventTitle}</strong>, so it is now marked unresponsive on your portfolio. You can still update it anytime.</p>`,
        ctaUrl: url,
        ctaLabel: "Update Your Portfolio",
      },
    }),
    text: renderText([`Your project from ${eventTitle} is now marked unresponsive on your portfolio. You can still update it anytime.`, url]),
  };
}

export function milestoneReminderEmail(eventTitle: string, overdueDays: number, url: string): EmailTemplate {
  return {
    subject: `Milestone Pending For ${eventTitle}`,
    html: renderEmail({
      preheader: "A winner is waiting on your confirmation.",
      section: {
        heading: "Milestone Confirmation Pending",
        bodyHtml: html`<p style="margin:0;">The final half of a prize for <strong>${eventTitle}</strong> is waiting on your milestone confirmation, now ${overdueDays} day${overdueDays === 1 ? "" : "s"} past due.</p>
          <p style="margin:12px 0 0;">Confirm the handover from your winners console once it is delivered.</p>`,
        ctaUrl: url,
        ctaLabel: "Go To Your Winners Console",
      },
    }),
    text: renderText([
      `The final half of a prize for ${eventTitle} is waiting on your milestone confirmation, ${overdueDays} days past due.`,
      url,
    ]),
  };
}
