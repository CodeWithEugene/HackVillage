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
    status: "LIVE" | "PENDING_DEPOSIT" | "SETTLED";
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
      status: "LIVE",
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

  console.log("Seeded: Technetium Kenya org, 1 organizer, 5 developers, 1 judge, 13 hackathons, 2 teams, 1 submission.");
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
