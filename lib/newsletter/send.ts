import { sendMail } from "@/lib/ports/mail";
import { appUrl } from "@/lib/url";
import { createNewsletterUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";
import { UNSUBSCRIBE_MARKER, type EmailTemplate } from "@/lib/notifications/layout";

const MUTED = "#6b6b6b";
const INK = "#000092";

/**
 * Every newsletter email (welcome or blast) goes through this instead of
 * sendMail() directly: it fills the template's unsubscribe slot with a real,
 * subscriber-specific link and adds the RFC 8058 List-Unsubscribe header so
 * Gmail/Yahoo show their own one click control too.
 */
export async function sendNewsletterMail(input: {
  to: string;
  subscriberId: string;
  template: EmailTemplate;
}): Promise<{ delivered: boolean }> {
  const token = createNewsletterUnsubscribeToken(input.subscriberId);
  const unsubscribeUrl = appUrl(`/api/newsletter/unsubscribe?token=${token}`);
  const humanUrl = appUrl(`/newsletter/unsubscribe?token=${token}`);

  const html = input.template.html.replace(
    UNSUBSCRIBE_MARKER,
    `<p style="margin:12px 0 0;color:${MUTED};font-size:12px;">
      You are getting this because you subscribed to the HackVillage newsletter.
      <a href="${humanUrl}" style="color:${INK};">Unsubscribe</a>.
    </p>`
  );
  const text = `${input.template.text}\n\nUnsubscribe: ${humanUrl}`;

  return sendMail({
    to: input.to,
    ...input.template,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
