"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications/send";
import { eventPublishedEmail } from "@/lib/notifications/templates/events";
import { appUrl } from "@/lib/url";
import { canPublishDraft } from "@/lib/events/lifecycle";
import {
  eventSlugCandidates,
  eventWizardSchema,
  placesAreUnique,
} from "@/lib/events/validation";

export interface EventActionState {
  error?: string;
}

async function requireEventOrganizer(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, orgId: true, status: true, slug: true },
  });
  if (!event) return { error: "Event not found." } as const;

  const membership = await prisma.orgMember.findFirst({
    where: {
      orgId: event.orgId,
      userId: user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });
  if (!membership) return { error: "Only organization admins can edit this event." } as const;

  return { user, event } as const;
}

const wizardFormSchema = eventWizardSchema.and(
  z.object({ eventId: z.string().trim().optional().or(z.literal("")) })
);

export async function saveEventAction(
  _prev: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  const user = await requireUser();

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { orgId: true, role: true },
  });
  if (!membership || membership.role === "MEMBER") {
    return { error: "Create an organization first — events belong to organizations." };
  }

  const rawPrizes = String(formData.get("prizes") ?? "[]");
  let prizesJson: unknown;
  try {
    prizesJson = JSON.parse(rawPrizes);
  } catch {
    return { error: "The prize breakdown didn't submit correctly — try again." };
  }

  const parsed = wizardFormSchema.safeParse({
    ...Object.fromEntries(formData),
    prizes: prizesJson,
    eventId: String(formData.get("eventId") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the event details and try again." };
  }
  const data = parsed.data;

  if (!placesAreUnique(data.prizes)) {
    return { error: "Prize places must be unique — 1st, 2nd, 3rd…" };
  }

  // Editing an existing draft, or creating a new one.
  if (data.eventId) {
    const guard = await requireEventOrganizer(data.eventId);
    if ("error" in guard) return { error: guard.error };
    if (guard.event.status !== "DRAFT") {
      return { error: "Only draft events can be edited. Published events are locked." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: data.eventId },
        data: {
          title: data.title,
          summary: data.summary || null,
          venueType: data.venueType,
          location: data.location ?? null,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          registrationDeadline: data.registrationDeadline,
          maxTeams: data.maxTeams,
          rolesWanted: data.rolesWanted,
          problemStatement: data.problemStatement,
          rules: data.rules || null,
        },
      });
      await tx.prizeBreakdown.deleteMany({ where: { eventId: data.eventId } });
      await tx.prizeBreakdown.createMany({
        data: data.prizes.map((prize) => ({
          eventId: data.eventId!,
          place: prize.place,
          label: prize.label,
          amountKes: prize.amountKes,
          milestoneRequired: prize.milestoneRequired,
        })),
      });
      await tx.eventRoleTag.deleteMany({ where: { eventId: data.eventId } });
      await tx.eventRoleTag.createMany({
        data: data.rolesWanted.map((tag) => ({ eventId: data.eventId!, tag })),
        skipDuplicates: true,
      });
    });

    revalidatePath(`/organizer/events/${guard.event.slug}`);
    redirect(`/organizer/events/${guard.event.slug}`);
  }

  // New draft: pick a unique slug.
  const candidates = eventSlugCandidates(data.title);
  const taken = await prisma.event.findMany({
    where: { slug: { in: candidates, mode: "insensitive" } },
    select: { slug: true },
  });
  const takenSet = new Set(taken.map((t) => t.slug.toLowerCase()));
  const slug = candidates.find((c) => !takenSet.has(c));
  if (!slug) return { error: "Slug collision — adjust the title slightly." };

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        orgId: membership.orgId,
        slug,
        title: data.title,
        summary: data.summary || null,
        venueType: data.venueType,
        location: data.location ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        registrationDeadline: data.registrationDeadline,
        maxTeams: data.maxTeams,
        rolesWanted: data.rolesWanted,
        problemStatement: data.problemStatement,
        rules: data.rules || null,
        status: "DRAFT",
      },
    });
    await tx.prizeBreakdown.createMany({
      data: data.prizes.map((prize) => ({
        eventId: created.id,
        place: prize.place,
        label: prize.label,
        amountKes: prize.amountKes,
        milestoneRequired: prize.milestoneRequired,
      })),
    });
    if (data.rolesWanted.length > 0) {
      await tx.eventRoleTag.createMany({
        data: data.rolesWanted.map((tag) => ({ eventId: created.id, tag })),
        skipDuplicates: true,
      });
    }
    return created;
  });

  revalidatePath("/organizer");
  redirect(`/organizer/events/${event.slug}`);
}

export async function publishEventAction(eventId: string): Promise<EventActionState> {
  const guard = await requireEventOrganizer(eventId);
  if ("error" in guard) return { error: guard.error };
  if (guard.event.status !== "DRAFT") {
    return { error: "This event is already published." };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { prizes: true },
  });
  if (!event) return { error: "Event not found." };

  const poolKes = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
  const { ok, reason } = canPublishDraft(
    {
      title: event.title,
      venueType: event.venueType,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      registrationDeadline: event.registrationDeadline,
      problemStatement: event.problemStatement,
      prizeCount: event.prizes.length,
      poolKes,
    },
    getEnv().MIN_PRIZE_POOL_KES
  );
  if (!ok) return { error: reason };

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: "PENDING_DEPOSIT",
      publishedAt: new Date(),
      // endsAt + 48h — enforced by the media job in Phase 7.
      mediaDeadlineAt: new Date(event.endsAt.getTime() + 48 * 60 * 60 * 1000),
    },
  });

  await sendNotification({
    userId: guard.user.id,
    to: guard.user.email,
    category: "eventUpdates",
    template: eventPublishedEmail(event.title, appUrl(`/organizer/events/${event.slug}`)),
  });

  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath(`/organizer/events/${event.slug}`);
  return {};
}
