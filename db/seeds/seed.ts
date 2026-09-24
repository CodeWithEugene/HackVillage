/**
 * Development seed — a realistic Nairobi demo (plan §17 Phase 2): one LIVE
 * Prize Verified event with teams and submissions, plus one PENDING_DEPOSIT
 * event so every UI state is demonstrable locally.
 *
 * Demo accounts all use the password: `demopass123` (dev-only).
 * Idempotent: upserts keyed by slug/email/handle.
 */
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

async function main(): Promise<void> {
  // ── Organization + organizer ────────────────────────────────────────
  const organizer = await prisma.user.upsert({
    where: { email: "organizer@hackvillage.dev" },
    create: {
      email: "organizer@hackvillage.dev",
      name: "Asha Mwangi",
      handle: "asha",
      passwordHash: await hash("demopass123"),
      emailVerified: new Date(),
      primaryRole: "ORGANIZER",
      onboardingCompletedAt: new Date(now - 30 * DAY),
    },
    update: {},
  });
  await prisma.roleGrant.upsert({
    where: { userId_role: { userId: organizer.id, role: "ORGANIZER" } },
    create: { userId: organizer.id, role: "ORGANIZER" },
    update: {},
  });

  const org = await prisma.organization.upsert({
    where: { slug: "technetium-kenya" },
    create: {
      name: "Technetium Kenya",
      slug: "technetium-kenya",
      about: "Community-first tech events for the Nairobi ecosystem.",
      ownerId: organizer.id,
      kycStatus: "VERIFIED",
    },
    update: {},
  });
  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: organizer.id } },
    create: { orgId: org.id, userId: organizer.id, role: "OWNER", status: "ACTIVE" },
    update: {},
  });

  // ── Developers ──────────────────────────────────────────────────────
  const developerSeeds = [
    { email: "wanjiku@hackvillage.dev", name: "Wanjiku Kariuki", handle: "wanjiku" },
    { email: "kamau@hackvillage.dev", name: "Kamau Otieno", handle: "kamau" },
    { email: "zawadi@hackvillage.dev", name: "Zawadi Hassan", handle: "zawadi" },
    { email: "chirchir@hackvillage.dev", name: "Alex Chirchir", handle: "chirchir" },
    { email: "mumbi@hackvillage.dev", name: "Mumbi Njeri", handle: "mumbi" },
  ];
  const developers = [];
  for (const dev of developerSeeds) {
    const user = await prisma.user.upsert({
      where: { email: dev.email },
      create: {
        email: dev.email,
        name: dev.name,
        handle: dev.handle,
        passwordHash: await hash("demopass123"),
        emailVerified: new Date(),
        primaryRole: "DEVELOPER",
        onboardingCompletedAt: new Date(now - 20 * DAY),
      },
      update: {},
    });
    await prisma.roleGrant.upsert({
      where: { userId_role: { userId: user.id, role: "DEVELOPER" } },
      create: { userId: user.id, role: "DEVELOPER" },
      update: {},
    });
    await prisma.developerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline: `${dev.name.split(" ")[0]} — full-stack developer, React & Node`,
        skills: ["react", "typescript", "node", "postgres"],
        location: "Nairobi, Kenya",
      },
      update: {},
    });
    developers.push(user);
  }

  // ── Event 1: LIVE & Prize Verified (demo — escrow state simulated) ──
  const liveEvent = await prisma.event.upsert({
    where: { slug: "fintech-for-matatu-culture" },
    create: {
      orgId: org.id,
      slug: "fintech-for-matatu-culture",
      title: "Fintech for Matatu Culture",
      summary: "Build the rails Nairobi's matatu economy runs on — payments, savings, crew tools.",
      problemStatement:
        "Nairobi's matatu industry moves 3+ million riders daily, yet crews still run on cash boxes and riders have no digital proof of payment. Build open fintech rails for the matatu ecosystem: instant crew-to-rider payments, savings circles for vehicle owners, or data tools that respect crew realities (offline-first, low-end Android).",
      rules:
        "Teams of 2–5. Offline-first is a hard requirement — the demo must work without network. Winners retain their IP; organizers get a demo license.",
      venueType: "HYBRID",
      location: "iHub, Nairobi",
      startsAt: new Date(now + 2 * DAY),
      endsAt: new Date(now + 4 * DAY),
      registrationDeadline: new Date(now + 1 * DAY),
      maxTeams: 20,
      rolesWanted: ["frontend", "fintech", "mobile", "design"],
      status: "LIVE",
      prizeVerifiedAt: new Date(now - 5 * DAY),
      publishedAt: new Date(now - 6 * DAY),
    },
    update: {},
  });
  for (const [place, label, amount] of [
    [1, "1st place", 250_000],
    [2, "2nd place", 150_000],
    [3, "3rd place", 100_000],
  ] as const) {
    await prisma.prizeBreakdown.upsert({
      where: { eventId_place: { eventId: liveEvent.id, place } },
      create: { eventId: liveEvent.id, place, label, amountKes: amount, milestoneRequired: true },
      update: { label, amountKes: amount },
    });
  }

  // Registrations + two teams with a submission
  for (const dev of developers) {
    await prisma.registration.upsert({
      where: { eventId_userId: { eventId: liveEvent.id, userId: dev.id } },
      create: { eventId: liveEvent.id, userId: dev.id, status: "REGISTERED" },
      update: {},
    });
  }

  const teamA = await prisma.team.upsert({
    where: { inviteCode: "teamcodeaa" },
    create: {
      eventId: liveEvent.id,
      name: "Dala Rail",
      leaderId: developers[0].id,
      inviteCode: "teamcodeaa",
      status: "OPEN",
    },
    update: {},
  });
  const teamB = await prisma.team.upsert({
    where: { inviteCode: "teamcodebb" },
    create: {
      eventId: liveEvent.id,
      name: "Kilio Kali",
      leaderId: developers[2].id,
      inviteCode: "teamcodebb",
      status: "OPEN",
    },
    update: {},
  });
  for (const [team, members] of [
    [teamA, developers.slice(0, 2)],
    [teamB, developers.slice(2, 4)],
  ] as const) {
    for (const member of members) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId: member.id } },
        create: { teamId: team.id, userId: member.id, status: "JOINED" },
        update: {},
      });
    }
  }
  await prisma.submission.upsert({
    where: { teamId: teamA.id },
    create: {
      teamId: teamA.id,
      repoUrl: "https://github.com/dala-rail/matatu-pay",
      demoUrl: "https://matatu-pay.vercel.app",
      description:
        "Offline-first crew payments on low-end Android: USSD fallback, QR receipts, and a savings circle for vehicle owners. Demo runs fully offline.",
      splitDeclaration: [
        { userId: developers[0].id, percent: 60 },
        { userId: developers[1].id, percent: 40 },
      ],
    },
    update: {},
  });

  // ── Event 2: PENDING_DEPOSIT (the honest "not verified" state) ───────
  const pendingEvent = await prisma.event.upsert({
    where: { slug: "ai-for-health-records" },
    create: {
      orgId: org.id,
      slug: "ai-for-health-records",
      title: "AI for Health Records",
      summary: "Interoperable patient records for community clinics — privacy-first AI tooling.",
      problemStatement:
        "Community clinics keep patient records in paper files that never talk to each other. Build privacy-first tooling that lets clinics exchange records with consent — AI triage assistants, referral pipelines, or audit tools for Data Protection Act compliance.",
      venueType: "PHYSICAL",
      location: "Kisumu Innovation Hub",
      startsAt: new Date(now + 20 * DAY),
      endsAt: new Date(now + 22 * DAY),
      registrationDeadline: new Date(now + 18 * DAY),
      maxTeams: 15,
      rolesWanted: ["ai", "backend", "design"],
      status: "PENDING_DEPOSIT",
      publishedAt: new Date(now - 1 * DAY),
    },
    update: {},
  });
  for (const [place, label, amount] of [
    [1, "1st place", 60_000],
    [2, "2nd place", 40_000],
  ] as const) {
    await prisma.prizeBreakdown.upsert({
      where: { eventId_place: { eventId: pendingEvent.id, place } },
      create: { eventId: pendingEvent.id, place, label, amountKes: amount, milestoneRequired: true },
      update: { label, amountKes: amount },
    });
  }

  // ── Judge for the live event (Phase 4 demo) ──────────────────────────
  const judge = await prisma.user.upsert({
    where: { email: "judge@hackvillage.dev" },
    create: {
      email: "judge@hackvillage.dev",
      name: "Njeri Wambui",
      handle: "njeri-judge",
      passwordHash: await hash("demopass123"),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(now - 25 * DAY),
    },
    update: {},
  });
  await prisma.roleGrant.upsert({
    where: { userId_role: { userId: judge.id, role: "JUDGE" } },
    create: { userId: judge.id, role: "JUDGE" },
    update: {},
  });
  await prisma.judgeAssignment.upsert({
    where: { eventId_userId: { eventId: liveEvent.id, userId: judge.id } },
    create: { eventId: liveEvent.id, userId: judge.id, status: "ACTIVE" },
    update: {},
  });
  await prisma.rubric.upsert({
    where: { eventId: liveEvent.id },
    create: {
      eventId: liveEvent.id,
      criteria: [
        { id: "innovation", label: "Innovation", weight: 25 },
        { id: "execution", label: "Execution & completeness", weight: 25 },
        { id: "impact", label: "Impact on the problem", weight: 20 },
        { id: "presentation", label: "Presentation & demo", weight: 15 },
        { id: "quality", label: "Code quality & repo", weight: 15 },
      ],
    },
    update: {},
  });

  console.log("Seeded: Technetium Kenya org, 1 organizer, 5 developers, 1 judge, 2 events, 2 teams, 1 submission.");
  console.log("Demo login: organizer@hackvillage.dev / wanjiku@hackvillage.dev / judge@hackvillage.dev … password: demopass123");
}

main()
  .then(() => {
    void prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
