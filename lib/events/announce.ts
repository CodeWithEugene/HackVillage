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

/** Users pulled per page — cursor-paginated so memory stays flat. */
const USER_PAGE_SIZE = 200;
/** Emails sent in parallel within a page. */
const SEND_BATCH_SIZE = 10;
/**
 * Hard bound on total work per invocation: a retry (the where clause excludes
 * anyone already told) picks up the remainder — a huge user base can never
 * turn one job run into an unbounded loop.
 */
const MAX_RECIPIENTS_PER_RUN = 2_000;

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
 * Which users from one page actually get told: drop opted-out preferences
 * (batch-loaded, never per-user) and anyone a racing run already notified
 * since the page was read. Pure — unit-tested.
 */
export function filterAnnouncementTargets<T extends { id: string }>(
  users: T[],
  optedOutUserIds: ReadonlySet<string>,
  alreadyToldUserIds: ReadonlySet<string>
): T[] {
  return users.filter((user) => !optedOutUserIds.has(user.id) && !alreadyToldUserIds.has(user.id));
}

/**
 * Emails builders that a hackathon just went live with its prize locked, and
 * records an in-app notification for each. Demo hackathons and anything not
 * public are never announced. Returns how many builders were told.
 *
 * Batched by construction: cursor-paginated user pages, batch-loaded
 * preferences, one createMany per page, bounded total work per run.
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

  const template = newPrizeVerifiedHackathonEmail({
    eventTitle: event.title,
    eventUrl: appUrl(`/hackathons/${event.slug}`),
    prizePool: formatKes(event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0)),
    dates: formatEventDates(event.startsAt, event.endsAt),
    venue: event.venueType === "ONLINE" ? "Online" : (event.location ?? "Kenya"),
    registrationCloses: dayFormat.format(event.registrationDeadline),
  });

  let told = 0;
  let cursor: string | undefined;
  // Paginate by primary key so the scan is stable even as notifications land.
  while (told < MAX_RECIPIENTS_PER_RUN) {
    const page = await prisma.user.findMany({
      where: announcementRecipientsWhere(event),
      select: { id: true, email: true },
      orderBy: { id: "asc" },
      take: USER_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (page.length === 0) break;
    cursor = page[page.length - 1]!.id;

    const pageIds = page.map((user) => user.id);
    // Batch-load instead of per-user queries (the old fan-out was an N+1).
    const [preferences, alreadyTold] = await Promise.all([
      prisma.notificationPreference.findMany({
        where: { userId: { in: pageIds } },
        select: { userId: true, eventUpdates: true },
      }),
      // Re-check inside the page: narrows the race with a concurrent run.
      prisma.notification.findMany({
        where: {
          userId: { in: pageIds },
          type: HACKATHON_LIVE_NOTIFICATION,
          payload: { path: ["eventId"], equals: event.id },
        },
        select: { userId: true },
      }),
    ]);
    const optedOut = new Set(
      preferences.filter((p) => p.eventUpdates === false).map((p) => p.userId)
    );
    const toldIds = new Set(alreadyTold.map((n) => n.userId));

    const targets = filterAnnouncementTargets(
      page.filter((user) => isRealAccountEmail(user.email)),
      optedOut,
      toldIds
    );
    if (targets.length > 0) {
      // Record first: if an email fails, a retry won't send it twice.
      await prisma.notification.createMany({
        data: targets.map((user) => ({
          userId: user.id,
          type: HACKATHON_LIVE_NOTIFICATION,
          payload: { eventId: event.id, eventTitle: event.title, slug: event.slug },
        })),
        skipDuplicates: true,
      });

      for (let start = 0; start < targets.length; start += SEND_BATCH_SIZE) {
        const batch = targets.slice(start, start + SEND_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (user) => {
            await sendNotification({
              userId: user.id,
              to: user.email,
              category: "eventUpdates",
              preferencePrechecked: true,
              template,
            });
          })
        );
        for (const result of results) {
          if (result.status === "fulfilled") told += 1;
          else console.error(`[announce] notifying a builder about ${event.id} failed`, result.reason);
        }
      }
    }

    if (page.length < USER_PAGE_SIZE) break; // last page
  }

  return told;
}
