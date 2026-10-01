import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Session revocation (JWT sessions can't be deleted server-side, so each token
 * carries the User.sessionVersion it was issued under). Bumping the version
 * ends every existing session for that user on its next request.
 */

interface SessionOwner {
  sessionVersion: number;
  deletedAt: Date | null;
}

/** A token is valid only for a live account still on the version it was issued under. */
export function isSessionCurrent(
  tokenVersion: number | undefined,
  owner: SessionOwner | null
): boolean {
  if (!owner || owner.deletedAt) return false;
  // Tokens issued before versioning existed carry no version: they match 0.
  return (tokenVersion ?? 0) === owner.sessionVersion;
}

/** Ends every session the user has, on every device. Pass `tx` inside a transaction. */
export async function revokeAllSessions(
  userId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}
