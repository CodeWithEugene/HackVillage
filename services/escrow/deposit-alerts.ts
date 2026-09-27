import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html } from "@/lib/notifications/html";
import { appUrl } from "@/lib/url";

/**
 * Ops alert templates for the escrow service. Kept out of the shared
 * lib/notifications/templates tree so the money-path services own their
 * alerting surface end-to-end (ADR-001 service boundary).
 */

/** Deposit landed on an already-LOCKED vault — manual Paystack refund. */
export function overpaymentAdminEmail(input: {
  eventSlug: string;
  eventTitle: string;
  reference: string;
  grossAmountKes: number;
  poolAmountKes: number;
  organizerEmail: string;
}): EmailTemplate {
  return {
    subject: `Overpayment On Locked Vault: ${input.eventTitle}`,
    html: renderEmail({
      preheader: "A deposit succeeded after the vault was already funded.",
      section: {
        heading: "Deposit Overpayment",
        bodyHtml: html`<p style="margin:0;">A second deposit for <strong>${input.eventTitle}</strong> succeeded after the prize vault was already LOCKED. The deposit is recorded SUCCEEDED (the money is real), but the vault was NOT double-locked. <strong>Remediation: refund the excess deposit manually in the Paystack dashboard.</strong></p>`,
        details: [
          { label: "Hackathon", value: input.eventSlug },
          { label: "Deposit reference", value: input.reference },
          { label: "Gross amount", value: `KES ${input.grossAmountKes.toLocaleString("en-KE")}` },
          { label: "Pool portion", value: `KES ${input.poolAmountKes.toLocaleString("en-KE")}` },
          { label: "Organizer", value: input.organizerEmail },
        ],
        ctaUrl: appUrl("/admin/payments"),
        ctaLabel: "Open The Admin Queue",
      },
    }),
    text: renderText([
      `Overpayment on ${input.eventTitle} (${input.eventSlug}).`,
      `Deposit ${input.reference} succeeded after the vault was already LOCKED.`,
      `Gross KES ${input.grossAmountKes}, pool KES ${input.poolAmountKes}. Organizer: ${input.organizerEmail}.`,
      `Refund the excess deposit manually in Paystack.`,
      appUrl("/admin/payments"),
    ]),
  };
}
