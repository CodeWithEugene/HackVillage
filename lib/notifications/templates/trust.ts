import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";

export function mediaPenaltyEmail(eventTitle: string, orgName: string, url: string): EmailTemplate {
  return {
    subject: `Trust Penalty: Media Deadline Missed For ${eventTitle}`,
    html: renderEmail({
      preheader: "Your hackathon missed its media deadline.",
      section: {
        heading: "Trust Penalty Applied",
        bodyHtml: `<p style="margin:0;">Your hackathon <strong>${eventTitle}</strong> passed its forty eight hour media deadline with no approved gallery.</p>
          <p style="margin:12px 0 0;">A ten point trust penalty was applied to <strong>${orgName}</strong>. Upload and approve a gallery, and you can appeal from your organizer page.</p>`,
        ctaUrl: url,
        ctaLabel: "Go To Your Organizer Page",
      },
    }),
    text: renderText([
      `Your hackathon ${eventTitle} passed its forty eight hour media deadline with no approved gallery.`,
      `A ten point trust penalty was applied to ${orgName}.`,
      url,
    ]),
  };
}

export function mediaAppealGrantedEmail(orgName: string, note: string): EmailTemplate {
  return {
    subject: `Your Media Penalty Appeal Was Granted`,
    html: renderEmail({
      preheader: "Your trust score was restored.",
      section: {
        heading: "Appeal Granted",
        bodyHtml: `<p style="margin:0;">The media penalty appeal for <strong>${orgName}</strong> was granted. Ten points were restored to your trust score.</p>
          <p style="margin:12px 0 0;">Note from our team: ${note}</p>`,
      },
    }),
    text: renderText([`The media penalty appeal for ${orgName} was granted. Ten points were restored.`, `Note: ${note}`]),
  };
}

export function manualTrustAdjustmentEmail(orgName: string, delta: number, reason: string): EmailTemplate {
  const direction = delta >= 0 ? "added to" : "removed from";
  return {
    subject: `Your Trust Score Was Adjusted`,
    html: renderEmail({
      preheader: "Our team made a manual trust adjustment.",
      section: {
        heading: "Trust Score Adjusted",
        bodyHtml: `<p style="margin:0;">${Math.abs(delta)} points were ${direction} the trust score for <strong>${orgName}</strong>.</p>
          <p style="margin:12px 0 0;">Reason given: ${reason}</p>`,
      },
    }),
    text: renderText([`${Math.abs(delta)} points were ${direction} the trust score for ${orgName}.`, `Reason given: ${reason}`]),
  };
}
