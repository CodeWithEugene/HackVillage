/**
 * Development seed — a realistic Nairobi demo (plan §17): events across the
 * full lifecycle (DRAFT → PENDING_DEPOSIT → LIVE/IN_PROGRESS → JUDGING →
 * WINNERS_ANNOUNCED → SETTLED) with the money graph to match: escrow vaults,
 * deposits, ledger entries, winners, payouts, milestones, a dispute, judging
 * artifacts, media, trust, hiring, and a due legacy check-in.
 *
 * Demo accounts all use the password: `demopass123` (dev-only).
 * Idempotent: upserts keyed by slug/email/handle/unique business keys.
 */
import { createHash } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { PrismaClient, type Team, type User, type Winner } from "@prisma/client";

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

/** Deterministic, unique fake chain tx hash (matches the 0x + 64 hex shape). */
function txHashFor(slug: string, kind: string): string {
  return `0x${createHash("sha256").update(`hv-seed:${slug}:${kind}`).digest("hex")}`;
}

/**
 * The escrow graph every LOCKED-or-beyond event needs: a SUCCEEDED deposit
 * (gross = pool × 1.05, ADR-012), a LOCKED vault (contractAddress null in
 * simulation), and the VAULT_CREATED + DEPOSIT_LOCKED ledger entries the
 * attestation jobs would have written (reconcile.ts checks this invariant).
 */
async function seedEscrow(
  event: { id: string; slug: string },
  poolKes: number,
  paidAt: Date
): Promise<void> {
  const gross = Math.round(poolKes * 1.05);
  const depositRef = `seed-dep-${event.slug}`;
  await prisma.deposit.upsert({
    where: { paystackReference: depositRef },
    create: {
      eventId: event.id,
      paystackReference: depositRef,
      grossAmountKes: gross,
      poolAmountKes: poolKes,
      feeKes: gross - poolKes,
      channel: "card",
      status: "SUCCEEDED",
      paidAt,
    },
    update: {},
  });
  const lockTx = txHashFor(event.slug, "lock");
  await prisma.vaultState.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      amountKes: poolKes,
      contractAddress: null,
      chainState: "LOCKED",
      lockedAt: new Date(paidAt.getTime() + 60 * 60 * 1000),
      lastTxHash: lockTx,
    },
    update: {},
  });
  await prisma.ledgerEntry.upsert({
    where: { txHash: txHashFor(event.slug, "vault") },
    create: {
      eventId: event.id,
      type: "VAULT_CREATED",
      payload: { amountKes: poolKes, contractAddress: null },
      txHash: txHashFor(event.slug, "vault"),
      blockNumber: 1,
    },
    update: {},
  });
  await prisma.ledgerEntry.upsert({
    where: { txHash: lockTx },
    create: {
      eventId: event.id,
      type: "DEPOSIT_LOCKED",
      payload: { amountKes: poolKes, paystackRef: depositRef },
      txHash: lockTx,
      blockNumber: 2,
    },
    update: {},
  });
}

/** A team with JOINED members, keyed by invite code. */
async function seedTeam(
  eventId: string,
  input: { inviteCode: string; name: string; leader: User; members: User[]; status?: "OPEN" | "LOCKED" }
): Promise<Team> {
  const team = await prisma.team.upsert({
    where: { inviteCode: input.inviteCode },
    create: {
      eventId,
      name: input.name,
      leaderId: input.leader.id,
      inviteCode: input.inviteCode,
      status: input.status ?? "OPEN",
    },
    update: {},
  });
  for (const member of input.members) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: member.id } },
      create: { teamId: team.id, userId: member.id, status: "JOINED" },
      update: {},
    });
  }
  return team;
}

/**
 * One announced winner with everything announceWinners + the instant payout
 * job would have persisted: the Winner row, its Milestone, a SUCCEEDED
 * INSTANT payout, and the matching INSTANT_PAYOUT ledger entry.
 */
async function seedWinner(
  event: { id: string; slug: string },
  input: { team: Team; leader: User; place: number; amountKes: number; announcedAt: Date }
): Promise<Winner> {
  const winner = await prisma.winner.upsert({
    where: { eventId_place: { eventId: event.id, place: input.place } },
    create: {
      eventId: event.id,
      teamId: input.team.id,
      place: input.place,
      userId: input.leader.id,
      amountKes: input.amountKes,
      milestoneRequired: true,
      announcedAt: input.announcedAt,
    },
    update: {},
  });
  await prisma.milestone.upsert({
    where: { winnerId: winner.id },
    create: {
      winnerId: winner.id,
      title: `Milestone handover: place ${input.place}`,
      description: "Deliver and confirm the handover to release the final 50%.",
      dueAt: new Date(input.announcedAt.getTime() + 30 * DAY),
    },
    update: {},
  });
  const instantKes = Math.ceil(input.amountKes * 0.5);
  const paidAt = new Date(input.announcedAt.getTime() + 45 * 60 * 1000);
  const instantRef = `seed-trf-${event.slug}-p${input.place}-instant`;
  await prisma.payout.upsert({
    where: { idempotencyKey: `${winner.id}:INSTANT` },
    create: {
      winnerId: winner.id,
      tranche: "INSTANT",
      amountKes: instantKes,
      idempotencyKey: `${winner.id}:INSTANT`,
      paystackTransferCode: `seed-tc-${event.slug}-p${input.place}-instant`,
      paystackReference: instantRef,
      recipientCode: `seed-rcp-${input.leader.handle}`,
      status: "SUCCEEDED",
      attemptCount: 1,
      paidAt,
    },
    update: {},
  });
  await prisma.ledgerEntry.upsert({
    where: { txHash: txHashFor(event.slug, `instant-p${input.place}`) },
    create: {
      eventId: event.id,
      type: "INSTANT_PAYOUT",
      payload: {
        winnerId: winner.id,
        winnerHandle: input.leader.handle,
        amountKes: instantKes,
        txRef: instantRef,
      },
      txHash: txHashFor(event.slug, `instant-p${input.place}`),
      blockNumber: 3 + input.place,
    },
    update: {},
  });
  return winner;
}

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

  const ORG_ABOUT =
    "Technetium Kenya runs community-first hackathons across Nairobi, Kisumu, and Mombasa. We partner with local hubs, universities, and employers so every build tackles a real Kenyan problem.\n\nEvery prize pool is escrowed before a hackathon goes live, winners are paid on the day, and every team leaves with feedback from the judges.";
  const orgDetails = {
    kind: "COMPANY",
    city: "Nairobi",
    country: "Kenya",
    website: "https://www.technetium.co.ke/",
  } as const;
  const org = await prisma.organization.upsert({
    where: { slug: "technetium-kenya" },
    create: {
      name: "Technetium Kenya",
      slug: "technetium-kenya",
      about: ORG_ABOUT,
      ...orgDetails,
      ownerId: organizer.id,
      kycStatus: "VERIFIED",
    },
    // Reseeding fills in the public details on an existing demo organization.
    update: orgDetails,
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
        headline: `${dev.name.split(" ")[0]}, full-stack developer, React & Node`,
        skills: ["react", "typescript", "node", "postgres"],
        location: "Nairobi, Kenya",
      },
      update: {},
    });
    developers.push(user);
  }
  const [wanjiku, kamau, zawadi, chirchir, mumbi] = developers;

  // Winners need a verified payout recipient before prizes can flow (the
  // announce gate, plan §6.1) — give the three seeded winners one.
  for (const winnerUser of [wanjiku, zawadi, mumbi]) {
    await prisma.developerProfile.update({
      where: { userId: winnerUser.id },
      data: {
        payoutRecipientCode: `seed-rcp-${winnerUser.handle}`,
        payoutMethod: "MPESA",
      },
    });
  }

  // ── Event 1: LIVE & Prize Verified (demo — escrow state simulated) ──
  const liveEvent = await prisma.event.upsert({
    where: { slug: "fintech-for-matatu-culture" },
    create: {
      orgId: org.id,
      isDemo: true,
      slug: "fintech-for-matatu-culture",
      title: "Fintech for Matatu Culture",
      summary: "Build the payments, savings, and crew tools that Nairobi's matatu economy runs on.",
      problemStatement:
        "Nairobi's matatu industry moves 3+ million riders daily, yet crews still run on cash boxes and riders have no digital proof of payment. Build open fintech rails for the matatu ecosystem: instant crew-to-rider payments, savings circles for vehicle owners, or data tools that respect crew realities (offline-first, low-end Android).",
      rules:
        "Teams of 2 to 5. Offline-first is a hard requirement: the demo must work without network. Winners retain their IP; organizers get a demo license.",
      venueType: "HYBRID",
      location: "iHub, Nairobi",
      startsAt: new Date(now + 2 * DAY),
      endsAt: new Date(now + 4 * DAY),
      registrationDeadline: new Date(now + 1 * DAY),
      maxTeams: 20,
      rolesWanted: ["frontend", "fintech", "mobile", "design"],
      categories: ["fintech", "mobility"],
      coverUrl: "/marketing/hackathons/fintech-hackathon-kenya.webp",
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
      isDemo: true,
      slug: "ai-for-health-records",
      title: "AI for Health Records",
      summary: "Privacy-first AI tooling that connects patient records across community clinics.",
      problemStatement:
        "Community clinics keep patient records in paper files that never talk to each other. Build privacy-first tooling that lets clinics exchange records with consent, such as AI triage assistants, referral pipelines, or audit tools for Data Protection Act compliance.",
      venueType: "PHYSICAL",
      location: "Kisumu Innovation Hub",
      startsAt: new Date(now + 20 * DAY),
      endsAt: new Date(now + 22 * DAY),
      registrationDeadline: new Date(now + 18 * DAY),
      maxTeams: 15,
      rolesWanted: ["ai", "backend", "design"],
      categories: ["ai", "health"],
      coverUrl: "/marketing/hackathons/ai-hackathon-kenya.webp",
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

  // ── Catalog fill: at least 3 hackathons behind every /hackathons filter ──
  // Verified upcoming (prizeVerifiedAt set), pending deposit (not set), and
  // past (ended). Dates are relative to seed time, like the events above.
  type CatalogEntry = {
    slug: string;
    title: string;
    summary: string;
    problemStatement: string;
    venueType: "PHYSICAL" | "ONLINE" | "HYBRID";
    location: string | null;
    startDay: number;
    lengthDays: number;
    status: "LIVE" | "IN_PROGRESS" | "PENDING_DEPOSIT" | "SETTLED";
    verified: boolean;
    rolesWanted: string[];
    categories: string[];
    coverUrl: string;
    prizes: [number, string, number][];
  };
  const catalog: CatalogEntry[] = [
    {
      slug: "climate-data-sprint",
      title: "Climate Data Sprint",
      summary: "Turn open weather and soil data into early warnings farmers can act on.",
      problemStatement:
        "Smallholder farmers lose whole seasons to drought and flash floods that open datasets saw coming. Build tools that turn satellite, weather, and soil data into timely, local alerts delivered over SMS or WhatsApp.",
      venueType: "HYBRID",
      location: "Nairobi Garage, Westlands",
      startDay: 9,
      lengthDays: 2,
      status: "LIVE",
      verified: true,
      rolesWanted: ["data", "backend", "mobile"],
      categories: ["climate", "agritech"],
      coverUrl: "/marketing/hackathons/climate-tech-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 200_000],
        [2, "2nd place", 100_000],
      ],
    },
    {
      slug: "coastal-agritech-build",
      title: "Coastal AgriTech Build",
      summary: "Cold chain, pricing, and market access tools for coastal fish and fruit traders.",
      problemStatement:
        "Traders along the coast lose a third of their stock before it reaches market. Build tools for cold chain tracking, fair price discovery, or buyer matching that work on low-end phones.",
      venueType: "PHYSICAL",
      location: "Swahilipot Hub, Mombasa",
      startDay: 16,
      lengthDays: 2,
      status: "LIVE",
      verified: true,
      rolesWanted: ["mobile", "design", "backend"],
      categories: ["agritech", "fintech"],
      coverUrl: "/marketing/hackathons/agritech-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 150_000],
        [2, "2nd place", 75_000],
        [3, "3rd place", 50_000],
      ],
    },
    {
      slug: "civic-tech-build-sprint",
      title: "Civic Tech Build Sprint",
      summary: "Tools that help Kenyans track public services, report issues, and follow up.",
      problemStatement:
        "Residents report broken water points, potholes, and missing services, then never hear back. Over three weeks, build tools that route reports to the right office, track them publicly, and close the loop with the people who raised them.",
      venueType: "ONLINE",
      location: null,
      startDay: -4,
      lengthDays: 21,
      status: "IN_PROGRESS",
      verified: true,
      rolesWanted: ["frontend", "backend", "civic"],
      categories: ["civic"],
      coverUrl: "/marketing/hackathons/civic-tech-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 150_000],
        [2, "2nd place", 75_000],
      ],
    },
    {
      slug: "clean-energy-hack",
      title: "Clean Energy Hack",
      summary: "Solar, metering, and pay as you go tools for off grid homes and small businesses.",
      problemStatement:
        "Millions of households rely on small solar kits with no easy way to track usage or pay in small amounts. Build metering dashboards, pay as you go billing, or maintenance tools for installers and the families they serve.",
      venueType: "PHYSICAL",
      location: "Dedan Kimathi University, Nyeri",
      startDay: -2,
      lengthDays: 14,
      status: "LIVE",
      verified: true,
      rolesWanted: ["hardware", "mobile", "fintech"],
      categories: ["climate"],
      coverUrl: "/marketing/hackathons/climate-tech-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 200_000],
        [2, "2nd place", 100_000],
      ],
    },
    {
      slug: "agri-supply-chain-challenge",
      title: "Agri Supply Chain Challenge",
      summary: "Traceability and payments from farm gate to market for Kenyan smallholders.",
      problemStatement:
        "Smallholder produce changes hands many times before it reaches a buyer, and farmers rarely see fair prices or prompt payment. Build traceability, grading, or instant payment tools that work at the farm gate.",
      venueType: "HYBRID",
      location: "Eldoret, Uasin Gishu",
      startDay: -6,
      lengthDays: 28,
      status: "LIVE",
      verified: true,
      rolesWanted: ["backend", "data", "mobile"],
      categories: ["agritech", "web3"],
      coverUrl: "/marketing/hackathons/agritech-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 250_000],
        [2, "2nd place", 120_000],
        [3, "3rd place", 60_000],
      ],
    },
    {
      slug: "edtech-for-rural-schools",
      title: "EdTech for Rural Schools",
      summary: "Offline learning tools for schools with one shared tablet and no reliable network.",
      problemStatement:
        "Many rural schools share a single device per class and see the internet once a week. Build lesson, assessment, or teacher support tools that sync when they can and work fully offline when they can't.",
      venueType: "ONLINE",
      location: null,
      startDay: 30,
      lengthDays: 3,
      status: "PENDING_DEPOSIT",
      verified: false,
      rolesWanted: ["frontend", "design", "education"],
      categories: ["edtech"],
      coverUrl: "/marketing/hackathons/edtech-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 80_000],
        [2, "2nd place", 40_000],
      ],
    },
    {
      slug: "creative-economy-hack",
      title: "Creative Economy Hack",
      summary: "Royalty, licensing, and payout tools for Kenyan musicians, artists, and creators.",
      problemStatement:
        "Kenyan creators rarely see royalties from radio, streaming, or brand use of their work. Build tools that track usage, split earnings between collaborators, or license work fairly.",
      venueType: "HYBRID",
      location: "The Mall, Westlands",
      startDay: 38,
      lengthDays: 2,
      status: "PENDING_DEPOSIT",
      verified: false,
      rolesWanted: ["fintech", "frontend", "design"],
      categories: ["web3", "fintech"],
      coverUrl: "/marketing/hackathons/web3-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 120_000],
        [2, "2nd place", 60_000],
      ],
    },
    {
      slug: "smart-transit-kisumu",
      title: "Smart Transit Kisumu",
      summary: "Route, fare, and safety tools for Kisumu's boda boda and tuk tuk riders.",
      problemStatement:
        "Kisumu's riders and passengers have no shared view of routes, fair fares, or safety. Build tools that help riders find trips, agree fares upfront, or report incidents quickly.",
      venueType: "PHYSICAL",
      location: "LakeHub, Kisumu",
      startDay: 45,
      lengthDays: 2,
      status: "PENDING_DEPOSIT",
      verified: false,
      rolesWanted: ["mobile", "maps", "backend"],
      categories: ["mobility", "civic"],
      coverUrl: "/marketing/hackathons/mobility-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 90_000],
        [2, "2nd place", 45_000],
      ],
    },
    {
      slug: "mobile-money-security-challenge",
      title: "Mobile Money Security Challenge",
      summary: "Catch SIM swap and social engineering fraud before the money moves.",
      problemStatement:
        "SIM swap and phone scams drain mobile money wallets every day. Teams built detection and user warning tools that flag risky transactions before they complete.",
      venueType: "HYBRID",
      location: "iHub, Nairobi",
      startDay: -62,
      lengthDays: 2,
      status: "SETTLED",
      verified: true,
      rolesWanted: ["security", "fintech", "data"],
      categories: ["security", "fintech"],
      coverUrl: "/marketing/hackathons/cybersecurity-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 300_000],
        [2, "2nd place", 150_000],
      ],
    },
    {
      slug: "open-data-nairobi-county",
      title: "Open Data Nairobi County",
      summary: "Budget, permit, and service data made readable for every Nairobi resident.",
      problemStatement:
        "County budgets and service records are public but unreadable. Teams built dashboards and chat tools that explain where money goes and how to follow up on services.",
      venueType: "ONLINE",
      location: null,
      startDay: -41,
      lengthDays: 3,
      status: "SETTLED",
      verified: true,
      rolesWanted: ["data", "frontend", "civic"],
      categories: ["civic"],
      coverUrl: "/marketing/hackathons/civic-tech-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 100_000],
        [2, "2nd place", 50_000],
      ],
    },
    {
      slug: "swahili-nlp-hackathon",
      title: "Swahili NLP Hackathon",
      summary: "Speech and text models that understand Swahili and Sheng as people speak them.",
      problemStatement:
        "Most language tools still stumble on Swahili and fail completely on Sheng. Teams built speech recognition, translation, and search tools trained on how Kenyans actually speak and write.",
      venueType: "HYBRID",
      location: "Strathmore University, Nairobi",
      startDay: -20,
      lengthDays: 2,
      status: "SETTLED",
      verified: true,
      rolesWanted: ["ai", "data", "backend"],
      categories: ["ai"],
      coverUrl: "/marketing/hackathons/ai-hackathon-kenya.webp",
      prizes: [
        [1, "1st place", 250_000],
        [2, "2nd place", 120_000],
        [3, "3rd place", 60_000],
      ],
    },
  ];
  for (const entry of catalog) {
    const startsAt = new Date(now + entry.startDay * DAY);
    const endsAt = new Date(startsAt.getTime() + entry.lengthDays * DAY);
    const event = await prisma.event.upsert({
      where: { slug: entry.slug },
      create: {
        orgId: org.id,
        isDemo: true,
        slug: entry.slug,
        title: entry.title,
        summary: entry.summary,
        problemStatement: entry.problemStatement,
        venueType: entry.venueType,
        location: entry.location,
        startsAt,
        endsAt,
        registrationDeadline: new Date(startsAt.getTime() - 2 * DAY),
        rolesWanted: entry.rolesWanted,
        categories: entry.categories,
        coverUrl: entry.coverUrl,
        status: entry.status,
        prizeVerifiedAt: entry.verified ? new Date(startsAt.getTime() - 10 * DAY) : null,
        publishedAt: new Date(startsAt.getTime() - 14 * DAY),
      },
      update: {},
    });
    for (const [place, label, amount] of entry.prizes) {
      await prisma.prizeBreakdown.upsert({
        where: { eventId_place: { eventId: event.id, place } },
        create: { eventId: event.id, place, label, amountKes: amount, milestoneRequired: true },
        update: { label, amountKes: amount },
      });
    }
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
  const RUBRIC_CRITERIA = [
    { id: "innovation", label: "Innovation", weight: 25 },
    { id: "execution", label: "Execution & completeness", weight: 25 },
    { id: "impact", label: "Impact on the problem", weight: 20 },
    { id: "presentation", label: "Presentation & demo", weight: 15 },
    { id: "quality", label: "Code quality & repo", weight: 15 },
  ];
  await prisma.rubric.upsert({
    where: { eventId: liveEvent.id },
    create: {
      eventId: liveEvent.id,
      criteria: RUBRIC_CRITERIA,
    },
    update: {},
  });

  // ── Escrow: every LIVE/IN_PROGRESS event has a LOCKED vault ──────────
  // The LIVE-requires-LOCKED invariant: deposit SUCCEEDED (gross = pool ×
  // 1.05), VaultState LOCKED (contractAddress null in simulation), and the
  // VAULT_CREATED + DEPOSIT_LOCKED ledger entries the attestation jobs write.
  const runningEvents = await prisma.event.findMany({
    where: {
      slug: {
        in: [
          "fintech-for-matatu-culture",
          "climate-data-sprint",
          "coastal-agritech-build",
          "civic-tech-build-sprint",
          "clean-energy-hack",
          "agri-supply-chain-challenge",
        ],
      },
      status: { in: ["LIVE", "IN_PROGRESS"] },
    },
    include: { prizes: true },
  });
  for (const event of runningEvents) {
    const poolKes = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
    await seedEscrow(event, poolKes, event.prizeVerifiedAt ?? event.publishedAt ?? new Date(now));
  }

  // ── A DRAFT event (the organizer's unpublished work in progress) ──────
  const draftEvent = await prisma.event.upsert({
    where: { slug: "sacco-digital-hack" },
    create: {
      orgId: org.id,
      isDemo: true,
      slug: "sacco-digital-hack",
      title: "Sacco Digital Hack",
      summary: "Member statements, loan tracking, and dividend tools for Kenya's SACCO movement.",
      problemStatement:
        "SACCOs hold savings for millions of Kenyans but many still run member records in spreadsheets. Build tools for member statements, loan tracking, or dividend calculations that a SACCO back office can actually run.",
      venueType: "PHYSICAL",
      location: "Nairobi",
      startsAt: new Date(now + 60 * DAY),
      endsAt: new Date(now + 62 * DAY),
      registrationDeadline: new Date(now + 58 * DAY),
      maxTeams: 15,
      rolesWanted: ["fintech", "backend"],
      categories: ["fintech"],
      status: "DRAFT",
    },
    update: {},
  });
  await prisma.prizeBreakdown.upsert({
    where: { eventId_place: { eventId: draftEvent.id, place: 1 } },
    create: {
      eventId: draftEvent.id,
      place: 1,
      label: "1st place",
      amountKes: 100_000,
      milestoneRequired: true,
    },
    update: { label: "1st place", amountKes: 100_000 },
  });

  // ── A JUDGING event: ended, judge mid-review, nothing finalized ───────
  const judgingEvent = await prisma.event.upsert({
    where: { slug: "shamba-data-hack" },
    create: {
      orgId: org.id,
      isDemo: true,
      slug: "shamba-data-hack",
      title: "Shamba Data Hack",
      summary: "Farm-gate data tools that turn county crop reports into decisions co-ops can act on.",
      problemStatement:
        "County governments collect crop and livestock data that never reaches the farmers it describes. Build tools that turn those reports into planting, grazing, or market decisions a co-op can act on, in English and Kiswahili.",
      rules: "Teams of 2 to 5. Winners retain their IP; organizers get a demo license.",
      venueType: "PHYSICAL",
      location: "Egerton University, Njoro",
      startsAt: new Date(now - 12 * DAY),
      endsAt: new Date(now - 10 * DAY),
      registrationDeadline: new Date(now - 14 * DAY),
      maxTeams: 12,
      rolesWanted: ["data", "mobile", "backend"],
      categories: ["agritech", "ai"],
      coverUrl: "/marketing/hackathons/agritech-hackathon-kenya.webp",
      status: "JUDGING",
      prizeVerifiedAt: new Date(now - 13 * DAY),
      mediaDeadlineAt: new Date(now - 8 * DAY),
      publishedAt: new Date(now - 16 * DAY),
    },
    update: {},
  });
  for (const [place, label, amount] of [
    [1, "1st place", 150_000],
    [2, "2nd place", 75_000],
  ] as const) {
    await prisma.prizeBreakdown.upsert({
      where: { eventId_place: { eventId: judgingEvent.id, place } },
      create: { eventId: judgingEvent.id, place, label, amountKes: amount, milestoneRequired: true },
      update: { label, amountKes: amount },
    });
  }
  await seedEscrow(judgingEvent, 225_000, new Date(now - 13 * DAY));

  const teamC = await seedTeam(judgingEvent.id, {
    inviteCode: "teamcodecc",
    name: "Mavuno Tech",
    leader: mumbi,
    members: [mumbi, chirchir],
    status: "LOCKED",
  });
  await prisma.submission.upsert({
    where: { teamId: teamC.id },
    create: {
      teamId: teamC.id,
      repoUrl: "https://github.com/mavuno-tech/shamba-reports",
      demoUrl: "https://shamba-reports.vercel.app",
      description:
        "Turns county crop PDFs into a weekly SMS advisory for co-op members: planting windows, expected prices, and pest alerts in Kiswahili.",
      splitDeclaration: [
        { userId: mumbi.id, percent: 60 },
        { userId: chirchir.id, percent: 40 },
      ],
    },
    update: {},
  });
  await prisma.judgeAssignment.upsert({
    where: { eventId_userId: { eventId: judgingEvent.id, userId: judge.id } },
    create: { eventId: judgingEvent.id, userId: judge.id, status: "ACTIVE" },
    update: {},
  });
  await prisma.rubric.upsert({
    where: { eventId: judgingEvent.id },
    create: { eventId: judgingEvent.id, criteria: RUBRIC_CRITERIA },
    update: {},
  });
  const judgingScores: [string, number][] = [
    ["innovation", 8],
    ["execution", 7],
    ["impact", 9],
    ["presentation", 8],
    ["quality", 6],
  ];
  for (const [criterionId, value] of judgingScores) {
    await prisma.score.upsert({
      where: {
        judgeId_teamId_criterionId: { judgeId: judge.id, teamId: teamC.id, criterionId },
      },
      create: { judgeId: judge.id, teamId: teamC.id, criterionId, value },
      update: { value },
    });
  }
  // Structured feedback (one per kind) but the review is NOT finalized —
  // the judging flow stays demonstrable end to end.
  await prisma.feedback.deleteMany({ where: { judgeId: judge.id, teamId: teamC.id } });
  await prisma.feedback.createMany({
    data: [
      {
        judgeId: judge.id,
        teamId: teamC.id,
        kind: "STRENGTH",
        point: "The SMS advisory worked end to end on a real feature phone during the demo — no shortcuts.",
      },
      {
        judgeId: judge.id,
        teamId: teamC.id,
        kind: "IMPROVEMENT",
        point: "PDF parsing fails silently on two county formats; surface the error instead of skipping rows.",
      },
      {
        judgeId: judge.id,
        teamId: teamC.id,
        kind: "NEXT_STEP",
        point: "Pilot with one co-op in Njoro and instrument weekly active farmers before scaling.",
      },
    ],
  });
  await prisma.judgingProgress.upsert({
    where: { judgeId_teamId: { judgeId: judge.id, teamId: teamC.id } },
    create: { judgeId: judge.id, teamId: teamC.id, finalizedAt: null },
    update: {},
  });
  // ── A WINNERS_ANNOUNCED event: instant tranche paid, milestone flow ───
  const announcedEvent = await prisma.event.upsert({
    where: { slug: "blue-economy-hack" },
    create: {
      orgId: org.id,
      isDemo: true,
      slug: "blue-economy-hack",
      title: "Blue Economy Hack",
      summary: "Cold chain, catch reporting, and market tools for Lake Victoria's fishing communities.",
      problemStatement:
        "Lake Victoria's fishers lose income to spoilage and middlemen because catch data never leaves the beach. Build tools for catch logging, cold chain tracking, or direct market access that work where the network is weakest.",
      rules: "Teams of 2 to 5. Winners retain their IP; organizers get a demo license.",
      venueType: "HYBRID",
      location: "LakeHub, Kisumu",
      startsAt: new Date(now - 8 * DAY),
      endsAt: new Date(now - 6 * DAY),
      registrationDeadline: new Date(now - 10 * DAY),
      maxTeams: 16,
      rolesWanted: ["mobile", "data", "design"],
      categories: ["climate", "civic"],
      coverUrl: "/marketing/hackathons/climate-tech-hackathon-kenya.webp",
      status: "WINNERS_ANNOUNCED",
      prizeVerifiedAt: new Date(now - 9 * DAY),
      mediaDeadlineAt: new Date(now - 4 * DAY),
      publishedAt: new Date(now - 12 * DAY),
    },
    update: {},
  });
  for (const [place, label, amount] of [
    [1, "1st place", 200_000],
    [2, "2nd place", 100_000],
    [3, "3rd place", 50_000],
  ] as const) {
    await prisma.prizeBreakdown.upsert({
      where: { eventId_place: { eventId: announcedEvent.id, place } },
      create: { eventId: announcedEvent.id, place, label, amountKes: amount, milestoneRequired: true },
      update: { label, amountKes: amount },
    });
  }
  await seedEscrow(announcedEvent, 350_000, new Date(now - 9 * DAY));

  const teamD = await seedTeam(announcedEvent.id, {
    inviteCode: "teamcodedd",
    name: "Samaki Flow",
    leader: wanjiku,
    members: [wanjiku, kamau],
    status: "LOCKED",
  });
  const teamE = await seedTeam(announcedEvent.id, {
    inviteCode: "teamcodeee",
    name: "Pier Nine",
    leader: zawadi,
    members: [zawadi, chirchir],
    status: "LOCKED",
  });
  const teamF = await seedTeam(announcedEvent.id, {
    inviteCode: "teamcodeff",
    name: "Nuance Labs",
    leader: mumbi,
    members: [mumbi],
    status: "LOCKED",
  });
  const announcedAt = new Date(now - 5 * DAY);
  for (const [team, leader, place, repo] of [
    [teamD, wanjiku, 1, "https://github.com/samaki-flow/beach-ledger"],
    [teamE, zawadi, 2, "https://github.com/pier-nine/cold-chain"],
    [teamF, mumbi, 3, "https://github.com/nuance-labs/soko-fresh"],
  ] as const) {
    const submission = await prisma.submission.upsert({
      where: { teamId: team.id },
      create: {
        teamId: team.id,
        repoUrl: repo,
        demoUrl: `${repo.replace("https://github.com/", "https://").replace("/", "-")}.vercel.app`,
        description: `Blue Economy Hack submission by ${team.name}: catch logging and cold chain tooling for Lake Victoria landing beaches.`,
        splitDeclaration: [{ userId: leader.id, percent: 100 }],
      },
      update: {},
    });
    const winner = await seedWinner(announcedEvent, {
      team,
      leader,
      place,
      amountKes: place === 1 ? 200_000 : place === 2 ? 100_000 : 50_000,
      announcedAt,
    });
    // The announcement also materializes each winner's portfolio item.
    await prisma.portfolioItem.upsert({
      where: { submissionId: submission.id },
      create: {
        submissionId: submission.id,
        developerId: leader.id,
        title: `${team.name}: winning submission`,
        summary: submission.description,
        repoUrl: submission.repoUrl,
        demoUrl: submission.demoUrl,
        lifecycle: "DEMO",
      },
      update: {},
    });
    // 1st place: milestone confirmed by the organizer → MILESTONE payout
    // QUEUED, waiting on the payout worker (the milestone flow in action).
    if (place === 1) {
      const confirmedAt = new Date(now - 2 * DAY);
      await prisma.milestone.update({
        where: { winnerId: winner.id },
        data: { confirmedBy: organizer.id, confirmedAt },
      });
      await prisma.payout.upsert({
        where: { idempotencyKey: `${winner.id}:MILESTONE` },
        create: {
          winnerId: winner.id,
          tranche: "MILESTONE",
          amountKes: 100_000,
          idempotencyKey: `${winner.id}:MILESTONE`,
          recipientCode: `seed-rcp-${leader.handle}`,
          status: "QUEUED",
          queuedAt: confirmedAt,
        },
        // Reseeding restores the demo state: the test suite's stuck-payout
        // sweep drives any stale QUEUED payout on the shared dev database.
        update: {
          status: "QUEUED",
          attemptCount: 0,
          paidAt: null,
          paystackReference: null,
          paystackTransferCode: null,
          lastError: null,
          queuedAt: confirmedAt,
        },
      });
    }
    // 2nd place: milestone still unconfirmed and the winner opened a
    // dispute — the admin arbitration queue has something to show.
    if (place === 2) {
      await prisma.dispute.upsert({
        where: { winnerId: winner.id },
        create: {
          winnerId: winner.id,
          openedBy: leader.id,
          claim:
            "We delivered the milestone handover (cold chain pilot at Dunga beach) over a week ago, but the organizer has not confirmed it and the final 50% is still locked.",
          status: "OPEN",
        },
        update: {},
      });
    }
  }
  // Instant tranches are all paid → the vault is HALF_RELEASED.
  await prisma.vaultState.update({
    where: { eventId: announcedEvent.id },
    data: {
      chainState: "HALF_RELEASED",
      halfReleasedAt: new Date(announcedAt.getTime() + 60 * 60 * 1000),
      lastTxHash: txHashFor(announcedEvent.slug, "instant-p3"),
    },
  });

  // ── One SETTLED event upgraded to the full graph ──────────────────────
  const settledEvent = await prisma.event.findUniqueOrThrow({
    where: { slug: "swahili-nlp-hackathon" },
  });
  await prisma.event.update({
    where: { id: settledEvent.id },
    data: { mediaDeadlineAt: new Date(settledEvent.endsAt.getTime() + 2 * DAY) },
  });
  await seedEscrow(settledEvent, 430_000, new Date(now - 31 * DAY));

  const teamG = await seedTeam(settledEvent.id, {
    inviteCode: "teamcodegg",
    name: "Luga Labs",
    leader: wanjiku,
    members: [wanjiku, kamau],
    status: "LOCKED",
  });
  const teamH = await seedTeam(settledEvent.id, {
    inviteCode: "teamcodehh",
    name: "Sauti Systems",
    leader: zawadi,
    members: [zawadi, chirchir],
    status: "LOCKED",
  });
  const teamI = await seedTeam(settledEvent.id, {
    inviteCode: "teamcodeii",
    name: "Nlp Juniors",
    leader: mumbi,
    members: [mumbi],
    status: "LOCKED",
  });
  const settledAnnouncedAt = new Date(now - 15 * DAY);
  const milestonePaidAt = new Date(now - 12 * DAY);
  for (const [team, leader, place, repo, lifecycle] of [
    [teamG, wanjiku, 1, "https://github.com/luga-labs/swh-asr", "IN_PRODUCTION"],
    [teamH, zawadi, 2, "https://github.com/sauti-systems/sheng-translate", "DEMO"],
    [teamI, mumbi, 3, "https://github.com/nlp-juniors/swh-search", "DEMO"],
  ] as const) {
    const submission = await prisma.submission.upsert({
      where: { teamId: team.id },
      create: {
        teamId: team.id,
        repoUrl: repo,
        demoUrl: `${repo.replace("https://github.com/", "https://").replace("/", "-")}.vercel.app`,
        description: `Swahili NLP Hackathon submission by ${team.name}: speech and text models for Swahili and Sheng as people actually speak them.`,
        splitDeclaration: [{ userId: leader.id, percent: 100 }],
      },
      update: {},
    });
    const amountKes = place === 1 ? 250_000 : place === 2 ? 120_000 : 60_000;
    const winner = await seedWinner(settledEvent, {
      team,
      leader,
      place,
      amountKes,
      announcedAt: settledAnnouncedAt,
    });
    // Both tranches SUCCEEDED: milestone confirmed, then paid.
    const confirmedAt = new Date(now - 13 * DAY);
    await prisma.milestone.update({
      where: { winnerId: winner.id },
      data: { confirmedBy: organizer.id, confirmedAt },
    });
    const milestoneKes = amountKes - Math.ceil(amountKes * 0.5);
    const milestoneRef = `seed-trf-${settledEvent.slug}-p${place}-milestone`;
    await prisma.payout.upsert({
      where: { idempotencyKey: `${winner.id}:MILESTONE` },
      create: {
        winnerId: winner.id,
        tranche: "MILESTONE",
        amountKes: milestoneKes,
        idempotencyKey: `${winner.id}:MILESTONE`,
        paystackTransferCode: `seed-tc-${settledEvent.slug}-p${place}-milestone`,
        paystackReference: milestoneRef,
        recipientCode: `seed-rcp-${leader.handle}`,
        status: "SUCCEEDED",
        attemptCount: 1,
        paidAt: milestonePaidAt,
      },
      update: {},
    });
    await prisma.ledgerEntry.upsert({
      where: { txHash: txHashFor(settledEvent.slug, `milestone-p${place}`) },
      create: {
        eventId: settledEvent.id,
        type: "MILESTONE_PAYOUT",
        payload: {
          winnerId: winner.id,
          winnerHandle: leader.handle,
          amountKes: milestoneKes,
          txRef: milestoneRef,
        },
        txHash: txHashFor(settledEvent.slug, `milestone-p${place}`),
        blockNumber: 7 + place,
      },
      update: {},
    });
    await prisma.portfolioItem.upsert({
      where: { submissionId: submission.id },
      create: {
        submissionId: submission.id,
        developerId: leader.id,
        title: `${team.name}: winning submission`,
        summary: submission.description,
        repoUrl: submission.repoUrl,
        demoUrl: submission.demoUrl,
        lifecycle,
      },
      update: {},
    });
    // The 3-month legacy check-in on the 1st place build is due today —
    // the dashboard check-in card has exactly one item to show.
    if (place === 1) {
      await prisma.legacyCheckin.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          dueAt: new Date(now),
        },
        update: { dueAt: new Date(now) },
      });
    }
  }
  await prisma.vaultState.update({
    where: { eventId: settledEvent.id },
    data: {
      chainState: "SETTLED",
      halfReleasedAt: new Date(settledAnnouncedAt.getTime() + 60 * 60 * 1000),
      settledAt: milestonePaidAt,
      lastTxHash: txHashFor(settledEvent.slug, "milestone-p3"),
    },
  });
  await prisma.endorsement.upsert({
    where: {
      judgeId_developerId_eventId: {
        judgeId: judge.id,
        developerId: wanjiku.id,
        eventId: settledEvent.id,
      },
    },
    create: {
      judgeId: judge.id,
      developerId: wanjiku.id,
      eventId: settledEvent.id,
      quote:
        "Wanjiku's Swahili speech pipeline was the most complete NLP work we have judged on this platform — production-grade evaluation, documentation, and a demo that held up live.",
    },
    update: {},
  });
  // An approved media item from the settled event's finals.
  await prisma.mediaAsset.upsert({
    where: { r2Key: "seed/swahili-nlp-hackathon/finals-demo.webp" },
    create: {
      eventId: settledEvent.id,
      r2Key: "seed/swahili-nlp-hackathon/finals-demo.webp",
      url: "/marketing/hackathons/ai-hackathon-kenya.webp",
      kind: "PHOTO",
      caption: "Luga Labs demoing their Swahili ASR pipeline at finals.",
      uploadedBy: wanjiku.id,
      status: "APPROVED",
      uploadedAt: new Date(now - 19 * DAY),
    },
    update: {},
  });
  // One still pending review — the media review queue stays demonstrable.
  await prisma.mediaAsset.upsert({
    where: { r2Key: "seed/blue-economy-hack/team-samaki-flow.webp" },
    create: {
      eventId: announcedEvent.id,
      r2Key: "seed/blue-economy-hack/team-samaki-flow.webp",
      url: "/marketing/hackathons/climate-tech-hackathon-kenya.webp",
      kind: "PHOTO",
      caption: "Samaki Flow testing the catch-logging app at Dunga beach.",
      uploadedBy: wanjiku.id,
      status: "PENDING",
      uploadedAt: new Date(now - 5 * DAY),
    },
    update: {},
  });

  // ── Admin + hiring partner accounts ────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@hackvillage.dev" },
    create: {
      email: "admin@hackvillage.dev",
      name: "Brian Otieno",
      handle: "brian-admin",
      passwordHash: await hash("demopass123"),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(now - 60 * DAY),
    },
    update: {},
  });
  await prisma.roleGrant.upsert({
    where: { userId_role: { userId: admin.id, role: "ADMIN" } },
    create: { userId: admin.id, role: "ADMIN" },
    update: {},
  });

  const hiring = await prisma.user.upsert({
    where: { email: "hiring@hackvillage.dev" },
    create: {
      email: "hiring@hackvillage.dev",
      name: "Laura Njoki",
      handle: "laura-hiring",
      passwordHash: await hash("demopass123"),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(now - 15 * DAY),
    },
    update: {},
  });
  await prisma.roleGrant.upsert({
    where: { userId_role: { userId: hiring.id, role: "HIRING" } },
    create: { userId: hiring.id, role: "HIRING" },
    update: {},
  });
  // A hiring partner requesting an intro to a verified winner (Phase 6).
  await prisma.introduction.upsert({
    where: {
      hiringPartnerId_developerId_eventId: {
        hiringPartnerId: hiring.id,
        developerId: wanjiku.id,
        eventId: settledEvent.id,
      },
    },
    create: {
      hiringPartnerId: hiring.id,
      developerId: wanjiku.id,
      eventId: settledEvent.id,
      message:
        "Hi Wanjiku — we're hiring NLP engineers for our Kiswahili voice products team and your Swahili NLP Hackathon win stood out. Open to a 20-minute intro call?",
      status: "REQUESTED",
    },
    update: {},
  });

  // ── Newsletter + trust ─────────────────────────────────────────────────
  await prisma.newsletterSubscriber.upsert({
    where: { email: "demo-subscriber@hackvillage.dev" },
    create: { email: "demo-subscriber@hackvillage.dev", source: "landing-cta" },
    update: {},
  });
  // Payout excellence on the settled event bumped the org's trust score.
  const trustReason =
    "Every instant payout on Swahili NLP Hackathon cleared within an hour of the winners announcement.";
  const existingTrust = await prisma.trustEvent.findFirst({
    where: { orgId: org.id, type: "PAYOUT_EXCELLENCE", reason: trustReason },
  });
  if (!existingTrust) {
    await prisma.trustEvent.create({
      data: {
        orgId: org.id,
        type: "PAYOUT_EXCELLENCE",
        delta: 10,
        reason: trustReason,
        actorId: admin.id,
      },
    });
  }
  // trustScore = 100 + Σ TrustEvents (floor 0) — kept in sync by the seed.
  const trustEvents = await prisma.trustEvent.findMany({
    where: { orgId: org.id },
    select: { delta: true },
  });
  const trustScore = Math.max(
    0,
    100 + trustEvents.reduce((sum, trustEvent) => sum + trustEvent.delta, 0)
  );
  await prisma.organization.update({ where: { id: org.id }, data: { trustScore } });

  console.log(
    "Seeded: Technetium Kenya org, 1 organizer, 5 developers, 1 judge, 1 admin, 1 hiring partner."
  );
  console.log(
    "Events: 16 — 1 draft, 4 pending deposit, 5 live, 1 in progress, 1 judging, 1 winners announced, 3 settled."
  );
  console.log(
    "Escrow: 9 vaults + succeeded deposits + ledger locks; winners/payouts/milestones on blue-economy-hack (half released) and swahili-nlp-hackathon (settled)."
  );
  console.log(
    "Extras: 9 teams, 8 submissions, 6 winners, 10 payouts, 1 dispute, 1 introduction, 6 portfolio items, 1 endorsement, 1 legacy check-in due today, 2 media assets, 1 trust event, 1 newsletter subscriber."
  );
  console.log(
    "Demo login: organizer@hackvillage.dev / admin@hackvillage.dev / hiring@hackvillage.dev / wanjiku@hackvillage.dev / judge@hackvillage.dev … password: demopass123"
  );
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
