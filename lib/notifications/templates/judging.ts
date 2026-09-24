import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";

export function judgeInvitedEmail(eventTitle: string, url: string): EmailTemplate {
  return {
    subject: `Judge ${eventTitle} On HackVillage`,
    html: renderEmail({
      preheader: "You are invited to judge.",
      section: {
        heading: "You Are Invited To Judge",
        bodyHtml: `<p style="margin:0;">You are invited to judge <strong>${eventTitle}</strong> on HackVillage. Accept or decline from your dashboard.</p>`,
        ctaUrl: url,
        ctaLabel: "Respond To The Invite",
      },
    }),
    text: renderText([`You are invited to judge ${eventTitle} on HackVillage.`, url]),
  };
}

export function judgeRespondedEmail(judgeName: string, eventTitle: string, accepted: boolean): EmailTemplate {
  return {
    subject: accepted
      ? `${judgeName} Accepted Your Judge Invite`
      : `${judgeName} Declined Your Judge Invite`,
    html: renderEmail({
      preheader: accepted ? "A judge is on board." : "You may want to invite someone else.",
      section: {
        heading: accepted ? "Judge Invite Accepted" : "Judge Invite Declined",
        bodyHtml: `<p style="margin:0;"><strong>${judgeName}</strong> ${accepted ? "accepted" : "declined"} the invite to judge <strong>${eventTitle}</strong>.</p>`,
      },
    }),
    text: renderText([`${judgeName} ${accepted ? "accepted" : "declined"} the invite to judge ${eventTitle}.`]),
  };
}

export function judgingOpenEmail(eventTitle: string, url: string): EmailTemplate {
  return {
    subject: `Judging Is Open For ${eventTitle}`,
    html: renderEmail({
      preheader: "Teams are waiting on your scores.",
      section: {
        heading: "Judging Is Open",
        bodyHtml: `<p style="margin:0;">Judging is now open for <strong>${eventTitle}</strong>. Score each team and leave feedback when you are ready.</p>`,
        ctaUrl: url,
        ctaLabel: "Start Judging",
      },
    }),
    text: renderText([`Judging is now open for ${eventTitle}.`, url]),
  };
}

export function winnerAnnouncedEmail(
  eventTitle: string,
  place: number,
  amountKes: number,
  url: string
): EmailTemplate {
  const placeLabel = place === 1 ? "First Place" : place === 2 ? "Second Place" : `Place ${place}`;
  return {
    subject: `Your Team Won ${placeLabel} In ${eventTitle}`,
    html: renderEmail({
      preheader: "Congratulations, your instant payout is on its way.",
      section: {
        heading: "You Won",
        bodyHtml: `<p style="margin:0;">Your team took <strong>${placeLabel}</strong> in <strong>${eventTitle}</strong>. Half of your prize is on its way now, and the rest follows once your milestone is confirmed.</p>`,
        details: [{ label: "Prize amount", value: `KES ${amountKes.toLocaleString("en-KE")}` }],
        ctaUrl: url,
        ctaLabel: "View Results",
      },
    }),
    text: renderText([
      `Your team took ${placeLabel} in ${eventTitle}.`,
      `Prize amount KES ${amountKes.toLocaleString("en-KE")}.`,
      url,
    ]),
  };
}

export function resultsAnnouncedEmail(eventTitle: string, url: string): EmailTemplate {
  return {
    subject: `Results Are In For ${eventTitle}`,
    html: renderEmail({
      preheader: "See how every team placed.",
      section: {
        heading: "Results Are In",
        bodyHtml: `<p style="margin:0;">Results for <strong>${eventTitle}</strong> are published. Thank you for building with us, and good luck at the next one.</p>`,
        ctaUrl: url,
        ctaLabel: "View Results",
      },
    }),
    text: renderText([`Results for ${eventTitle} are published.`, url]),
  };
}
