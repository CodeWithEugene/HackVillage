import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/ports/mail";
import { appUrl } from "@/lib/url";
import { createUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { UNSUBSCRIBE_MARKER, type EmailTemplate } from "@/lib/notifications/layout";
import { CATEGORY_LABELS, type NotificationCategory } from "@/lib/notifications/types";

export interface SendNotificationInput {
  userId: string;
  to: string;
  template: EmailTemplate;
  /** Omit for security or money critical mail, which always sends. */
  category?: NotificationCategory;
}

const MUTED = "#6b6b6b";
const INK = "#000092";

/**
 * Every non auth email should go through this instead of sendMail() directly:
 * it skips users who turned the category off, fills in the template's
 * unsubscribe slot with a real link, and adds a one click List-Unsubscribe
 * header (RFC 8058) so Gmail and Yahoo show their own unsubscribe control too.
 */
export async function sendNotification(input: SendNotificationInput): Promise<{ delivered: boolean }> {
  if (input.category) {
    const preference = await prisma.notificationPreference.findUnique({
      where: { userId: input.userId },
    });
    if (preference && preference[input.category] === false) {
      return { delivered: false };
    }
  }

  if (!input.category) {
    return sendMail({
      to: input.to,
      ...input.template,
      html: input.template.html.replace(UNSUBSCRIBE_MARKER, ""),
    });
  }

  const token = createUnsubscribeToken(input.userId, input.category);
  const unsubscribeUrl = appUrl(`/api/unsubscribe?token=${token}`);
  const humanUrl = appUrl(`/unsubscribe?token=${token}`);
  const categoryLabel = CATEGORY_LABELS[input.category].toLowerCase();

  const html = input.template.html.replace(
    UNSUBSCRIBE_MARKER,
    `<p style="margin:12px 0 0;color:${MUTED};font-size:12px;">
      You are getting this because you have ${categoryLabel} turned on.
      <a href="${humanUrl}" style="color:${INK};">Turn these off</a>.
    </p>`
  );
  const text = `${input.template.text}\n\nTurn off ${categoryLabel} emails: ${humanUrl}`;

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
