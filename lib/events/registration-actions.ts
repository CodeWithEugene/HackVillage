"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { isPublicHackathon } from "@/lib/events/visibility";
import { registrationOpen } from "@/lib/events/lifecycle";
import { setRegistrationStatus } from "@/lib/events/registrations";
import { sendNotification } from "@/lib/notifications/send";
import {
  registrationCancelledEmail,
  registrationConfirmedEmail,
} from "@/lib/notifications/templates/events";
import { appUrl } from "@/lib/url";

export interface RegistrationActionState {
  error?: string;
}

/**
 * Registration receipts are user-initiated transactional mail (the person
 * clicked the button and needs the confirmation) — they go out WITHOUT a
 * notification category, so they always send and carry no preference-based
 * unsubscribe, and only when the write actually changed the status.
 */

/** Developer registers for a published event (before the deadline). */
export async function registerForEventAction(eventSlug: string): Promise<void> {
  const user = await requireUser();

  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  // Unfunded hackathons aren't on the public platform, so nobody can join them.
  if (!event || !isPublicHackathon(event) || !registrationOpen(event)) {
    redirect(`/hackathons/${eventSlug}?registration=closed`);
  }

  const { changed } = await setRegistrationStatus({
    eventId: event.id,
    userId: user.id,
    status: "REGISTERED",
  });

  if (changed) {
    await sendNotification({
      userId: user.id,
      to: user.email,
      template: registrationConfirmedEmail(event.title, appUrl(`/hackathons/${eventSlug}`)),
    });
  }

  revalidatePath(`/hackathons/${eventSlug}`);
  redirect(`/hackathons/${eventSlug}/workspace`);
}

export async function cancelRegistrationAction(eventSlug: string): Promise<void> {
  const user = await requireUser();

  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event) redirect("/dashboard/hackathons");

  // Active team membership blocks cancellation — leave the team first.
  const activeTeam = await prisma.teamMember.findFirst({
    where: {
      userId: user.id,
      status: "JOINED",
      team: { eventId: event.id },
    },
    select: { id: true },
  });
  if (activeTeam) {
    redirect(`/hackathons/${eventSlug}/workspace?leave=team-first`);
  }

  const { changed } = await setRegistrationStatus({
    eventId: event.id,
    userId: user.id,
    status: "CANCELLED",
  });

  if (changed) {
    await sendNotification({
      userId: user.id,
      to: user.email,
      template: registrationCancelledEmail(event.title),
    });
  }

  revalidatePath(`/hackathons/${eventSlug}`);
  redirect("/dashboard/hackathons");
}
