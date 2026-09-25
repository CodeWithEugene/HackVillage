import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html } from "@/lib/notifications/html";

export function teamInviteEmail(teamName: string, eventTitle: string, url: string): EmailTemplate {
  return {
    subject: `You Are Invited To Join ${teamName}`,
    html: renderEmail({
      preheader: `Join ${teamName} for ${eventTitle}.`,
      section: {
        heading: "Team Invite",
        bodyHtml: html`<p style="margin:0;">You are invited to join <strong>${teamName}</strong> for <strong>${eventTitle}</strong>.</p>`,
        ctaUrl: url,
        ctaLabel: "View The Invite",
      },
    }),
    text: renderText([`You are invited to join ${teamName} for ${eventTitle}.`, url]),
  };
}

export function teamInviteAcceptedEmail(memberName: string, teamName: string): EmailTemplate {
  return {
    subject: `${memberName} Joined ${teamName}`,
    html: renderEmail({
      preheader: "Your team just grew.",
      section: {
        heading: "New Team Member",
        bodyHtml: html`<p style="margin:0;"><strong>${memberName}</strong> accepted your invite and joined <strong>${teamName}</strong>.</p>`,
      },
    }),
    text: renderText([`${memberName} accepted your invite and joined ${teamName}.`]),
  };
}

export function teamInviteDeclinedEmail(memberName: string, teamName: string): EmailTemplate {
  return {
    subject: `${memberName} Declined Your Invite`,
    html: renderEmail({
      preheader: "They will not be joining this time.",
      section: {
        heading: "Invite Declined",
        bodyHtml: html`<p style="margin:0;"><strong>${memberName}</strong> declined the invite to join <strong>${teamName}</strong>.</p>`,
      },
    }),
    text: renderText([`${memberName} declined the invite to join ${teamName}.`]),
  };
}

export function teamMemberLeftEmail(memberName: string, teamName: string): EmailTemplate {
  return {
    subject: `${memberName} Left ${teamName}`,
    html: renderEmail({
      preheader: "Your roster just changed.",
      section: {
        heading: "Team Member Left",
        bodyHtml: html`<p style="margin:0;"><strong>${memberName}</strong> left <strong>${teamName}</strong>.</p>`,
      },
    }),
    text: renderText([`${memberName} left ${teamName}.`]),
  };
}

export function submissionSavedEmail(teamName: string, eventTitle: string, url: string): EmailTemplate {
  return {
    subject: `Submission Saved For ${eventTitle}`,
    html: renderEmail({
      preheader: "Your team's project was recorded.",
      section: {
        heading: "Submission Saved",
        bodyHtml: html`<p style="margin:0;">The submission for <strong>${teamName}</strong> in <strong>${eventTitle}</strong> was saved. You can keep editing it until judging opens.</p>`,
        ctaUrl: url,
        ctaLabel: "View The Submission",
      },
    }),
    text: renderText([`The submission for ${teamName} in ${eventTitle} was saved.`, url]),
  };
}
