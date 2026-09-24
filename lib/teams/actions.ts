"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { generateInviteCode } from "@/lib/organizations/invitations";
import { prisma } from "@/lib/db";
import { registrationOpen } from "@/lib/events/lifecycle";
import { sendNotification } from "@/lib/notifications/send";
import {
  teamInviteAcceptedEmail,
  teamInviteDeclinedEmail,
  teamInviteEmail,
  teamMemberLeftEmail,
} from "@/lib/notifications/templates/teams";
import { appUrl } from "@/lib/url";
import { canJoinTeam, MAX_TEAM_MEMBERS, validTeamName, type TeamSnapshot } from "@/lib/teams/policy";

export interface TeamActionState {
  error?: string;
}

type TeamWithMembers = {
  id: string;
  eventId: string;
  status: "OPEN" | "LOCKED" | "DISBANDED";
  members: { userId: string; status: "INVITED" | "JOINED" | "LEFT" | "DECLINED" }[];
};

function snapshotOf(team: TeamWithMembers): TeamSnapshot {
  return {
    status: team.status,
    joinedCount: team.members.filter((m) => m.status === "JOINED").length,
  };
}

export async function createTeamAction(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const user = await requireUser();
  const eventId = z.string().cuid().safeParse(String(formData.get("eventId") ?? ""));
  const name = String(formData.get("name") ?? "");
  const nameError = validTeamName(name);
  if (!eventId.success) return { error: "Unknown event." };
  if (nameError) return { error: nameError };

  const event = await prisma.event.findUnique({ where: { id: eventId.data } });
  if (!event) return { error: "Unknown event." };

  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
  });
  if (!registration || registration.status !== "REGISTERED") {
    return { error: "Register for the event before forming a team." };
  }
  if (!registrationOpen(event)) {
    return { error: "Registration for this event has closed." };
  }

  const existingTeam = await prisma.teamMember.findFirst({
    where: { userId: user.id, status: "JOINED", team: { eventId: event.id } },
    select: { id: true },
  });
  if (existingTeam) return { error: "You're already on a team for this event." };

  const teamCount = await prisma.team.count({
    where: { eventId: event.id, status: { not: "DISBANDED" } },
  });
  if (teamCount >= event.maxTeams) {
    return { error: "This event has reached its team limit." };
  }

  await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: { eventId: event.id, name, leaderId: user.id, inviteCode: generateInviteCode() },
    });
    await tx.teamMember.create({ data: { teamId: team.id, userId: user.id, status: "JOINED" } });
  });

  revalidatePath(`/events/${event.slug}/workspace`);
  redirect(`/events/${event.slug}/workspace`);
}

export async function inviteMemberAction(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const user = await requireUser();
  const teamId = z.string().cuid().safeParse(String(formData.get("teamId") ?? ""));
  const handle = z
    .string()
    .trim()
    .min(3)
    .max(30)
    .safeParse(String(formData.get("handle") ?? "").replace(/^@/, ""));
  if (!teamId.success || !handle.success) return { error: "Check the invite details." };

  const team = await prisma.team.findUnique({
    where: { id: teamId.data },
    include: { event: { select: { id: true, slug: true, title: true } }, members: true },
  });
  if (!team || team.leaderId !== user.id) {
    return { error: "Only the team leader can invite members." };
  }

  const invitee = await prisma.user.findFirst({
    where: { handle: { equals: handle.data, mode: "insensitive" }, deletedAt: null },
    select: { id: true, email: true },
  });
  if (!invitee) return { error: "No HackVillage developer uses that handle." };

  const alreadyInEvent = await prisma.teamMember.findFirst({
    where: { userId: invitee.id, status: "JOINED", team: { eventId: team.event.id } },
    select: { id: true },
  });
  if (alreadyInEvent) return { error: "That developer is already on a team for this event." };

  const decision = canJoinTeam(snapshotOf(team), false, true);
  if (!decision.ok) return { error: decision.reason! };

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: invitee.id } },
    create: { teamId: team.id, userId: invitee.id, status: "INVITED" },
    update: { status: "INVITED" },
  });

  await sendNotification({
    userId: invitee.id,
    to: invitee.email,
    category: "teamActivity",
    template: teamInviteEmail(team.name, team.event.title, appUrl("/dashboard/teams")),
  });

  revalidatePath(`/events/${team.event.slug}/workspace`);
  return {};
}

export async function joinTeamByCodeAction(
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const user = await requireUser();
  const code = z
    .string()
    .trim()
    .min(6)
    .max(10)
    .safeParse(String(formData.get("code") ?? ""));
  if (!code.success) return { error: "Team codes are the short codes leaders share." };

  const team = await prisma.team.findUnique({
    where: { inviteCode: code.data },
    include: { event: true, members: true },
  });
  if (!team || team.status === "DISBANDED") return { error: "That team code isn't valid." };

  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: team.event.id, userId: user.id } },
  });
  if (!registration || registration.status !== "REGISTERED") {
    return { error: "Register for the event before joining a team." };
  }

  const alreadyInEvent = await prisma.teamMember.findFirst({
    where: { userId: user.id, status: "JOINED", team: { eventId: team.event.id } },
    select: { id: true },
  });
  if (alreadyInEvent) return { error: "You're already on a team for this event." };

  const membership = team.members.find((m) => m.userId === user.id);
  const decision = canJoinTeam(
    snapshotOf(team),
    Boolean(membership),
    registrationOpen(team.event)
  );
  if (!decision.ok) return { error: decision.reason! };

  if (membership) {
    await prisma.teamMember.update({ where: { id: membership.id }, data: { status: "JOINED" } });
  } else {
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: user.id, status: "JOINED" },
    });
  }

  revalidatePath(`/events/${team.event.slug}/workspace`);
  redirect(`/events/${team.event.slug}/workspace`);
}

export async function acceptTeamInviteAction(teamId: string): Promise<void> {
  const user = await requireUser();
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId: user.id, status: "INVITED" },
    include: {
      team: { include: { event: true, members: true, leader: { select: { id: true, email: true } } } },
    },
  });
  if (!membership) redirect("/dashboard/teams");

  const team = membership.team;
  const decision = canJoinTeam(snapshotOf(team), false, registrationOpen(team.event));
  if (!decision.ok) {
    redirect(`/dashboard/teams?join=${encodeURIComponent(decision.reason!)}`);
  }
  if (snapshotOf(team).joinedCount >= MAX_TEAM_MEMBERS) {
    redirect(`/dashboard/teams?join=${encodeURIComponent("That team is full.")}`);
  }

  await prisma.teamMember.update({ where: { id: membership.id }, data: { status: "JOINED" } });

  await sendNotification({
    userId: team.leader.id,
    to: team.leader.email,
    category: "teamActivity",
    template: teamInviteAcceptedEmail(user.name ?? user.handle, team.name),
  });

  revalidatePath("/dashboard/teams");
  redirect(`/events/${team.event.slug}/workspace`);
}

export async function declineTeamInviteAction(teamId: string): Promise<void> {
  const user = await requireUser();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true, leader: { select: { id: true, email: true } } },
  });

  await prisma.teamMember.updateMany({
    where: { teamId, userId: user.id, status: "INVITED" },
    data: { status: "DECLINED" },
  });

  if (team) {
    await sendNotification({
      userId: team.leader.id,
      to: team.leader.email,
      category: "teamActivity",
      template: teamInviteDeclinedEmail(user.name ?? user.handle, team.name),
    });
  }

  revalidatePath("/dashboard/teams");
}

export async function leaveTeamAction(teamId: string): Promise<void> {
  const user = await requireUser();
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId: user.id, status: "JOINED" },
    include: {
      team: {
        include: { event: { select: { slug: true } }, leader: { select: { id: true, email: true } } },
      },
    },
  });
  if (!membership) redirect("/dashboard/teams");
  const { team } = membership;

  if (team.leaderId === user.id) {
    redirect(`/events/${team.event.slug}/workspace?leave=leader`);
  }

  await prisma.teamMember.updateMany({
    where: { teamId, userId: user.id, status: "JOINED" },
    data: { status: "LEFT" },
  });

  await sendNotification({
    userId: team.leader.id,
    to: team.leader.email,
    category: "teamActivity",
    template: teamMemberLeftEmail(user.name ?? user.handle, team.name),
  });

  revalidatePath(`/events/${team.event.slug}/workspace`);
}

export async function toggleTeamLockAction(teamId: string): Promise<void> {
  const user = await requireUser();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: { select: { slug: true } } },
  });
  if (!team || team.leaderId !== user.id) redirect("/dashboard/teams");

  await prisma.team.update({
    where: { id: teamId },
    data: { status: team.status === "OPEN" ? "LOCKED" : "OPEN" },
  });

  revalidatePath(`/events/${team.event.slug}/workspace`);
}

export async function disbandTeamAction(teamId: string): Promise<void> {
  const user = await requireUser();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: { select: { slug: true } }, submission: { select: { id: true } } },
  });
  if (!team || team.leaderId !== user.id) redirect("/dashboard/teams");
  if (team.submission) {
    redirect(`/events/${team.event.slug}/workspace?disband=submitted`);
  }

  await prisma.$transaction([
    prisma.team.update({ where: { id: teamId }, data: { status: "DISBANDED" } }),
    prisma.teamMember.updateMany({
      where: { teamId, status: "JOINED" },
      data: { status: "LEFT" },
    }),
  ]);

  revalidatePath(`/events/${team.event.slug}/workspace`);
}
