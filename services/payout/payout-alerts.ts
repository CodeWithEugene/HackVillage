import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html } from "@/lib/notifications/html";
import { appUrl } from "@/lib/url";

/**
 * Ops alert templates owned by the payout service (ADR-001 service boundary).
 * Kept out of the shared lib/notifications/templates tree so the money-path
 * alerting surface lives with the state machine it protects.
 */

/** transfer.success arrived for a payout already marked REVERSED. */
export function confirmOnReversedAdminEmail(
  eventTitle: string,
  payoutId: string,
  reference: string,
  amountKes: number,
  winnerHandle: string
): EmailTemplate {
  return {
    subject: `Confirm Refused On Reversed Payout: ${eventTitle}`,
    html: renderEmail({
      preheader: "A success signal arrived for a payout Paystack already clawed back.",
      section: {
        heading: "Reversed Payout — Success Refused",
        bodyHtml: html`<p style="margin:0;">A transfer success for <strong>${eventTitle}</strong> arrived AFTER Paystack had reversed the transfer. The payout stays REVERSED — the money was clawed back. Verify the winner's position with them before any retry.</p>`,
        details: [
          { label: "Payout", value: payoutId },
          { label: "Winner", value: `@${winnerHandle}` },
          { label: "Amount", value: `KES ${amountKes.toLocaleString("en-KE")}` },
          { label: "Reference", value: reference },
        ],
        ctaUrl: appUrl("/admin/payments"),
        ctaLabel: "Open The Admin Queue",
      },
    }),
    text: renderText([
      `A success signal arrived for REVERSED payout ${payoutId} (${eventTitle}).`,
      `Winner @${winnerHandle}, KES ${amountKes}, reference ${reference}.`,
      `The payout stays REVERSED — verify manually before any retry.`,
      appUrl("/admin/payments"),
    ]),
  };
}

/** A PROCESSING payout has been unverifiable with the provider for 24h+. */
export function stuckPayoutAdminEmail(input: {
  payoutId: string;
  eventTitle: string;
  reference: string;
  amountKes: number;
  providerStatus: string;
}): EmailTemplate {
  return {
    subject: `Payout Stuck Over 24h: ${input.eventTitle}`,
    html: renderEmail({
      preheader: "A payout has been in flight for over a day without provider truth.",
      section: {
        heading: "Payout Stuck — Manual Check",
        bodyHtml: html`<p style="margin:0;">Payout <strong>${input.payoutId}</strong> for <strong>${input.eventTitle}</strong> has been PROCESSING for over 24 hours and Paystack still reports "${input.providerStatus}". The funds remain locked (fail-closed). Check the transfer in the Paystack dashboard and resolve it by hand.</p>`,
        details: [
          { label: "Payout", value: input.payoutId },
          { label: "Amount", value: `KES ${input.amountKes.toLocaleString("en-KE")}` },
          { label: "Reference", value: input.reference },
          { label: "Provider status", value: input.providerStatus },
        ],
        ctaUrl: appUrl("/admin/payments"),
        ctaLabel: "Open The Admin Queue",
      },
    }),
    text: renderText([
      `Payout ${input.payoutId} (${input.eventTitle}) stuck PROCESSING >24h.`,
      `KES ${input.amountKes}, reference ${input.reference}, provider status "${input.providerStatus}".`,
      `Resolve it manually in the Paystack dashboard.`,
      appUrl("/admin/payments"),
    ]),
  };
}
