import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Registration status transitions. The receipt emails are transactional and
 * user-initiated (a person clicked register/cancel), so they always send —
 * but only when a transition ACTUALLY happened. Both paths write with the
 * current status in the WHERE clause, so an idempotent re-click (or double
 * submit) is a no-op write that triggers no duplicate receipt.
 */
export async function setRegistrationStatus(input: {
  eventId: string;
  userId: string;
  status: "REGISTERED" | "CANCELLED";
}): Promise<{ changed: boolean }> {
  if (input.status === "REGISTERED") {
    try {
      await prisma.registration.create({
        data: { eventId: input.eventId, userId: input.userId, status: "REGISTERED" },
      });
      return { changed: true };
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!isUniqueViolation) throw error;
    }
    // A row already exists: flip it back only if it isn't REGISTERED already.
    const result = await prisma.registration.updateMany({
      where: { eventId: input.eventId, userId: input.userId, status: { not: "REGISTERED" } },
      data: { status: "REGISTERED" },
    });
    return { changed: result.count > 0 };
  }

  const result = await prisma.registration.updateMany({
    where: { eventId: input.eventId, userId: input.userId, status: "REGISTERED" },
    data: { status: "CANCELLED" },
  });
  return { changed: result.count > 0 };
}
