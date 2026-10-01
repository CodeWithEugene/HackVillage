"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/lib/auth";
import { accountDeactivatedEmail, passwordChangedEmail } from "@/lib/auth/mail-templates";
import { passwordSchema } from "@/lib/auth/password-policy";
import { requireUser } from "@/lib/auth/guards";
import { revokeAllSessions } from "@/lib/auth/session-version";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/ports/mail";
import { rateLimit } from "@/lib/rate-limit";

export interface AccountActionState {
  error?: string;
  message?: string;
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export async function changePasswordAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const limit = await rateLimit(`pwchange:${user.id}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Too many attempts. Try again later." };

  const { verify } = await import("@node-rs/argon2");
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record?.passwordHash) {
    return { error: "This account signs in with Google or GitHub, so there is no password to change." };
  }
  const valid = await verify(record.passwordHash, parsed.data.currentPassword).catch(() => false);
  if (!valid) return { error: "Your current password doesn't match." };

  const { hash } = await import("@node-rs/argon2");
  // The new password and the session revocation land together: every
  // session, including one an attacker may hold, ends now.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(parsed.data.newPassword),
      sessionVersion: { increment: 1 },
    },
  });

  await sendMail({ to: record.email, ...passwordChangedEmail() });

  // This device's session ended with the rest; sign in again with the new password.
  await signOut({ redirectTo: "/signin?reset=1" });
  return {};
}

/** Ends every session on every device (this one included) and signs out. */
export async function signOutEverywhereAction(): Promise<void> {
  const user = await requireUser();
  await revokeAllSessions(user.id);
  await signOut({ redirectTo: "/signin?signedout=1" });
}

/**
 * Account deactivation (soft delete). Personal data is anonymized; records
 * needed for pending payout obligations are retained. Sessions are revoked
 * immediately and the user is signed out.
 */
export async function deactivateAccountAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await requireUser();
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "DEACTIVATE") {
    return { error: 'Type "DEACTIVATE" to confirm this irreversible step.' };
  }

  // Captured before the transaction anonymizes it below.
  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        name: "Deleted account",
        email: `deleted+${user.id}@hackvillage.invalid`,
        avatarUrl: null,
        // Ends sessions on every other device too, not just this one.
        sessionVersion: { increment: 1 },
      },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.roleGrant.deleteMany({ where: { userId: user.id } });
  });

  if (record?.email) {
    await sendMail({ to: record.email, ...accountDeactivatedEmail() });
  }

  await signOut({ redirectTo: "/" });
  redirect("/"); // belt-and-braces: signOut already redirects
}
