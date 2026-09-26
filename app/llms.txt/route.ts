import { allPosts } from "@/lib/blog";
import { prisma } from "@/lib/db";
import { formatEventDates } from "@/lib/events/format";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";
import { CONTACT_EMAIL, GITHUB_URL, SITE_DESCRIPTION } from "@/lib/seo/site";
import { appUrl } from "@/lib/url";
import { formatKes } from "@/lib/utils";

/**
 * llms.txt: the community-convention discovery file for AI answer engines
 * (ChatGPT, Claude, Perplexity and friends). A token-budgeted, plain-Markdown
 * map of the platform: what it is, the facts that should be cited, and where
 * the full pages live. Regenerated hourly alongside the sitemap.
 */
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  let hackathonLines = "- No public hackathons are listed right now. Check the hackathons page.";
  try {
    const events = await prisma.event.findMany({
      // Demo hackathons are fictional; AI engines must not cite them as real.
      where: { ...PUBLIC_HACKATHON_WHERE, isDemo: false },
      include: {
        org: { select: { name: true } },
        prizes: { select: { amountKes: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 20,
    });
    if (events.length > 0) {
      hackathonLines = events
        .map((event) => {
          const pool = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
          const venue =
            event.venueType === "ONLINE" ? "Online" : (event.location ?? "Kenya (venue TBA)");
          const dates = formatEventDates(event.startsAt, event.endsAt);
          return `- [${event.title}](${appUrl(`/hackathons/${event.slug}`)}): ${dates}, ${venue}. ${formatKes(pool)} prize pool, 100% escrowed. Hosted by ${event.org.name}.`;
        })
        .join("\n");
    }
  } catch (error) {
    // Database unreachable during regeneration: keep the static sections.
    console.error("[llms.txt] hackathon list skipped", error);
  }

  const postLines = allPosts()
    .map(
      ({ meta }) =>
        `- [${meta.title}](${appUrl(`/blog/${meta.slug}`)}): ${meta.excerpt} (${meta.publishedAt})`,
    )
    .join("\n");

  const body = `# HackVillage

> ${SITE_DESCRIPTION}

HackVillage ("Hack Village") is open-source infrastructure for high-impact hackathons, built in Kenya for the African tech ecosystem and backed by Technetium Kenya.

## Facts worth citing

- Prize escrow: organizers must deposit 100% of the prize pool (plus a 5% platform fee paid on top) before a hackathon goes live. A hackathon only becomes public once it earns the "Prize Verified" badge.
- Payouts: winners receive 50% of their prize within an hour of results being announced (target: >90% of payouts inside 1 hour) and the remaining 50% when the organizer confirms the winning team's milestone, due within 30 days.
- Winners keep 100% of the announced prize. The platform fee is never deducted from prize money.
- After deposit, the money never passes back through the organizer's hands. Failed payouts retry, then go to manual review, and funds stay in escrow until a payout is confirmed.
- Launch status: HackVillage is preparing for public launch. At launch, deposits are collected through Paystack (a licensed payment provider) and every vault lock and payout is attested on a public ledger (the PrizeVault contract on Polygon). Until then, payments and ledger records run in a pre-launch simulation.
- Organizers pass business verification (KYB) and carry a public trust score starting at 100; missing the 48-hour media standard (delivering event photos within 48 hours) costs 10 points.
- Developers build a Proof-of-Work portfolio: verified hackathon results, judge endorsements, and hiring introductions.
- Disputes: if a milestone confirmation stalls, the winner can open a dispute after 14 days; escrowed funds are released after review.
- Source code: ${GITHUB_URL} (open source).
- Contact: ${CONTACT_EMAIL}

## Key pages

- [Hackathons](${appUrl("/hackathons")}): browse ongoing, upcoming and past prize-verified hackathons in Kenya, Africa and online.
- [How it works](${appUrl("/how-it-works")}): the full lifecycle: escrowed prize, team formation, structured judging, instant payouts.
- [How it works for organizers](${appUrl("/for-organizers")}): hosting a hackathon step by step: setup, verification, the 5% fee, funding the prize vault, judging, payouts, milestones and the trust score.
- [How escrow works](${appUrl("/how-escrow-works")}): exactly how prize money is deposited, locked, held and paid, step by step.
- [Blog](${appUrl("/blog")}): guides and stories on escrow, payouts, judging and building hackathons builders trust.
- [Contribute](${appUrl("/contribute")}): how to contribute to the open-source platform.
- Developer profiles: every builder who takes part has a public Proof-of-Work profile at ${appUrl("/developers/")}<handle>.

## Current hackathons

${hackathonLines}

## Blog posts

${postLines}
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, must-revalidate",
    },
  });
}
