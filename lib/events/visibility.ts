import type { Prisma } from "@prisma/client";

import type { EventStatus } from "@/lib/events/lifecycle";

/**
 * Only hackathons whose prize pool is fully funded exist on the public
 * platform. Unfunded ones stay in the organizer's dashboard until the vault
 * locks, so the public UI never has to explain "pending" states.
 */
export const PUBLIC_HACKATHON_WHERE = {
  publishedAt: { not: null },
  prizeVerifiedAt: { not: null },
  status: { not: "CANCELLED" },
} satisfies Prisma.EventWhereInput;

export function isPublicHackathon(event: {
  publishedAt: Date | null;
  prizeVerifiedAt: Date | null;
  status: EventStatus;
}): boolean {
  return Boolean(event.publishedAt && event.prizeVerifiedAt) && event.status !== "CANCELLED";
}
