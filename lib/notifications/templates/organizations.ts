import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";

export function orgInviteEmail(orgName: string, url: string): EmailTemplate {
  return {
    subject: `You Are Invited To Join ${orgName} On HackVillage`,
    html: renderEmail({
      preheader: `${orgName} invited you to help run hackathons on HackVillage.`,
      section: {
        heading: "You Are Invited",
        bodyHtml: `<p style="margin:0;"><strong>${orgName}</strong> invited you to join their organization on HackVillage as an organizer. This link expires in seven days.</p>`,
        ctaUrl: url,
        ctaLabel: "Accept Invite",
      },
    }),
    text: renderText([`${orgName} invited you to join their organization on HackVillage.`, url]),
  };
}

export function orgMemberJoinedEmail(memberName: string, orgName: string): EmailTemplate {
  return {
    subject: `${memberName} Joined ${orgName}`,
    html: renderEmail({
      preheader: `${memberName} accepted your invite.`,
      section: {
        heading: "New Team Member",
        bodyHtml: `<p style="margin:0;"><strong>${memberName}</strong> accepted your invite and now has organizer access on <strong>${orgName}</strong>.</p>`,
      },
    }),
    text: renderText([`${memberName} accepted your invite and joined ${orgName}.`]),
  };
}

export function kybSubmittedEmail(orgName: string): EmailTemplate {
  return {
    subject: "Your Verification Request Was Received",
    html: renderEmail({
      preheader: "We are reviewing your organization.",
      section: {
        heading: "Verification In Progress",
        bodyHtml: `<p style="margin:0;">We received your verification request for <strong>${orgName}</strong>. Our team reviews new organizations within 48 hours, and you will get an email the moment a decision is made.</p>`,
      },
    }),
    text: renderText([`We received your verification request for ${orgName}. A decision follows within 48 hours.`]),
  };
}

export function kybApprovedEmail(orgName: string, eventsUrl: string): EmailTemplate {
  return {
    subject: `${orgName} Is Verified On HackVillage`,
    html: renderEmail({
      preheader: "You can now fund and publish hackathons.",
      section: {
        heading: "You Are Verified",
        bodyHtml: `<p style="margin:0;"><strong>${orgName}</strong> passed verification. You can now publish hackathons and fund prize pools.</p>`,
        ctaUrl: eventsUrl,
        ctaLabel: "Go To Your Hackathons",
      },
    }),
    text: renderText([`${orgName} passed verification. You can now publish hackathons and fund prize pools.`, eventsUrl]),
  };
}

export function kybRejectedEmail(orgName: string, reason: string): EmailTemplate {
  return {
    subject: `We Could Not Verify ${orgName}`,
    html: renderEmail({
      preheader: "Your verification request needs another look.",
      section: {
        heading: "Verification Did Not Pass",
        bodyHtml: `<p style="margin:0;">We could not verify <strong>${orgName}</strong> this time.</p>
          <p style="margin:12px 0 0;">Reason given: ${reason}</p>
          <p style="margin:12px 0 0;">Reply to info@hackvillage.xyz if you have questions or want to try again.</p>`,
      },
    }),
    text: renderText([`We could not verify ${orgName}.`, `Reason given: ${reason}`]),
  };
}
