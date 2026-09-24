"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/lib/auth";
import { passwordSchema } from "@/lib/auth/password-policy";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
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

  const limit = rateLimit(`pwchange:${user.id}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return { error: "Too many attempts — try again later." };

  const { verify } = await import("@node-rs/argon2");
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record?.passwordHash) {
    return { error: "This account signs in with Google or GitHub — no password to change." };
  }
  const valid = await verify(record.passwordHash, parsed.data.currentPassword).catch(() => false);
  if (!valid) return { error: "Your current password doesn't match." };

  const { hash } = await import("@node-rs/argon2");
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hash(parsed.data.newPassword) },
  });

  return { message: "Password updated." };
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

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        name: "Deleted account",
        email: `deleted+${user.id}@hackvillage.invalid`,
        avatarUrl: null,
      },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.roleGrant.deleteMany({ where: { userId: user.id } });
  });

  await signOut({ redirectTo: "/" });
  redirect("/"); // belt-and-braces: signOut already redirects
}
