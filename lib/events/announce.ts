import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { formatEventDates } from "@/lib/events/format";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";
import { sendNotification } from "@/lib/notifications/send";
import { newPrizeVerifiedHackathonEmail } from "@/lib/notifications/templates/events";
import { isRealAccountEmail } from "@/lib/seo/indexable";
import { appUrl } from "@/lib/url";
import { formatKes } from "@/lib/utils";

/** In-app notification type; also how a builder is marked as already told. */
export const HACKATHON_LIVE_NOTIFICATION = "hackathon.live";

const SEND_BATCH_SIZE = 10;

const dayFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

/**
 * Who hears about a newly live hackathon: verified builders (developer role)
 * with hackathon updates on, excluding the hosting organization's own team and
 * anyone already told about this hackathon (so a retried job never emails
 * twice).
 */
export function announcementRecipientsWhere(event: {
  id: string;
  orgId: string;
}): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    emailVerified: { not: null },
    roleGrants: { some: { role: "DEVELOPER" } },
    OR: [
      { notificationPreference: { is: null } },
      { notificationPreference: { is: { eventUpdates: true } } },
    ],
    orgMemberships: { none: { orgId: event.orgId, status: "ACTIVE" } },
    notifications: {
      none: { type: HACKATHON_LIVE_NOTIFICATION, payload: { path: ["eventId"], equals: event.id } },
    },
  };
}

/**
 * Emails builders that a hackathon just went live with its prize locked, and
 * records an in-app notification for each. Demo hackathons and anything not
 * public are never announced. Returns how many builders were told.
 */
export async function announceHackathonToBuilders(eventId: string): Promise<number> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...PUBLIC_HACKATHON_WHERE, isDemo: false },
    select: {
      id: true,
      orgId: true,
      slug: true,
      title: true,
      startsAt: true,
      endsAt: true,
      registrationDeadline: true,
      venueType: true,
      location: true,
      prizes: { select: { amountKes: true } },
    },
  });
  if (!event) return 0;

  const recipients = (
    await prisma.user.findMany({
      where: announcementRecipientsWhere(event),
      select: { id: true, email: true },
    })
  ).filter((user) => isRealAccountEmail(user.email));

  const template = newPrizeVerifiedHackathonEmail({
    eventTitle: event.title,
    eventUrl: appUrl(`/hackathons/${event.slug}`),
    prizePool: formatKes(event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0)),
    dates: formatEventDates(event.startsAt, event.endsAt),
    venue: event.venueType === "ONLINE" ? "Online" : (event.location ?? "Kenya"),
    registrationCloses: dayFormat.format(event.registrationDeadline),
  });

  let told = 0;
  for (let start = 0; start < recipients.length; start += SEND_BATCH_SIZE) {
    const batch = recipients.slice(start, start + SEND_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (user) => {
        // Record first: if the email fails, a retry won't send it twice.
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: HACKATHON_LIVE_NOTIFICATION,
            payload: { eventId: event.id, eventTitle: event.title, slug: event.slug },
          },
        });
        await sendNotification({
          userId: user.id,
          to: user.email,
          category: "eventUpdates",
          template,
        });
      }),
    );
    for (const result of results) {
      if (result.status === "fulfilled") told += 1;
      else console.error(`[announce] notifying a builder about ${event.id} failed`, result.reason);
    }
  }
  return told;
}
