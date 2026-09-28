import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html, trustedHtml } from "@/lib/notifications/html";

export function ledgerReconciliationDigestEmail(
  findingCount: number,
  checkedEvents: number,
  findings: { kind: string; detail: string }[],
  url: string
): EmailTemplate {
  // Each row is built with the html`` tag (kind/detail escaped), then joined
  // and re-wrapped — interpolating a plain joined string would escape the
  // tags and render "<li>" literally in the email.
  const rows = trustedHtml(
    findings
      .slice(0, 10)
      .map((f) => html`<li style="margin:0 0 6px;text-align:left;">${f.kind}: ${f.detail}</li>`.value)
      .join("")
  );
  return {
    subject: `Ledger Reconciliation Found ${findingCount} Issue${findingCount === 1 ? "" : "s"}`,
    html: renderEmail({
      preheader: "The nightly reconciliation sweep needs a look.",
      section: {
        heading: "Reconciliation Findings",
        bodyHtml: html`<p style="margin:0;">Last night's ledger reconciliation checked ${checkedEvents} hackathons and found ${findingCount} issue${findingCount === 1 ? "" : "s"}.</p>
          <ul style="margin:12px 0 0;padding-left:20px;text-align:left;">${rows}</ul>`,
        ctaUrl: url,
        ctaLabel: "Open Payment Ops",
      },
    }),
    text: renderText([
      `Last night's ledger reconciliation checked ${checkedEvents} hackathons and found ${findingCount} issues.`,
      ...findings.map((f) => `${f.kind}: ${f.detail}`),
      url,
    ]),
  };
}

export function disputeOpenedAdminEmail(eventTitle: string, claim: string, url: string): EmailTemplate {
  return {
    subject: `A Dispute Was Opened On ${eventTitle}`,
    html: renderEmail({
      preheader: "A winner is disputing their milestone.",
      section: {
        heading: "Dispute Opened",
        bodyHtml: html`<p style="margin:0;">A dispute was opened on a payout for <strong>${eventTitle}</strong>.</p>
          <p style="margin:12px 0 0;">Claim: ${claim}</p>`,
        ctaUrl: url,
        ctaLabel: "Review The Dispute",
      },
    }),
    text: renderText([`A dispute was opened on a payout for ${eventTitle}.`, `Claim: ${claim}`, url]),
  };
}

export function disputeOpenedOrganizerEmail(eventTitle: string): EmailTemplate {
  return {
    subject: `A Dispute Was Opened On ${eventTitle}`,
    html: renderEmail({
      preheader: "A winner is disputing their milestone.",
      section: {
        heading: "Dispute Opened",
        bodyHtml: html`<p style="margin:0;">A winner opened a dispute on their milestone for <strong>${eventTitle}</strong>. Our team is reviewing it and will keep you posted.</p>`,
      },
    }),
    text: renderText([`A winner opened a dispute on their milestone for ${eventTitle}. Our team is reviewing it.`]),
  };
}

export function disputeRefundedEmail(eventTitle: string, note: string): EmailTemplate {
  return {
    subject: `Your Dispute On ${eventTitle} Was Resolved With A Refund`,
    html: renderEmail({
      preheader: "The prize pool goes back to the organizer.",
      section: {
        heading: "Dispute Resolved: Refund",
        bodyHtml: html`<p style="margin:0;">Your dispute on <strong>${eventTitle}</strong> was upheld. The remaining prize pool is refunded to the organizer. No milestone payout will be made.</p>
          <p style="margin:12px 0 0;">Note from our team: ${note}</p>`,
      },
    }),
    text: renderText([
      `Your dispute on ${eventTitle} was upheld and the remaining pool was refunded to the organizer.`,
      `Note from our team: ${note}`,
    ]),
  };
}

export function disputeResolvedEmail(eventTitle: string, released: boolean, note: string): EmailTemplate {
  return {
    subject: `Your Dispute On ${eventTitle} Was Resolved`,
    html: renderEmail({
      preheader: released ? "Your funds were released." : "Your dispute was not upheld.",
      section: {
        heading: "Dispute Resolved",
        bodyHtml: html`<p style="margin:0;">Your dispute on <strong>${eventTitle}</strong> was resolved. ${
          released
            ? "Your milestone payout has been released."
            : "Your milestone payout was not released this time."
        }</p>
          <p style="margin:12px 0 0;">Note from our team: ${note}</p>`,
      },
    }),
    text: renderText([
      `Your dispute on ${eventTitle} was resolved.`,
      released ? "Your milestone payout has been released." : "Your milestone payout was not released this time.",
      `Note from our team: ${note}`,
    ]),
  };
}
