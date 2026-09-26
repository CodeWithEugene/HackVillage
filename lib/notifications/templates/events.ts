import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html } from "@/lib/notifications/html";

export function eventPublishedEmail(eventTitle: string, eventUrl: string): EmailTemplate {
  return {
    subject: `${eventTitle} Is Published`,
    html: renderEmail({
      preheader: "Fund the prize pool to take your hackathon live.",
      section: {
        heading: "Hackathon Published",
        bodyHtml: html`<p style="margin:0;"><strong>${eventTitle}</strong> is published and waiting on its prize pool deposit. Fund it to earn the Prize Verified badge and go live.</p>`,
        ctaUrl: eventUrl,
        ctaLabel: "Fund The Prize Pool",
      },
    }),
    text: renderText([`${eventTitle} is published and waiting on its prize pool deposit.`, eventUrl]),
  };
}

export function eventLiveOrganizerEmail(eventTitle: string, eventUrl: string): EmailTemplate {
  return {
    subject: `${eventTitle} Is Prize Verified And Live`,
    html: renderEmail({
      preheader: "Your prize pool is locked in escrow.",
      section: {
        heading: "Your Hackathon Is Live",
        bodyHtml: html`<p style="margin:0;">The full prize pool for <strong>${eventTitle}</strong> is locked in escrow. Your hackathon now carries the Prize Verified badge and is open for registration.</p>`,
        ctaUrl: eventUrl,
        ctaLabel: "View Your Hackathon",
      },
    }),
    text: renderText([`${eventTitle} is Prize Verified and live. The prize pool is locked in escrow.`, eventUrl]),
  };
}

export function eventLiveDeveloperEmail(eventTitle: string, eventUrl: string): EmailTemplate {
  return {
    subject: `${eventTitle} Just Became Prize Verified`,
    html: renderEmail({
      preheader: "The prize money is real and locked in escrow.",
      section: {
        heading: "Prize Pool Locked",
        bodyHtml: html`<p style="margin:0;">A hackathon you registered for, <strong>${eventTitle}</strong>, just had its full prize pool locked in escrow. The money is real before you write a single line of code.</p>`,
        ctaUrl: eventUrl,
        ctaLabel: "View The Hackathon",
      },
    }),
    text: renderText([`${eventTitle} just became Prize Verified. The prize pool is locked in escrow.`, eventUrl]),
  };
}

export function depositFailedEmail(eventTitle: string, eventUrl: string): EmailTemplate {
  return {
    subject: `A Deposit For ${eventTitle} Expired`,
    html: renderEmail({
      preheader: "Your checkout session timed out.",
      section: {
        heading: "Deposit Expired",
        bodyHtml: html`<p style="margin:0;">A pending deposit for <strong>${eventTitle}</strong> was not completed within twenty four hours and has expired. Start a new deposit whenever you are ready.</p>`,
        ctaUrl: eventUrl,
        ctaLabel: "Try Again",
      },
    }),
    text: renderText([`A pending deposit for ${eventTitle} expired after twenty four hours.`, eventUrl]),
  };
}

export function registrationConfirmedEmail(eventTitle: string, eventUrl: string): EmailTemplate {
  return {
    subject: `You Are Registered For ${eventTitle}`,
    html: renderEmail({
      preheader: "See you there.",
      section: {
        heading: "Registration Confirmed",
        bodyHtml: html`<p style="margin:0;">You are registered for <strong>${eventTitle}</strong>. Form or join a team when you are ready.</p>`,
        ctaUrl: eventUrl,
        ctaLabel: "Go To The Hackathon",
      },
    }),
    text: renderText([`You are registered for ${eventTitle}.`, eventUrl]),
  };
}

export function registrationCancelledEmail(eventTitle: string): EmailTemplate {
  return {
    subject: `Your Registration For ${eventTitle} Was Cancelled`,
    html: renderEmail({
      preheader: "You have been removed from the hackathon.",
      section: {
        heading: "Registration Cancelled",
        bodyHtml: html`<p style="margin:0;">Your registration for <strong>${eventTitle}</strong> was cancelled, as you asked. You are welcome to register again anytime before the deadline.</p>`,
      },
    }),
    text: renderText([`Your registration for ${eventTitle} was cancelled.`]),
  };
}

export interface NewHackathonDetails {
  eventTitle: string;
  eventUrl: string;
  /** "KES 300,000" */
  prizePool: string;
  /** "10 to 12 October 2026" */
  dates: string;
  /** "Nairobi" or "Online" */
  venue: string;
  /** "8 October 2026" */
  registrationCloses: string;
}

/**
 * Sent to builders who have hackathon updates on, the moment a hackathon's
 * full prize pool is locked and it goes live. Only real, public hackathons
 * are announced (see lib/events/announce.ts).
 */
export function newPrizeVerifiedHackathonEmail(details: NewHackathonDetails): EmailTemplate {
  return {
    subject: `New Prize Verified Hackathon: ${details.eventTitle}`,
    html: renderEmail({
      preheader: `${details.prizePool} is already locked in escrow. Registration closes ${details.registrationCloses}.`,
      section: {
        heading: "A New Hackathon Is Live",
        bodyHtml: html`<p style="margin:0;"><strong>${details.eventTitle}</strong> just went live on HackVillage with its full prize pool locked in escrow, so the money is real before you write a line of code.</p>`,
        details: [
          { label: "Prize pool", value: details.prizePool },
          { label: "When", value: details.dates },
          { label: "Where", value: details.venue },
          { label: "Registration closes", value: details.registrationCloses },
        ],
        ctaUrl: details.eventUrl,
        ctaLabel: "View The Hackathon",
      },
    }),
    text: renderText([
      `${details.eventTitle} just went live on HackVillage with its full prize pool locked in escrow.`,
      `Prize pool: ${details.prizePool}. When: ${details.dates}. Where: ${details.venue}. Registration closes ${details.registrationCloses}.`,
      details.eventUrl,
    ]),
  };
}
