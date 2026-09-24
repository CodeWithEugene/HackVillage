import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";

export function endorsementReceivedEmail(eventTitle: string, url: string): EmailTemplate {
  return {
    subject: "A Judge Endorsed You",
    html: renderEmail({
      preheader: "Your Proof of Work profile just grew.",
      section: {
        heading: "You Got An Endorsement",
        bodyHtml: `<p style="margin:0;">A judge from <strong>${eventTitle}</strong> endorsed your work. It is now part of your public Proof of Work profile.</p>`,
        ctaUrl: url,
        ctaLabel: "View Your Profile",
      },
    }),
    text: renderText([`A judge from ${eventTitle} endorsed your work.`, url]),
  };
}

export function introductionRequestedEmail(partnerName: string, eventTitle: string, url: string): EmailTemplate {
  return {
    subject: `${partnerName} Wants To Connect With You`,
    html: renderEmail({
      preheader: "A hiring partner noticed your win.",
      section: {
        heading: "A Hiring Partner Wants To Connect",
        bodyHtml: `<p style="margin:0;"><strong>${partnerName}</strong> saw your result at <strong>${eventTitle}</strong> and requested an introduction.</p>`,
        ctaUrl: url,
        ctaLabel: "Respond To The Request",
      },
    }),
    text: renderText([`${partnerName} saw your result at ${eventTitle} and requested an introduction.`, url]),
  };
}

export function introductionAcceptedDeveloperEmail(
  partnerName: string,
  partnerEmail: string,
  eventTitle: string
): EmailTemplate {
  return {
    subject: `You Are Connected With ${partnerName}`,
    html: renderEmail({
      preheader: "Contact details are exchanged.",
      section: {
        heading: "You Are Connected",
        bodyHtml: `<p style="margin:0;">You accepted the introduction from <strong>${partnerName}</strong> for your work at <strong>${eventTitle}</strong>.</p>`,
        details: [{ label: "Their email", value: partnerEmail }],
      },
    }),
    text: renderText([`You accepted the introduction from ${partnerName} for your work at ${eventTitle}.`, `Their email: ${partnerEmail}`]),
  };
}

export function introductionAcceptedPartnerEmail(
  developerName: string,
  developerEmail: string,
  eventTitle: string
): EmailTemplate {
  return {
    subject: `${developerName} Accepted Your Introduction`,
    html: renderEmail({
      preheader: "Contact details are exchanged.",
      section: {
        heading: "Introduction Accepted",
        bodyHtml: `<p style="margin:0;"><strong>${developerName}</strong>, who built something great at <strong>${eventTitle}</strong>, accepted your introduction request.</p>`,
        details: [{ label: "Their email", value: developerEmail }],
      },
    }),
    text: renderText([`${developerName} accepted your introduction request from ${eventTitle}.`, `Their email: ${developerEmail}`]),
  };
}

export function introductionDeclinedPartnerEmail(developerName: string): EmailTemplate {
  return {
    subject: `${developerName} Declined Your Introduction`,
    html: renderEmail({
      preheader: "They are not available right now.",
      section: {
        heading: "Introduction Declined",
        bodyHtml: `<p style="margin:0;"><strong>${developerName}</strong> declined your introduction request this time.</p>`,
      },
    }),
    text: renderText([`${developerName} declined your introduction request this time.`]),
  };
}
