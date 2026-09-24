import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";

export function payoutMethodSavedEmail(): EmailTemplate {
  return {
    subject: "Your Payout Method Is Saved",
    html: renderEmail({
      preheader: "You are ready to get paid.",
      section: {
        heading: "Payout Method Saved",
        bodyHtml: `<p style="margin:0;">Your payout method is saved. Whenever you win a prize, it will be sent here automatically.</p>`,
      },
    }),
    text: renderText(["Your payout method is saved. Whenever you win a prize, it will be sent here automatically."]),
  };
}

export function instantPayoutPaidEmail(eventTitle: string, amountKes: number, url: string): EmailTemplate {
  return {
    subject: "Your Instant Payout Has Arrived",
    html: renderEmail({
      preheader: "Half your prize just landed.",
      section: {
        heading: "Payout Sent",
        bodyHtml: `<p style="margin:0;">Your instant payout for <strong>${eventTitle}</strong> has been sent.</p>`,
        details: [{ label: "Amount", value: `KES ${amountKes.toLocaleString("en-KE")}` }],
        ctaUrl: url,
        ctaLabel: "View The Ledger",
      },
    }),
    text: renderText([`Your instant payout for ${eventTitle} has been sent.`, `Amount KES ${amountKes.toLocaleString("en-KE")}.`, url]),
  };
}

export function milestonePayoutPaidEmail(eventTitle: string, amountKes: number, url: string): EmailTemplate {
  return {
    subject: "Your Milestone Payout Has Arrived",
    html: renderEmail({
      preheader: "The final half of your prize just landed.",
      section: {
        heading: "Final Payout Sent",
        bodyHtml: `<p style="margin:0;">Your milestone payout for <strong>${eventTitle}</strong> has been sent. That completes your prize.</p>`,
        details: [{ label: "Amount", value: `KES ${amountKes.toLocaleString("en-KE")}` }],
        ctaUrl: url,
        ctaLabel: "View The Ledger",
      },
    }),
    text: renderText([`Your milestone payout for ${eventTitle} has been sent.`, `Amount KES ${amountKes.toLocaleString("en-KE")}.`, url]),
  };
}

export function milestoneConfirmedEmail(eventTitle: string, url: string): EmailTemplate {
  return {
    subject: "Your Milestone Was Confirmed",
    html: renderEmail({
      preheader: "Your final payout is queued.",
      section: {
        heading: "Milestone Confirmed",
        bodyHtml: `<p style="margin:0;">Your milestone for <strong>${eventTitle}</strong> was confirmed. The final half of your prize is now queued for payout.</p>`,
        ctaUrl: url,
        ctaLabel: "View Your Prize",
      },
    }),
    text: renderText([`Your milestone for ${eventTitle} was confirmed. The final payout is queued.`, url]),
  };
}

export function payoutManuallyPaidEmail(eventTitle: string, amountKes: number): EmailTemplate {
  return {
    subject: "Your Payout Was Completed",
    html: renderEmail({
      preheader: "Our team confirmed your payment by hand.",
      section: {
        heading: "Payout Completed",
        bodyHtml: `<p style="margin:0;">Your payout for <strong>${eventTitle}</strong> was completed by our team after a manual check.</p>`,
        details: [{ label: "Amount", value: `KES ${amountKes.toLocaleString("en-KE")}` }],
      },
    }),
    text: renderText([`Your payout for ${eventTitle} was completed by our team.`, `Amount KES ${amountKes.toLocaleString("en-KE")}.`]),
  };
}

export function payoutManualReviewAdminEmail(payoutId: string, eventTitle: string, attemptCount: number, url: string): EmailTemplate {
  return {
    subject: `Payout Needs Manual Review: ${eventTitle}`,
    html: renderEmail({
      preheader: "A payout could not complete automatically.",
      section: {
        heading: "Payout Needs Review",
        bodyHtml: `<p style="margin:0;">A payout for <strong>${eventTitle}</strong> failed after ${attemptCount} attempts and now needs manual review.</p>`,
        details: [{ label: "Payout ID", value: payoutId }],
        ctaUrl: url,
        ctaLabel: "Open The Admin Queue",
      },
    }),
    text: renderText([`A payout for ${eventTitle} failed after ${attemptCount} attempts and needs manual review.`, `Payout ID ${payoutId}.`, url]),
  };
}

export function transferReversedAdminEmail(eventTitle: string, reference: string, url: string): EmailTemplate {
  return {
    subject: `Transfer Reversed: ${eventTitle}`,
    html: renderEmail({
      preheader: "A payout provider reversed a transfer.",
      section: {
        heading: "Transfer Reversed",
        bodyHtml: `<p style="margin:0;">Paystack reversed a transfer for <strong>${eventTitle}</strong>. This needs a look before the winner is told anything.</p>`,
        details: [{ label: "Reference", value: reference }],
        ctaUrl: url,
        ctaLabel: "Open The Admin Queue",
      },
    }),
    text: renderText([`Paystack reversed a transfer for ${eventTitle}.`, `Reference ${reference}.`, url]),
  };
}
