import { prisma } from "@/lib/db";

/**
 * Notifications (Phase 7): in-app rows now; email fan-out rides the same
 * call when a mail message is provided (the notifications job handles
 * batch/deferred sends later per plan §12).
 */
export async function notify(input: {
  userId: string;
  type: string;
  payload?: Record<string, unknown>;
  email?: { to: string; subject: string; text: string; html: string };
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
  if (input.email) {
    const { sendMail } = await import("@/lib/ports/mail");
    await sendMail({
      to: input.email.to,
      subject: input.email.subject,
      text: input.email.text,
      html: input.email.html,
    }).catch((error) => console.error("[notify] email failed", error));
  }
}
