import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/ports/mail";
import type { EmailTemplate } from "@/lib/notifications/layout";

/** Ops alerts (payout stuck, ledger findings, disputes) reach every admin. */
export async function alertAdmins(template: EmailTemplate): Promise<void> {
  const admins = await prisma.roleGrant.findMany({
    where: { role: "ADMIN" },
    select: { user: { select: { email: true } } },
  });
  for (const admin of admins) {
    await sendMail({ to: admin.user.email, ...template }).catch((error: unknown) =>
      console.error("[admin-alert] send failed", error)
    );
  }
}
