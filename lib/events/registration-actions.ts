"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { registrationOpen } from "@/lib/events/lifecycle";
import { sendNotification } from "@/lib/notifications/send";
import { registrationCancelledEmail, registrationConfirmedEmail } from "@/lib/notifications/templates/events";
import { appUrl } from "@/lib/url";

export interface RegistrationActionState {
  error?: string;
}

/** Developer registers for a published event (before the deadline). */
export async function registerForEventAction(eventSlug: string): Promise<void> {
  const user = await requireUser();

  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event || !registrationOpen(event)) {
    redirect(`/events/${eventSlug}?registration=closed`);
  }

  await prisma.registration.upsert({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    create: { eventId: event.id, userId: user.id, status: "REGISTERED" },
    update: { status: "REGISTERED" },
  });

  await sendNotification({
    userId: user.id,
    to: user.email,
    category: "eventUpdates",
    template: registrationConfirmedEmail(event.title, appUrl(`/events/${eventSlug}`)),
  });

  revalidatePath(`/events/${eventSlug}`);
  redirect(`/events/${eventSlug}/workspace`);
}

export async function cancelRegistrationAction(eventSlug: string): Promise<void> {
  const user = await requireUser();

  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event) redirect("/dashboard/events");

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
    redirect(`/events/${eventSlug}/workspace?leave=team-first`);
  }

  await prisma.registration.updateMany({
    where: { eventId: event.id, userId: user.id },
    data: { status: "CANCELLED" },
  });

  await sendNotification({
    userId: user.id,
    to: user.email,
    category: "eventUpdates",
    template: registrationCancelledEmail(event.title),
  });

  revalidatePath(`/events/${eventSlug}`);
  redirect("/dashboard/events");
}
